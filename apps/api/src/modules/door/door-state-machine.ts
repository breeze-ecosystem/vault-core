import { DOOR_STATES, type DoorState } from "@repo/shared";

export { DOOR_STATES as DoorState };

export interface DoorAlertConfig {
  heldOpenThresholdMs: number;
  forcedOpenImmediate: boolean;
  unsecuredImmediate: boolean;
  settlingTimeoutMs: number;
  desyncMaxRetries: number;
}

export const DEFAULT_ALERT_CONFIG: DoorAlertConfig = {
  heldOpenThresholdMs: 30000,
  forcedOpenImmediate: true,
  unsecuredImmediate: true,
  settlingTimeoutMs: 500,
  desyncMaxRetries: 3,
};

/**
 * Event-sourced door state machine (D-04).
 * Validates every transition against the allowed transition graph.
 */
export const VALID_TRANSITIONS: Record<DoorState, DoorState[]> = {
  [DOOR_STATES.LOCKED]: [
    DOOR_STATES.UNLOCKED,
    DOOR_STATES.FORCED,
    DOOR_STATES.UNSECURED,
    DOOR_STATES.DESYNCHRONIZED,
  ],
  [DOOR_STATES.UNLOCKED]: [
    DOOR_STATES.LOCKED,
    DOOR_STATES.HELD_OPEN,
    DOOR_STATES.FORCED,
    DOOR_STATES.DESYNCHRONIZED,
  ],
  [DOOR_STATES.HELD_OPEN]: [
    DOOR_STATES.LOCKED,
    DOOR_STATES.UNSECURED,
    DOOR_STATES.DESYNCHRONIZED,
  ],
  [DOOR_STATES.FORCED]: [
    DOOR_STATES.LOCKED,
    DOOR_STATES.DESYNCHRONIZED,
  ],
  [DOOR_STATES.UNSECURED]: [
    DOOR_STATES.LOCKED,
    DOOR_STATES.HELD_OPEN,
    DOOR_STATES.DESYNCHRONIZED,
  ],
  [DOOR_STATES.DESYNCHRONIZED]: [
    DOOR_STATES.LOCKED,
  ],
};

export const ALERT_TRIGGER_STATES: DoorState[] = [
  DOOR_STATES.HELD_OPEN,
  DOOR_STATES.FORCED,
  DOOR_STATES.UNSECURED,
  DOOR_STATES.DESYNCHRONIZED,
];

export class IllegalDoorTransitionError extends Error {
  constructor(
    public readonly doorId: string,
    public readonly currentState: DoorState,
    public readonly proposedState: DoorState,
  ) {
    super(
      `Illegal door transition for ${doorId}: ${currentState} → ${proposedState}`,
    );
    this.name = "IllegalDoorTransitionError";
  }
}

export class DoorStateMachine {
  constructor(
    public readonly doorId: string,
    public readonly config: DoorAlertConfig = { ...DEFAULT_ALERT_CONFIG },
  ) {}

  /**
   * D-04: Validate a proposed state transition.
   * Returns the new state if valid, throws IllegalDoorTransitionError if not.
   * No-op if currentState === proposedState.
   */
  validateTransition(
    currentState: DoorState,
    proposedState: DoorState,
  ): DoorState {
    if (currentState === proposedState) {
      return proposedState;
    }

    const allowed = VALID_TRANSITIONS[currentState];
    if (!allowed.includes(proposedState)) {
      throw new IllegalDoorTransitionError(
        this.doorId,
        currentState,
        proposedState,
      );
    }

    return proposedState;
  }

  /** Returns true if this state triggers an alert evaluation. */
  shouldGenerateAlert(newState: DoorState): boolean {
    return ALERT_TRIGGER_STATES.includes(newState);
  }

  /**
   * D-06 / D-07: Evaluate whether an alert should be raised for the given state.
   * Returns shouldAlert + optional reason based on state-specific thresholds.
   */
  getAlertConfig(
    state: DoorState,
    timeInStateMs: number,
  ): { shouldAlert: boolean; reason?: string } {
    switch (state) {
      case DOOR_STATES.HELD_OPEN:
        if (timeInStateMs >= this.config.heldOpenThresholdMs) {
          return {
            shouldAlert: true,
            reason: `Door held open for ${Math.round(timeInStateMs / 1000)}s`,
          };
        }
        return { shouldAlert: false };

      case DOOR_STATES.FORCED:
        if (this.config.forcedOpenImmediate) {
          return { shouldAlert: true, reason: "Door forced open" };
        }
        return { shouldAlert: false };

      case DOOR_STATES.UNSECURED:
        if (this.config.unsecuredImmediate) {
          return { shouldAlert: true, reason: "Door unsecured outside schedule" };
        }
        return { shouldAlert: false };

      case DOOR_STATES.DESYNCHRONIZED:
        return { shouldAlert: true, reason: "Controller state mismatch" };

      default:
        return { shouldAlert: false };
    }
  }
}
