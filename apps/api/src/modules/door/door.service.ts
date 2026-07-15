import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import {
  DoorStateMachine,
  IllegalDoorTransitionError,
  DEFAULT_ALERT_CONFIG,
  type DoorAlertConfig,
} from "./door-state-machine";
import type { DoorStatePayload } from "../../mqtt/mqtt.types";
import type { DoorState, DoorAlertJob } from "@repo/shared";
import { DOOR_STATES } from "@repo/shared";

/**
 * D-06: 500ms settling timeout before alerts.
 * D-05: Sequence number validation on MQTT messages.
 */
const SETTLING_TIMEOUT_MS = 500;

@Injectable()
export class DoorService {
  private readonly logger = new Logger(DoorService.name);

  /** Per-door state machine instances (D-04) */
  private machines = new Map<string, DoorStateMachine>();

  /** Per-door settling timers (D-06) */
  private settlingTimers = new Map<string, NodeJS.Timeout>();

  /** Per-door sequence tracking (D-05) */
  private lastSequence = new Map<string, number>();

  /** Per-door state change timestamps for held-open timing */
  private stateChangeTimes = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    @Inject("REDIS") private redis: Redis,
    @InjectQueue("door-alerts") private alertQueue: Queue,
  ) {}

  // ── MQTT Event Handler (from MqttService) ──

  @OnEvent("mqtt.door.state", { async: true })
  async handleDoorStateEvent(payload: {
    topic: string;
    message: DoorStatePayload;
  }) {
    const { topic, message } = payload;

    try {
      // 1. Parse orgId, doorId from topic: site/{orgId}/door/{doorId}/state
      const topicParts = topic.split("/");
      // Expected: ["site", "{orgId}", "door", "{doorId}", "state"]
      if (topicParts.length < 5) {
        this.logger.warn(`Invalid door state topic format: ${topic}`);
        return;
      }

      const orgId = topicParts[1];
      const doorId = topicParts[3];

      // 2. D-05: Validate sequence
      const lastSeq = this.lastSequence.get(doorId) ?? -1;
      if (message.sequence <= lastSeq) {
        this.logger.warn(
          `Out-of-sequence door message discarded: door=${doorId}, seq=${message.sequence}, last=${lastSeq}`,
        );
        return;
      }
      this.lastSequence.set(doorId, message.sequence);

      // 3. Look up door config from Prisma
      const door = await this.prisma.door.findUnique({
        where: { id: doorId },
        include: {
          zone: { select: { id: true, name: true } },
        },
      });

      if (!door) {
        this.logger.warn(`Unknown door in MQTT message: ${doorId}`);
        return;
      }

      // 4. Get or create DoorStateMachine for this door
      const machine = this.getOrCreateMachine(doorId, door.alertConfig as any);

      // 5. Get current state from Redis, default to LOCKED
      const rawState = message.state.toLowerCase();
      const stateKey = `door:state:${doorId}`;
      const currentState =
        ((await this.redis.get(stateKey)) as DoorState | null) ??
        DOOR_STATES.LOCKED;

      // Normalize state string to DoorState enum value
      const proposedState = this.normalizeState(rawState);
      if (!proposedState) {
        this.logger.warn(
          `Unknown door state received: "${rawState}" for door ${doorId}`,
        );
        return;
      }

      // 6. Validate transition
      let newState: DoorState;
      try {
        newState = machine.validateTransition(currentState, proposedState);
      } catch (err) {
        if (err instanceof IllegalDoorTransitionError) {
          this.logger.warn(
            `Illegal transition discarded: ${err.message}`,
          );
          return;
        }
        throw err;
      }

      // No-op if state unchanged
      if (newState === currentState) return;

      const now = Date.now();
      const transitionTimestamp = new Date();

      // 7a. Persist to TimescaleDB door_state_log via $queryRaw
      await this.persistDoorStateLog(
        doorId,
        orgId,
        newState,
        currentState,
        message.sequence,
        transitionTimestamp,
      );

      // 7b. Update Redis current state
      await this.redis.set(stateKey, newState);
      this.stateChangeTimes.set(doorId, now);

      // 7c. Emit state change event
      this.eventEmitter.emit("door.state-changed", {
        doorId,
        orgId,
        zoneId: door.zoneId,
        previousState: currentState,
        newState,
        timestamp: transitionTimestamp,
      });

      // 7d. D-06: Settling timeout for alerts
      if (machine.shouldGenerateAlert(newState)) {
        this.scheduleAlertEvaluation(
          doorId,
          orgId,
          newState,
          machine,
          transitionTimestamp,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Error handling door state event: ${err.message}`,
        err.stack,
      );
    }
  }

  // ── Alert Evaluation ──

  /**
   * D-06: Schedule alert evaluation after settling timeout.
   * Cancels any pending timer for this door first.
   */
  private scheduleAlertEvaluation(
    doorId: string,
    orgId: string,
    state: DoorState,
    machine: DoorStateMachine,
    timestamp: Date,
  ) {
    // Clear any existing settling timer
    const existing = this.settlingTimers.get(doorId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.settlingTimers.delete(doorId);

      try {
        // Re-read current state from Redis (may have changed during settling)
        const stateKey = `door:state:${doorId}`;
        const currentState =
          ((await this.redis.get(stateKey)) as DoorState | null) ?? state;

        // Only alert if still in the trigger state
        if (currentState !== state) {
          this.logger.debug(
            `Door ${doorId} state changed during settling period (${state} → ${currentState}), no alert`,
          );
          return;
        }

        // Calculate time in state for held-open threshold
        const changeTime = this.stateChangeTimes.get(doorId) ?? Date.now();
        const timeInStateMs = Date.now() - changeTime;

        // Evaluate alert config
        const alertEval = machine.getAlertConfig(state, timeInStateMs);

        if (alertEval.shouldAlert) {
          const job: DoorAlertJob = {
            doorId,
            organizationId: orgId,
            state,
            reason: alertEval.reason ?? `Door ${state}`,
            timestamp: timestamp.toISOString(),
          };

          await this.alertQueue.add("evaluate-door-alert", job, {
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
          });
        }
      } catch (err: any) {
        this.logger.error(
          `Alert evaluation failed for door ${doorId}: ${err.message}`,
        );
      }
    }, SETTLING_TIMEOUT_MS);

    this.settlingTimers.set(doorId, timer);
  }

  // ── Emergency Override Methods (ACC-06, D-11) ──

  async lockdownZone(
    zoneId: string,
    orgId: string,
    triggeredBy: string,
    reason?: string,
  ): Promise<void> {
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
      select: { id: true, name: true },
    });
    if (!zone) throw new NotFoundException("Zone not found");

    await this.redis.set(`zone:emergency:${zoneId}`, "lockdown");

    this.eventEmitter.emit("zone.emergency", {
      zoneId,
      orgId,
      status: "lockdown",
      triggeredBy,
      reason: reason ?? "Manual lockdown triggered",
      timestamp: new Date(),
    });

    this.logger.log(
      `Zone ${zoneId} locked down by ${triggeredBy}${reason ? `: ${reason}` : ""}`,
    );
  }

  async emergencyUnlockZone(
    zoneId: string,
    orgId: string,
    triggeredBy: string,
    reason?: string,
  ): Promise<void> {
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
      select: { id: true, name: true },
    });
    if (!zone) throw new NotFoundException("Zone not found");

    await this.redis.set(`zone:emergency:${zoneId}`, "emergency-unlock");

    this.eventEmitter.emit("zone.emergency", {
      zoneId,
      orgId,
      status: "emergency-unlock",
      triggeredBy,
      reason: reason ?? "Manual emergency unlock",
      timestamp: new Date(),
    });

    this.logger.log(
      `Zone ${zoneId} emergency unlocked by ${triggeredBy}${reason ? `: ${reason}` : ""}`,
    );
  }

  async clearEmergencyOverride(
    zoneId: string,
    orgId: string,
    triggeredBy: string,
  ): Promise<void> {
    const zone = await this.prisma.zone.findUnique({
      where: { id: zoneId },
      select: { id: true, name: true },
    });
    if (!zone) throw new NotFoundException("Zone not found");

    await this.redis.del(`zone:emergency:${zoneId}`);

    this.eventEmitter.emit("zone.emergency", {
      zoneId,
      orgId,
      status: "cleared",
      triggeredBy,
      timestamp: new Date(),
    });

    this.logger.log(
      `Zone ${zoneId} emergency override cleared by ${triggeredBy}`,
    );
  }

  // ── Current State Methods (DOOR-06) ──

  async getAllDoorStates(orgId: string): Promise<
    Array<{
      doorId: string;
      name: string;
      zoneId: string;
      zoneName?: string;
      state: DoorState;
      lastChanged: string;
      controllerId?: string;
    }>
  > {
    const doors = await this.prisma.door.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        zone: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
    });

    // Multi-get current states from Redis
    const stateKeys = doors.map((d) => `door:state:${d.id}`);
    let states: (string | null)[] = [];
    if (stateKeys.length > 0) {
      states = await this.redis.mget(...stateKeys);
    }

    return doors.map((door, i) => ({
      doorId: door.id,
      name: door.name,
      zoneId: door.zoneId,
      zoneName: door.zone?.name,
      state: (states[i] as DoorState) ?? DOOR_STATES.LOCKED,
      lastChanged: door.updatedAt.toISOString(),
      controllerId: door.controllerId ?? undefined,
    }));
  }

  async getDoorState(doorId: string): Promise<{
    doorId: string;
    name: string;
    zoneId: string;
    zoneName?: string;
    state: DoorState;
    lastChanged: string;
    controllerId?: string;
  }> {
    const door = await this.prisma.door.findUnique({
      where: { id: doorId },
      include: {
        zone: { select: { id: true, name: true } },
      },
    });
    if (!door) throw new NotFoundException("Door not found");

    const state =
      ((await this.redis.get(`door:state:${doorId}`)) as DoorState | null) ??
      DOOR_STATES.LOCKED;

    return {
      doorId: door.id,
      name: door.name,
      zoneId: door.zoneId,
      zoneName: door.zone?.name,
      state,
      lastChanged: door.updatedAt.toISOString(),
      controllerId: door.controllerId ?? undefined,
    };
  }

  async getDoorStateHistory(
    doorId: string,
    from: string,
    to: string,
  ): Promise<Array<{ time: string; state: string }>> {
    const door = await this.prisma.door.findUnique({
      where: { id: doorId },
    });
    if (!door) throw new NotFoundException("Door not found");

    try {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ time: Date; state: string }>
      >(
        `SELECT time, state FROM door_state_log WHERE door_id = $1::uuid AND time >= $2::timestamptz AND time <= $3::timestamptz ORDER BY time ASC`,
        doorId,
        new Date(from),
        new Date(to),
      );

      return rows.map((r) => ({
        time: r.time.toISOString(),
        state: r.state,
      }));
    } catch (err: any) {
      this.logger.warn(`door_state_log query failed: ${err.message}`);
      return [];
    }
  }

  // ── Alert Config (D-07) ──

  async updateAlertConfig(
    doorId: string,
    config: { heldOpenThresholdMs?: number },
  ): Promise<void> {
    const door = await this.prisma.door.findUnique({
      where: { id: doorId },
    });
    if (!door) throw new NotFoundException("Door not found");

    const newThreshold = config.heldOpenThresholdMs;
    if (newThreshold !== undefined) {
      if (newThreshold < 30000 || newThreshold > 300000) {
        throw new BadRequestException(
          "heldOpenThresholdMs must be between 30000 and 300000 (30s to 5min)",
        );
      }
    }

    const currentConfig = (door.alertConfig as Record<string, any>) ?? {};
    const updatedConfig = {
      ...DEFAULT_ALERT_CONFIG,
      ...currentConfig,
      ...(newThreshold !== undefined && { heldOpenThresholdMs: newThreshold }),
    };

    await this.prisma.door.update({
      where: { id: doorId },
      data: { alertConfig: updatedConfig as any },
    });

    // Update the in-memory machine
    const machine = this.machines.get(doorId);
    if (machine) {
      machine.config.heldOpenThresholdMs = updatedConfig.heldOpenThresholdMs;
    }
  }

  async updateDoor(
    doorId: string,
    data: { name?: string; zoneId?: string; controllerId?: string },
  ): Promise<void> {
    const door = await this.prisma.door.findUnique({
      where: { id: doorId },
    });
    if (!door) throw new NotFoundException("Door not found");

    if (data.zoneId) {
      const zone = await this.prisma.zone.findUnique({
        where: { id: data.zoneId },
      });
      if (!zone) throw new NotFoundException("Zone not found");
    }

    await this.prisma.door.update({
      where: { id: doorId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.zoneId !== undefined && { zoneId: data.zoneId }),
        ...(data.controllerId !== undefined && {
          controllerId: data.controllerId,
        }),
      },
    });
  }

  // ── Private Helpers ──

  private getOrCreateMachine(
    doorId: string,
    alertConfig: Record<string, any> | null,
  ): DoorStateMachine {
    let machine = this.machines.get(doorId);
    if (!machine) {
      const config: DoorAlertConfig = alertConfig
        ? { ...DEFAULT_ALERT_CONFIG, ...alertConfig }
        : { ...DEFAULT_ALERT_CONFIG };
      machine = new DoorStateMachine(doorId, config);
      this.machines.set(doorId, machine);
    }
    return machine;
  }

  private normalizeState(rawState: string): DoorState | null {
    const mapping: Record<string, DoorState> = {
      locked: DOOR_STATES.LOCKED,
      unlocked: DOOR_STATES.UNLOCKED,
      "held-open": DOOR_STATES.HELD_OPEN,
      "held_open": DOOR_STATES.HELD_OPEN,
      heldopen: DOOR_STATES.HELD_OPEN,
      forced: DOOR_STATES.FORCED,
      "forced-open": DOOR_STATES.FORCED,
      "forced_open": DOOR_STATES.FORCED,
      unsecured: DOOR_STATES.UNSECURED,
      desynchronized: DOOR_STATES.DESYNCHRONIZED,
      desync: DOOR_STATES.DESYNCHRONIZED,
    };
    return mapping[rawState] ?? null;
  }

  /**
   * D-16: Persist door state change to TimescaleDB hypertable via $queryRaw.
   * Not a Prisma model — uses raw SQL for time-series data.
   */
  private async persistDoorStateLog(
    doorId: string,
    orgId: string,
    newState: string,
    previousState: string,
    sequence: number,
    timestamp: Date,
  ): Promise<void> {
    try {
      await this.prisma.$queryRaw`
        INSERT INTO door_state_log (time, door_id, organization_id, state, previous_state, sequence)
        VALUES (${timestamp}, ${doorId}::uuid, ${orgId}::uuid, ${newState}, ${previousState}, ${sequence})
      `;
    } catch (err: any) {
      // door_state_log hypertable may not exist yet (created by TimescaleDB migration)
      this.logger.warn(
        `Failed to write door_state_log (hypertable may not exist): ${err.message}`,
      );
    }
  }
}
