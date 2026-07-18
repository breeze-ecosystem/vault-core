# Phase 2: Hardware Integration — Pattern Map

**Mapped:** 2026-07-17
**Files analyzed:** 30 (12 new, 18 modified)
**Analogs found:** 27 / 30

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `edge/agent/tasks/serial_task.py` | task | serial I/O | `edge/agent/tasks/serial_task.py` (current) | exact — modify in place |
| `edge/agent/services/osdp.py` | service | event-driven | `edge/agent/services/onvif.py` | role-match |
| `edge/agent/tasks/mqtt_task.py` | task | pub-sub | `edge/agent/tasks/mqtt_task.py` (current) | exact — extend |
| `edge/agent/config.py` | config | — | `edge/agent/config.py` (current) | exact — extend |
| `apps/api/prisma/schema.prisma` | model | — | `apps/api/prisma/schema.prisma` (current) | exact — extend |
| `apps/api/src/modules/door/door.controller.ts` | controller | request-response | `apps/api/src/modules/door/door.controller.ts` (current) | exact — extend |
| `apps/api/src/modules/door/door.service.ts` | service | event-driven, CRUD | `apps/api/src/modules/door/door.service.ts` (current) | exact — extend |
| `apps/api/src/modules/door/door.gateway.ts` | gateway | event-driven | `apps/api/src/modules/door/door.gateway.ts` (current) | exact — extend |
| `apps/api/src/modules/door/door.processor.ts` | processor | event-driven | `apps/api/src/modules/door/door.processor.ts` (current) | exact — extend |
| `apps/api/src/modules/camera/camera.controller.ts` | controller | request-response | `apps/api/src/modules/camera/camera.controller.ts` (current) | exact — extend |
| `apps/api/src/modules/camera/camera.service.ts` | service | CRUD | `apps/api/src/modules/camera/camera.service.ts` (current) | exact — extend |
| `apps/api/src/modules/controller/controller.controller.ts` | controller | request-response | `apps/api/src/modules/door/door.controller.ts` | role-match |
| `apps/api/src/modules/controller/controller.service.ts` | service | CRUD | `apps/api/src/modules/camera/camera.service.ts` | role-match |
| `apps/api/src/modules/controller/controller.module.ts` | module | — | `apps/api/src/modules/door/door.module.ts` | exact |
| `apps/api/src/mqtt/mqtt.service.ts` | service | pub-sub, event-driven | `apps/api/src/mqtt/mqtt.service.ts` (current) | exact — extend |
| `apps/dashboard/components/doors/door-card.tsx` (NEW) | component | request-response | inline `DoorCard` in `portes/page.tsx` (lines 107-169) | exact — extract |
| `apps/dashboard/components/cameras/ptz-controls.tsx` (NEW) | component | request-response | `apps/dashboard/components/video-player.tsx` | partial (component pattern) |
| `apps/dashboard/app/(dashboard)/doors/page.tsx` | page | request-response, real-time | `apps/dashboard/app/(dashboard)/portes/page.tsx` (current) | exact — rename & extend |
| `apps/dashboard/app/(dashboard)/equipement/controleurs/page.tsx` | page | request-response, real-time | current `controleurs/page.tsx` | exact — extend |
| `apps/dashboard/components/events/event-detail.tsx` (MODIFY) | component | request-response | event drawer in `chronologie/page.tsx` (lines 482-531) | partial |
| `apps/dashboard/lib/api.ts` | utility | request-response | current `lib/api.ts` (lines 740-816) | exact — extend |
| `apps/dashboard/components/video-player.tsx` | component | streaming, request-response | current `video-player.tsx` | exact — extend (add PTZ) |
| `packages/shared/src/schemas/door.schema.ts` | schema | validation | current `door.schema.ts` | exact — extend |
| `packages/shared/src/schemas/camera.schema.ts` | schema | validation | current `camera.schema.ts` | exact — extend |
| `packages/shared/src/schemas/controller.schema.ts` (NEW) | schema | validation | `packages/shared/src/schemas/door.schema.ts` | role-match |
| `packages/shared/src/types/door.types.ts` | types | — | current `door.types.ts` | exact — extend |
| `packages/shared/src/types/camera.types.ts` (NEW) | types | — | `packages/shared/src/types/door.types.ts` | role-match |
| `packages/shared/src/types/controller.types.ts` (NEW) | types | — | `packages/shared/src/types/door.types.ts` | role-match |
| `packages/shared/src/constants/controller-status.ts` (NEW) | constants | — | `packages/shared/src/constants/door-states.ts` | role-match |
| `packages/shared/src/index.ts` | barrel | — | current `index.ts` | exact — extend |

---

## Pattern Assignments

### `edge/agent/tasks/serial_task.py` (task, serial I/O → event-driven)

**Analog:** `edge/agent/tasks/serial_task.py` (current, lines 1-95)

**What stays the same:**
- The `serial_asyncio.open_serial_connection()` pattern for opening serial ports
- The `shutdown: asyncio.Event` pattern for graceful shutdown
- The `try/finally` writer cleanup pattern
- The `log = logging.getLogger("edge-agent")` logger

**What changes:**
- Replace the byte-gap frame assembly with `libosdp` CP context integration
- Add CP refresh loop at 50ms intervals via `run_in_executor`
- Add command routing from `message_queue` (door_cmd messages → `osdp.send_command()`)
- Add event callbacks that call `mqtt_handler.publish_door_state()` etc.

**Core pattern to follow** (imports lines 6-13, task function signature lines 22-27):
```python
from __future__ import annotations
import asyncio
import logging
import serial_asyncio

log = logging.getLogger("edge-agent")

async def serial_reader(
    shutdown: asyncio.Event,
    device: str,
    baud: int,
    message_queue: asyncio.Queue,
) -> None:
```

**Error handling to follow** (lines 45-47, 92-94):
```python
except Exception as exc:
    log.error("Serial: failed to open %s — %s", device, exc)
    return
# ...
finally:
    writer.close()
    await writer.wait_closed()
    log.info("Serial: disconnected from %s", device)
```

---

### `edge/agent/services/osdp.py` (service, event-driven)

**Analog:** `edge/agent/services/onvif.py` (lines 1-214)

**Imports pattern** (lines 10-17):
```python
from __future__ import annotations
import asyncio
import logging

log = logging.getLogger("edge-agent")
```

**Service class pattern** (protocol wrapper, lines 299-347 of RESEARCH.md):
```python
class OSDPMaster:
    """Manages libosdp CP context with asyncio compatibility."""
    def __init__(self, device: str, baud: int):
        self._device = device
        self._baud = baud
        self._channel = PySerialChannel(device, baud)
        self._pd_info = []
        self._osdp = None

    async def connect(self):
        await self._channel.connect()
        self._osdp = libosdp.OSDP(self._pd_info, mode=libosdp.Mode.CP)

    async def refresh(self):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._osdp.refresh)

    async def send_command(self, pd_address: int, command: str):
        cmd_map = {"lock": libosdp.Command.LOCK, "unlock": libosdp.Command.UNLOCK}
        osdp_cmd = cmd_map.get(command)
        if osdp_cmd:
            await loop.run_in_executor(None, self._osdp.send_command, pd_address, osdp_cmd)
```

**Error handling pattern** (from onvif.py lines 71-75, 109-111):
```python
except Exception as exc:
    log.error("OSDP: failed to ... — %s", exc)
    if sock: sock.close()
    return
```

**Async executor pattern** (from onvif.py lines 101-107):
```python
await loop.run_in_executor(None, sock.sendto, probe_msg.encode("utf-8"), (MCAST_GROUP, MCAST_PORT))
```

---

### `edge/agent/tasks/mqtt_task.py` (task, pub-sub)

**Analog:** `edge/agent/tasks/mqtt_task.py` (current, lines 1-232)

**What stays the same:**
- Full module: `aiomqtt` client with reconnect loop, bounded buffer, TLS params
- `_build_tls_params()`, `_publish()`, `_buffer_or_publish()`, `_buffer_message()`, `_drain_buffer()`
- `seq_numbers` and `next_seq()` pattern
- Main reconnect loop (lines 164-230)

**What to add** — new publish helpers alongside existing ones (after line 153):
```python
async def publish_osdp_event(
    client: aiomqtt.Client | None,
    door_id: str,
    event_type: str,
    badge_number: str | None = None,
    direction: str | None = None,
    tampered: bool = False,
) -> None:
    """Publish rich OSDP event to site/{site_id}/door/{door_id}/event."""
    topic = f"site/{site_id}/door/{door_id}/event"
    payload = {
        "event_type": event_type,
        "door_id": door_id,
        "badge_number": badge_number,
        "direction": direction,
        "tampered": tampered,
        "timestamp": "",
        "sequence": next_seq(door_id),
    }
    await _buffer_or_publish(client, topic, payload)
```

**Registration pattern** (lines 156-158):
```python
mqtt_handler.publish_osdp_event = publish_osdp_event  # type: ignore[attr-defined]
```

---

### `edge/agent/config.py` (config)

**Analog:** `edge/agent/config.py` (current, lines 1-72)

**What to add** — new setting fields after existing sections (after line 44):
```python
# ── OSDP ──────────────────────────────────────────────────────
OSDP_SC_ENABLED: bool = True           # Enable Secure Channel when supported
OSDP_SCBK: str = ""                    # Secure Channel Base Key (32 hex bytes)
OSDP_POLL_INTERVAL: float = 0.05       # 50ms — OSDP timing requirement
```

---

### `apps/api/prisma/schema.prisma` (model)

**Analog:** current `schema.prisma` (lines 444-465 for Camera, 120-141 for Door)

**Camera model — add PTZ and ONVIF fields** (after line 456, before relations):
```prisma
  // Phase 2: PTZ capabilities
  ptzCapabilities   Json?     // { hasPtz, absoluteMove, continuousMove, presets }

  // Phase 2: ONVIF provisioning
  onvifAddress      String?   // IP:port for ONVIF commands
  onvifUsername     String?   // Encrypted or reference to secret
  onvifPassword     String?   // Encrypted or reference to secret
  onvifProfileToken String?   // Active media profile token
  onvifSerialNumber String?   // From GetDeviceInformation

  // Phase 2: PTZ presets
  ptzPresets        Json?     // [{ token, name, snapshotUrl }]
```

**New Controller model** (after Camera model, following schema style of lines 120-141):
```prisma
model Controller {
  id              String   @id @default(uuid())
  name            String?
  serialNumber    String?
  manufacturer    String?
  model           String?
  firmwareVersion String?
  organizationId  String
  siteId          String?
  serialPort      String?   // e.g., "/dev/ttyUSB0"
  osdpAddress     Int?      // 0x01-0x7E
  secureChannel   Boolean   @default(true)
  status          String    @default("PENDING")  // PENDING, ONLINE, OFFLINE, DEGRADED
  lastSeen        DateTime?

  doors          Door[]
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
  @@index([status])
}
```

**Door model — add Controller relation** (add after `cameraMaps   CameraDoorMap[]` on line 136):
```prisma
  controller     Controller?  @relation(fields: [controllerId], references: [id])
```

---

### `apps/api/src/modules/door/door.controller.ts` (controller, request-response)

**Analog:** current `door.controller.ts` (lines 1-160)

**What stays the same:**
- All imports (lines 1-19)
- Constructor pattern (line 23)
- `@Roles()` decorator usage on all endpoints
- `@Audited()` on zone operations and state-changing endpoints
- `ZodValidationPipe` usage for body validation
- `@Req() req: FastifyRequest` for user extraction
- Return shape pattern: `return { status, doorId }` or `return this.doorService.xxx()`

**New endpoint patterns to add** (follow existing zone operation pattern at lines 70-87):
```typescript
// POST /api/doors/:id/cmd — Send lock/unlock command to door
@Post(':id/cmd')
@Audited({ entity: 'door', action: 'UPDATE' })
@Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')
async sendDoorCommand(
  @Param('id') id: string,
  @Body(new ZodValidationPipe(doorCommandSchema)) body: { command: 'lock' | 'unlock' },
  @Req() req: FastifyRequest,
) {
  const user = (req as any)?.user;
  return await this.doorService.sendCommand(id, body.command, user?.orgId);
}

// POST /api/doors — Create door (for OSDP controller enrollment D-17)
@Post()
@Audited({ entity: 'door', action: 'CREATE' })
@Roles('ADMIN', 'SUPER_ADMIN')
async createDoor(
  @Body(new ZodValidationPipe(createDoorSchema)) body: any,
  @Req() req: FastifyRequest,
) {
  const user = (req as any)?.user;
  return await this.doorService.create(body, user?.orgId);
}
```

---

### `apps/api/src/modules/door/door.service.ts` (service, event-driven + CRUD)

**Analog:** current `door.service.ts` (lines 1-598)

**What stays the same:**
- Constructor dependencies (PrismaService, EventEmitter2, Redis, BullMQ, LicenseService)
- `handleDoorStateEvent()` — MQTT event handler pattern (lines 100-221)
- `persistDoorStateLog()` — TimescaleDB insertion (lines 578-597)
- `updateDoor()` — door metadata update (lines 512-538)
- `lockdownZone()` / `emergencyUnlockZone()` / `clearEmergencyOverride()` — zone operations
- `validateCanCreateDoor()` — license-gated creation guard

**What to add:**

**Command publish method** (new method — follows `lockdownZone` pattern at lines 290-316):
```typescript
async sendCommand(doorId: string, command: 'lock' | 'unlock', orgId: string): Promise<{ status: string }> {
  const door = await this.prisma.door.findUnique({ where: { id: doorId } });
  if (!door) throw new NotFoundException('Door not found');

  // Publish MQTT command to edge agent
  this.eventEmitter.emit('mqtt.door.command', {
    topic: `site/${orgId}/door/${doorId}/cmd`,
    message: { command, doorId, timestamp: new Date().toISOString() },
  });

  this.logger.log(`Command ${command} sent to door ${doorId}`);
  return { status: 'sent', doorId };
}
```

**OSDP event handler** (new `@OnEvent` — follows `handleDoorStateEvent` pattern at lines 100-221):
```typescript
@OnEvent('mqtt.door.event', { async: true })
async handleDoorEvent(payload: { topic: string; message: any }) {
  const { topic, message } = payload;
  const topicParts = topic.split('/');
  if (topicParts.length < 5) return;
  const orgId = topicParts[1];
  const doorId = topicParts[3];

  // Persist to hardware_event_log via $queryRaw (same pattern as persistDoorStateLog)
  await this.prisma.$queryRaw`
    INSERT INTO hardware_event_log (time, door_id, organization_id, event_type, payload)
    VALUES (${new Date()}, ${doorId}::uuid, ${orgId}::uuid,
            ${message.event_type}, ${JSON.stringify(message)}::jsonb)
  `;

  // Emit to Socket.IO gateway for Dashboard
  this.eventEmitter.emit('door.osdp-event', {
    doorId, orgId,
    eventType: message.event_type,
    badgeNumber: message.badge_number,
    direction: message.direction,
    tampered: message.tampered,
    timestamp: message.timestamp,
  });
}
```

**Create door method** (new — follows `updateDoor` pattern at lines 512-538):
```typescript
async create(data: { name: string; zoneId: string; controllerId?: string }, orgId: string) {
  await this.validateCanCreateDoor(orgId);
  return this.prisma.door.create({
    data: { ...data, organizationId: orgId, controllerId: data.controllerId },
  });
}
```

---

### `apps/api/src/modules/door/door.gateway.ts` (gateway, event-driven)

**Analog:** current `door.gateway.ts` (lines 1-77)

**What stays the same:**
- Full module structure (imports, `@WebSocketGateway`, constructor, `handleConnection`, `handleDisconnect`)
- `subscribe:site` and `subscribe:door` message handlers
- `door.state-changed` and `zone.emergency` event handlers

**New event types to add** (after line 76):
```typescript
@OnEvent('door.osdp-event', { async: true })
handleOsdpEvent(payload: {
  doorId: string; orgId: string; eventType: string;
  badgeNumber?: string; direction?: string; tampered?: boolean; timestamp: string;
}) {
  this.server.to(`org:${payload.orgId}`).emit('door:osdp-event', payload);
}

@OnEvent('controller.status', { async: true })
handleControllerStatus(payload: {
  controllerId: string; status: string; batteryLevel?: number;
  cpuLoad?: number; memoryUsage?: number;
}) {
  this.server.to(`org:${payload.controllerId.split('-')[0]}`).emit('controller:status', payload);
}

@OnEvent('controller.discovery', { async: true })
handleControllerDiscovery(payload: {
  controllerId: string; serialNumber: string; manufacturer: string; model: string;
}) {
  this.server.to(`org:${payload.controllerId.split('-')[0]}`).emit('controller:discovery', payload);
}

@OnEvent('ptz.preset-update', { async: true })
handlePtzPresetUpdate(payload: { cameraId: string; presets: any[] }) {
  this.server.to(`camera:${payload.cameraId}`).emit('ptz:preset-update', payload);
}
```

---

### `apps/api/src/modules/door/door.processor.ts` (processor, event-driven)

**Analog:** current `door.processor.ts` (lines 1-122)

**What stays the same:**
- Imports (lines 1-8), `@Processor("door-alerts")`, `extends WorkerHost`
- `process()` method with job routing (lines 22-29)
- `evaluateDoorAlert()` — CameraDoorMap lookup + alert creation via AlertService

**What to add** — new job handlers for OSDP events (before the existing process method, or as new job switch cases):
```typescript
case "process-osdp-event":
  return this.processOsdpEvent(job.data);
```

```typescript
private async processOsdpEvent(data: { doorId: string; organizationId: string; eventType: string; badgeNumber?: string; timestamp: string }) {
  // Find associated cameras via CameraDoorMap (same pattern as evaluateDoorAlert lines 63-75)
  const cameraMaps = await this.prisma.cameraDoorMap.findMany({
    where: { doorId: data.doorId },
    orderBy: { priority: "desc" },
    include: { camera: { select: { id: true, name: true, lastSnapshotUrl: true } } },
  });

  // If OSDP event has badge but no snapshot, request camera snapshot
  if (data.badgeNumber && cameraMaps[0]?.camera) {
    this.logger.log(`OSDP badge event on ${data.doorId} — camera ${cameraMaps[0].camera.id} available`);
    // Emit event for snapshot capture workflow
    this.eventEmitter.emit('snapshot.request', { cameraId: cameraMaps[0].camera.id, doorId: data.doorId });
  }
}
```

---

### `apps/api/src/modules/camera/camera.controller.ts` (controller, request-response)

**Analog:** current `camera.controller.ts` (lines 1-176)

**What stays the same:**
- All CRUD endpoints (`findAll`, `findById`, `create`, `update`, `remove`)
- All prompt sub-resource endpoints
- `@Roles()` decorator pattern
- `ZodValidationPipe` pattern

**New PTZ endpoints to add** (after line 175, following the prompt sub-resource pattern at lines 111-175):

**PTZ Continuous move** (follow pattern from lines 111-134):
```typescript
@Post(':id/ptz/continuous')
@Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')  // D-16
async ptzContinuous(
  @Param('id') id: string,
  @Body(new ZodValidationPipe(ptzContinuousSchema)) body: any,
) {
  const camera = await this.cameraService.findById(id);
  if (!camera.ptzCapabilities?.hasPtz) {
    throw new BadRequestException('Cette caméra ne supporte pas PTZ');
  }
  return this.cameraService.sendPtzCommand(id, 'ContinuousMove', body);
}

@Post(':id/ptz/stop')
@Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
async ptzStop(@Param('id') id: string) {
  return this.cameraService.sendPtzCommand(id, 'Stop', {});
}

@Post(':id/ptz/goto-preset')
@Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
async ptzGotoPreset(
  @Param('id') id: string,
  @Body() body: { presetToken: string },
) {
  return this.cameraService.sendPtzCommand(id, 'GotoPreset', body);
}

@Post(':id/ptz/save-preset')
@Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')
async ptzSavePreset(
  @Param('id') id: string,
  @Body() body: { name: string },
) {
  return this.cameraService.savePreset(id, body.name);
}
```

---

### `apps/api/src/modules/camera/camera.service.ts` (service, CRUD)

**Analog:** current `camera.service.ts` (lines 1-151)

**What stays the same:**
- `findAll()`, `findById()`, `create()` (with license enforcement), `update()`, `remove()`
- Prompt management methods (`getPrompts`, `addPrompt`, `updatePrompt`, `deletePrompt`)

**What to add** — new PTZ methods (after line 150):
```typescript
async sendPtzCommand(cameraId: string, command: string, params: any) {
  const camera = await this.findById(cameraId);
  if (!camera.onvifAddress) {
    throw new BadRequestException('Camera has no ONVIF address configured');
  }

  // PTZ commands route via HTTP to camera (or via MQTT to Edge Agent as fallback)
  // Uses onvifAddress stored on camera model
  const onvifUrl = `http://${camera.onvifAddress}/onvif/ptz`;
  // ... HTTP call to ONVIF camera or Edge Agent relay
  return { status: 'sent', cameraId, command };
}

async savePreset(cameraId: string, name: string) {
  const camera = await this.findById(cameraId);
  const presets = (camera.ptzPresets as any[]) || [];
  if (presets.length >= 10) {
    throw new BadRequestException('Maximum 10 presets per camera');
  }
  const newPreset = { token: `preset_${Date.now()}`, name, snapshotUrl: null };
  return this.prisma.camera.update({
    where: { id: cameraId },
    data: { ptzPresets: [...presets, newPreset] as any },
  });
}
```

---

### `apps/api/src/modules/controller/controller.controller.ts` (controller, request-response) — NEW

**Analog:** `apps/api/src/modules/door/door.controller.ts` (lines 1-160)

**Imports pattern** (follow door.controller.ts lines 1-19):
```typescript
import { Controller, Get, Post, Patch, Body, Param, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { ControllerService } from "./controller.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Roles } from "../../common/decorators/roles.decorator";
import { Audited } from "../../common/decorators/audited.decorator";
import { enrollControllerSchema } from "@repo/shared";
```

**Core pattern** (follow door.controller.ts lines 22-38, 150-159):
```typescript
@Controller("controllers")
export class ControllerController {
  constructor(private controllerService: ControllerService) {}

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN", "SUPERVISOR")
  async findAll() {
    return this.controllerService.findAll();
  }

  @Patch(":id/enroll")
  @Audited({ entity: "controller", action: "UPDATE" })
  @Roles("ADMIN", "SUPER_ADMIN")
  async enroll(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(enrollControllerSchema)) body: any,
  ) {
    return this.controllerService.enroll(id, body);
  }
}
```

---

### `apps/api/src/modules/controller/controller.service.ts` (service, CRUD) — NEW

**Analog:** `apps/api/src/modules/camera/camera.service.ts` (lines 1-151)

**Imports pattern** (follow camera.service.ts lines 1-5):
```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
```

**Core CRUD pattern** (follow camera.service.ts `findAll` lines 13-38, `update` lines 92-99):
```typescript
@Injectable()
export class ControllerService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.controller.findMany({
      include: { doors: { select: { id: true, name: true } } },
      orderBy: { lastSeen: "desc" },
    });
  }

  async enroll(id: string, data: { name: string; siteId: string; zoneId?: string }) {
    const ctrl = await this.prisma.controller.findUnique({ where: { id } });
    if (!ctrl) throw new NotFoundException("Controller not found");
    return this.prisma.controller.update({
      where: { id },
      data: { name: data.name, siteId: data.siteId, status: "ONLINE" },
    });
  }
}
```

---

### `apps/api/src/modules/controller/controller.module.ts` (module) — NEW

**Analog:** `apps/api/src/modules/door/door.module.ts` (lines 1-41)

**Core pattern** (lines 1-41 exactly — with different module name):
```typescript
import { Module } from "@nestjs/common";
import { ControllerController } from "./controller.controller";
import { ControllerService } from "./controller.service";

@Module({
  controllers: [ControllerController],
  providers: [ControllerService],
  exports: [ControllerService],
})
export class ControllerModule {}
```

---

### `apps/api/src/mqtt/mqtt.service.ts` (service, pub-sub, event-driven)

**Analog:** current `mqtt.service.ts` (lines 1-127)

**What stays the same:**
- Full module structure: `onModuleInit`, `onModuleDestroy`, `handleMessage`
- `mqtt.connect()` with will message (lines 23-36)
- `client.on("connect")` subscription block (lines 43-58)
- Sequence number validation (lines 82-93)
- EventEmitter2 event routing (lines 96-111)

**What to add** — new topic subscriptions in `onModuleInit` (inside the `subscribe` block after line 57):
```typescript
// Phase 2: OSDP event topics
"site/+/door/+/event": { qos: 1 },
"site/+/controller/+/discovery": { qos: 1 },
"site/+/onvif/+/event": { qos: 1 },
```

**New routing in `handleMessage`** (add after line 111):
```typescript
} else if (topic.includes("/door/") && topic.endsWith("/event")) {
  this.eventEmitter.emit("mqtt.door.event", { topic, message });
} else if (topic.includes("/controller/") && topic.endsWith("/discovery")) {
  this.eventEmitter.emit("mqtt.controller.discovery", { topic, message });
} else if (topic.includes("/onvif/") && topic.endsWith("/event")) {
  this.eventEmitter.emit("mqtt.onvif.event", { topic, message });
}
```

---

### `apps/dashboard/components/doors/door-card.tsx` (component, request-response) — NEW

**Analog:** `apps/dashboard/app/(dashboard)/portes/page.tsx` inline `DoorCard` component (lines 107-169)

**Extract to standalone component** with the existing pattern (lines 107-169) plus new props:

**Props interface** (from UI-SPEC.md lines 265-277):
```typescript
interface DoorCardProps {
  door: DoorStateDto;
  zones: ZoneDto[];
  userRole: string;
  onLock: (doorId: string) => void;
  onUnlock: (doorId: string) => void;
  onZoneChange: (doorId: string, zoneId: string) => void;
  onAlertConfig: (door: DoorStateDto) => void;
  isAdmin: boolean;
  heldOpenSeconds: number | null;
  commandState?: CommandState;
}
```

**Existing card pattern to copy** (lines 121-168):
```typescript
export function DoorCard({ door, isAdmin, heldOpenSeconds, onAlertConfig, onLock, onUnlock, zones, userRole, commandState }: DoorCardProps) {
  const sc = getStateConfig(door.state);

  return (
    <Card className={`group overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg ${sc.pulse ? "animate-pulse border-destructive/40" : ""}`}>
      {/* ... existing card structure ... */}
    </Card>
  );
}
```

**New lock/unlock buttons** (add inside CardContent, below existing content):
```typescript
<div className="flex items-center gap-2 mt-3">
  {door.state === 'locked' ? (
    <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10"
      onClick={() => onUnlock(door.doorId)} disabled={door.state === 'desynchronized'}>
      <Unlock className="h-4 w-4 mr-1" /> Déverrouiller
    </Button>
  ) : (
    <Button variant="outline" size="sm" className="border-success/30 text-success hover:bg-success/10"
      onClick={() => onLock(door.doorId)} disabled={door.state === 'desynchronized'}>
      <Lock className="h-4 w-4 mr-1" /> Verrouiller
    </Button>
  )}
  {/* Command state indicator */}
  {commandState && commandState !== 'idle' && (
    <span className={`text-xs ${commandState === 'acknowledged' ? 'text-success' : commandState === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
      {commandState === 'sending' ? 'Envoi...' : commandState === 'sent' ? 'Envoyé' : commandState === 'acknowledged' ? 'Acquitté' : 'Échec'}
    </span>
  )}
  {/* Zone dropdown (D-05) */}
  {isAdmin && (
    <select value={door.zoneId} onChange={(e) => onZoneChange(door.doorId, e.target.value)}
      className="ml-auto rounded-md border border-input bg-background px-2 py-1 text-xs">
      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
    </select>
  )}
</div>
```

---

### `apps/dashboard/components/cameras/ptz-controls.tsx` (component, request-response) — NEW

**Analog:** `apps/dashboard/components/video-player.tsx` (lines 1-248)

**Component pattern** (follow video-player.tsx lines 1-30):
```typescript
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, StopCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PTZControlsProps {
  cameraId: string;
  hasPtz: boolean;
  presets?: PTZPreset[];
  userRole: string;
  onMove: (pan: number, tilt: number, zoom: number) => void;
  onStop: () => void;
  onGotoPreset: (presetToken: string) => void;
  onSavePreset: (name: string) => void;
  disabled?: boolean;
}

export function PTZControls({ cameraId, hasPtz, presets, userRole, onMove, onStop, onGotoPreset, onSavePreset, disabled }: PTZControlsProps) {
  // Role gate: hide if role < SUPERVISOR or no PTZ
  const canControl = ['ADMIN', 'SUPER_ADMIN', 'SUPERVISOR'].includes(userRole);
  if (!canControl || !hasPtz) return null;

  // ... directional pad + zoom slider + preset bar
}
```

**Directional pad layout** (from UI-SPEC.md lines 172-188):
```
┌────┐
│ ▲  │   ← pan:0 tilt:-1
│◄ ┼ ►│   ← pan:-1/1 tilt:0
│ ▼  │   ← pan:0 tilt:1
└────┘
  [STOP]
```

---

### `apps/dashboard/app/(dashboard)/doors/page.tsx` (page, request-response + real-time)

**Analog:** current `portes/page.tsx` (lines 1-634)

**What stays the same:**
- Full page structure: state config, filters, loading skeleton, empty state, error state
- Socket.IO connection + event handlers (`state-update`, `emergency-update`)
- `useAuth()` for role checks
- Emergency controls modal
- Alert config modal

**What changes:**
- Replace inline `DoorCard` with imported `DoorCard` component from `@/components/doors/door-card`
- Add lock/unlock handlers that call `POST /api/doors/:id/cmd`
- Add zone change handler that calls `PATCH /api/doors/:id/zone`
- Add command state tracking (`Map<string, CommandState>`)
- Add Socket.IO `door:command-state` event handler
- Add bulk operations bar for zone-level lock/unlock (D-12)

**New import** (add after line 5):
```typescript
import { DoorCard } from '@/components/doors/door-card';
import { BulkActionBar } from '@/components/bulk-action-bar';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
```

**File rename:** `portes/page.tsx` → `doors/page.tsx` (with French route alias)

---

### `apps/dashboard/app/(dashboard)/equipement/controleurs/page.tsx` (page, request-response + real-time)

**Analog:** current `controleurs/page.tsx` (lines 1-275)

**What stays the same:**
- Full page structure: table view, battery filter, history modal
- `fetchControllerHealth()` API calls
- 30-second polling interval

**What to add** (D-17 — controller enrollment):
- Pending controllers section at top of table showing `status === "PENDING"` rows
- "Configurer" button per pending controller opening enroll modal
- Socket.IO `controller:discovery` event handler for live add
- Socket.IO `controller:status` event handler for online/offline updates
- Enroll form modal with name input, site dropdown, zone dropdown

**New import / pattern** (follow existing modal pattern at lines 40-99):
```typescript
// Add Socket.IO
import { io, type Socket } from 'socket.io-client';

// Enroll modal (follows HistoryModal pattern)
function EnrollModal({ controller, onClose, onEnroll }: { controller: any; onClose: () => void; onEnroll: (id: string, data: any) => void }) {
  // ... name input, site dropdown, zone dropdown ...
}

// Add to page component:
socket.on('controller:discovery', (payload) => {
  setControllers(prev => [...prev, { ...payload, status: 'PENDING', battery_level: null, cpu_load: null, memory_usage: null, connection_stability: 'disconnected', firmware_version: null }]);
});
```

---

### `apps/dashboard/components/events/event-detail.tsx` (component, request-response) — MODIFY

**Analog:** event drawer in `chronologie/page.tsx` (lines 482-531)

**What stays the same:**
- Bottom panel layout with close button
- Grid layout (image left, details right)
- Snapshot/video thumbnail display
- Metadata JSON display

**What to add** — OSDP-specific details section (from UI-SPEC.md lines 219-229):
```typescript
// In the detail panel, add after existing metadata section:
{event.metadata?.badgeNumber && (
  <div className="mt-3 space-y-1 text-sm">
    <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Détails matériel</h4>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      <span className="text-muted-foreground">Badge:</span>
      <span className="font-mono">#{event.metadata.badgeNumber}</span>
      {event.metadata.direction && (
        <>
          <span className="text-muted-foreground">Direction:</span>
          <span>{event.metadata.direction === 'ingress' ? '⬈ Entrée' : '⬉ Sortie'}</span>
        </>
      )}
      {event.metadata.tampered && (
        <>
          <span className="text-muted-foreground">Sabotage:</span>
          <Badge variant="outline" className="text-orange-400 border-orange-500/30">Sabotage</Badge>
        </>
      )}
      {event.metadata.controllerSerial && (
        <>
          <span className="text-muted-foreground">Contrôleur:</span>
          <span className="font-mono text-xs">{event.metadata.controllerSerial}</span>
        </>
      )}
    </div>
  </div>
)}
```

---

### `apps/dashboard/lib/api.ts` (utility, request-response)

**Analog:** current `lib/api.ts` (lines 740-816)

**What to add** — new API functions following existing pattern:

**Door command** (follow `lockdownZone` pattern lines 781-787):
```typescript
export async function sendDoorCommand(doorId: string, command: 'lock' | 'unlock'): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/${doorId}/cmd`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error("Échec de la commande porte");
}

export async function updateDoorZone(doorId: string, zoneId: string): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/${doorId}`, {
    method: 'PATCH',
    body: JSON.stringify({ zoneId }),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour de zone");
}

export async function createDoor(data: { name: string; zoneId: string; controllerId?: string }): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/doors`, {
    method: 'POST', body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de la création de porte");
  return res.json();
}
```

**Controller enrollment** (follow `fetchControllerHealth` pattern):
```typescript
export async function enrollController(controllerId: string, data: { name: string; siteId: string; zoneId?: string }): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/controllers/${controllerId}/enroll`, {
    method: 'PATCH', body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Échec de l'enregistrement du contrôleur");
}
```

**PTZ commands** (new pattern):
```typescript
export async function ptzContinuousMove(cameraId: string, pan: number, tilt: number, zoom: number): Promise<void> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/ptz/continuous`, {
    method: 'POST', body: JSON.stringify({ pan, tilt, zoom }),
  });
  if (!res.ok) throw new Error("Échec de la commande PTZ");
}

export async function ptzStop(cameraId: string): Promise<void> {
  await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/ptz/stop`, { method: 'POST' });
}

export async function ptzGotoPreset(cameraId: string, presetToken: string): Promise<void> {
  await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/ptz/goto-preset`, {
    method: 'POST', body: JSON.stringify({ presetToken }),
  });
}

export async function ptzSavePreset(cameraId: string, name: string): Promise<any> {
  const res = await fetchWithAuth(`${API_URL}/api/cameras/${cameraId}/ptz/save-preset`, {
    method: 'POST', body: JSON.stringify({ name }),
  });
  return res.json();
}
```

---

### `apps/dashboard/components/video-player.tsx` (component, streaming, request-response)

**Analog:** current `video-player.tsx` (lines 1-248)

**What stays the same:**
- WebRTC + HLS connection logic (lines 60-119)
- Reconnect with exponential backoff (lines 122-134)
- Loading/offline/connected states
- Fullscreen toggle
- Top bar with camera name + quality indicator

**What to add** — PTZ overlay container (new child element, positioned absolutely over video):
```typescript
// Import PTZControls
import { PTZControls } from './cameras/ptz-controls';

// Add state for PTZ overlay visibility
const [showPtz, setShowPtz] = useState(false);
const hidePtzTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

// Add PTZ handlers
const handlePtzMove = useCallback(async (pan: number, tilt: number, zoom: number) => {
  try { await ptzContinuousMove(cameraId, pan, tilt, zoom); } catch {}
}, [cameraId]);

const handlePtzStop = useCallback(async () => {
  try { await ptzStop(cameraId); } catch {}
}, [cameraId]);

// Add PTZ overlay in JSX (before the bottom bar or inside the container):
{hasPtz && canControl && (
  <div className={`absolute inset-0 transition-opacity duration-300 ${showPtz ? 'opacity-100' : 'opacity-0'}`}
    onMouseEnter={() => { setShowPtz(true); if (hidePtzTimer.current) clearTimeout(hidePtzTimer.current); }}
    onMouseLeave={() => { hidePtzTimer.current = setTimeout(() => setShowPtz(false), 4000); }}>
    <PTZControls cameraId={cameraId} hasPtz={hasPtz} presets={presets} userRole={userRole}
      onMove={handlePtzMove} onStop={handlePtzStop} onGotoPreset={handlePtzGotoPreset}
      onSavePreset={handlePtzSavePreset} disabled={connectionState !== 'connected'} />
  </div>
)}
```

---

### `packages/shared/src/schemas/door.schema.ts` (schema, validation)

**Analog:** current `door.schema.ts` (lines 1-13)

**What stays the same:**
- `updateAlertConfigSchema`, `emergencyOverrideSchema`
- `z.infer<>` typed exports

**What to add:**
```typescript
export const doorCommandSchema = z.object({
  command: z.enum(["lock", "unlock"]),
});

export const createDoorSchema = z.object({
  name: z.string().min(1).max(128),
  siteId: z.string().uuid(),
  zoneId: z.string().uuid(),
  location: z.string().optional(),
  controllerId: z.string().optional(),
});

export type DoorCommandInput = z.infer<typeof doorCommandSchema>;
export type CreateDoorInput = z.infer<typeof createDoorSchema>;
```

---

### `packages/shared/src/schemas/camera.schema.ts` (schema, validation)

**Analog:** current `camera.schema.ts` (lines 1-25)

**What stays the same:**
- `createCameraSchema`, `updateCameraSchema`

**What to add** — PTZ schemas:
```typescript
export const ptzContinuousSchema = z.object({
  pan: z.number().min(-1).max(1),
  tilt: z.number().min(-1).max(1),
  zoom: z.number().min(-1).max(1),
});

export const ptzGotoPresetSchema = z.object({
  presetToken: z.string().min(1),
});

export const ptzSavePresetSchema = z.object({
  name: z.string().min(1).max(64),
});

export type PtzContinuousInput = z.infer<typeof ptzContinuousSchema>;
export type PtzGotoPresetInput = z.infer<typeof ptzGotoPresetSchema>;
export type PtzSavePresetInput = z.infer<typeof ptzSavePresetSchema>;
```

---

### `packages/shared/src/schemas/controller.schema.ts` (schema, validation) — NEW

**Analog:** `packages/shared/src/schemas/door.schema.ts` (lines 1-13)

**Core pattern:** (Zod schema + type export):
```typescript
import { z } from "zod";

export const enrollControllerSchema = z.object({
  name: z.string().min(1).max(128),
  siteId: z.string().uuid(),
  zoneId: z.string().uuid().optional(),
});

export type EnrollControllerInput = z.infer<typeof enrollControllerSchema>;
```

---

### `packages/shared/src/types/door.types.ts` (types)

**Analog:** current `door.types.ts` (lines 1-33)

**What stays the same:** All existing types

**What to add:**
```typescript
export interface DoorCommandResponse {
  status: 'sent' | 'acknowledged' | 'failed';
  doorId: string;
  timestamp: string;
}

export interface OsdpEventDto {
  eventType: 'badge_read' | 'door_state' | 'tamper' | 'forced_open';
  doorId: string;
  badgeNumber?: string;
  direction?: 'ingress' | 'egress';
  tampered?: boolean;
  controllerSerial?: string;
  timestamp: string;
  sequence: number;
}
```

---

### `packages/shared/src/types/camera.types.ts` (types) — NEW

**Analog:** `packages/shared/src/types/door.types.ts` (lines 1-33)

```typescript
export interface PTZPreset {
  token: string;
  name: string;
  snapshotUrl: string | null;
}

export interface PTZCapabilities {
  hasPtz: boolean;
  absoluteMove: boolean;
  continuousMove: boolean;
  presets: boolean;
}
```

---

### `packages/shared/src/types/controller.types.ts` (types) — NEW

```typescript
export type ControllerStatus = 'PENDING' | 'ONLINE' | 'OFFLINE' | 'DEGRADED';

export interface ControllerDto {
  id: string;
  name?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  organizationId: string;
  siteId?: string;
  serialPort?: string;
  osdpAddress?: number;
  secureChannel: boolean;
  status: ControllerStatus;
  lastSeen?: string;
}
```

---

### `packages/shared/src/constants/controller-status.ts` (constants) — NEW

**Analog:** `packages/shared/src/constants/door-states.ts` (lines 1-10)

```typescript
export const CONTROLLER_STATUS = {
  PENDING: "PENDING",
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  DEGRADED: "DEGRADED",
} as const;

export type ControllerStatus = (typeof CONTROLLER_STATUS)[keyof typeof CONTROLLER_STATUS];
```

---

### `packages/shared/src/index.ts` (barrel)

**Analog:** current `index.ts` (lines 1-353)

**What to add** — new exports following existing section pattern:

After door schemas section (after line 94, following pattern at lines 92-94):
```typescript
export { doorCommandSchema, createDoorSchema } from "./schemas/door.schema";
export type { DoorCommandInput, CreateDoorInput } from "./schemas/door.schema";
```

After camera schemas section (after line 47, following pattern):
```typescript
export { ptzContinuousSchema, ptzGotoPresetSchema, ptzSavePresetSchema } from "./schemas/camera.schema";
export type { PtzContinuousInput, PtzGotoPresetInput, PtzSavePresetInput } from "./schemas/camera.schema";
```

New controller section (after camera section):
```typescript
// Schemas - Controller
export { enrollControllerSchema } from "./schemas/controller.schema";
export type { EnrollControllerInput } from "./schemas/controller.schema";

// Types - Controller
export type { ControllerDto, ControllerStatus } from "./types/controller.types";

// Constants - Controller
export { CONTROLLER_STATUS } from "./constants/controller-status";
```

New door types:
```typescript
export type { DoorCommandResponse, OsdpEventDto } from "./types/door.types";
```

New camera types:
```typescript
export type { PTZPreset, PTZCapabilities } from "./types/camera.types";
```

---

## Shared Patterns

### Authentication & Authorization
**Source:** `apps/api/src/common/decorators/roles.decorator.ts` (line 4)
```
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```
**Source:** `apps/api/src/common/decorators/audited.decorator.ts` (line 11)
```
export const Audited = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);
```
**Apply to:** All controller files — `door.controller.ts`, `camera.controller.ts`, `controller.controller.ts`
- `@Roles()` on every endpoint (ADMIN/Supervisor tiers)
- `@Audited()` on state-changing endpoints (lock/unlock, enroll, zone change)
- PTZ endpoints: `@Roles('ADMIN', 'SUPER_ADMIN', 'SUPERVISOR')` per D-16
- Door lock/unlock: `@Roles('ADMIN', 'SUPERVISOR', 'OPERATOR')`

### Validation (ZodValidationPipe)
**Source:** `apps/api/src/common/pipes/zod-validation.pipe.ts` (lines 1-21)
```
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}
  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) { throw new BadRequestException(...); }
    return result.data;
  }
}
```
**Apply to:** All POST/PATCH/PUT endpoint bodies
- `@Body(new ZodValidationPipe(doorCommandSchema))`
- `@Body(new ZodValidationPipe(ptzContinuousSchema))`

### Error Handling (NestJS)
**Source:** `apps/api/src/modules/camera/camera.service.ts` (lines 49-51, 108-110, 134-135)
```typescript
// Single-line guard clause
if (!camera) throw new NotFoundException("Camera not found");
// or
if (!camera.ptzCapabilities?.hasPtz) throw new BadRequestException("Cette caméra ne supporte pas PTZ");
```
**Apply to:** All service files — `door.service.ts`, `camera.service.ts`, `controller.service.ts`

### API Client Pattern (Dashboard)
**Source:** `apps/dashboard/lib/api.ts` (lines 756-760, 781-787)
```typescript
export async function fetchAllDoorStates(): Promise<DoorStateDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/doors/states`);
  if (!res.ok) throw new Error("Échec du chargement de l'état des portes");
  return res.json();
}
```
**Apply to:** All new API functions — `sendDoorCommand`, `ptzContinuousMove`, `enrollController`, etc.

### MQTT → EventEmitter2 Pipeline
**Source:** `apps/api/src/mqtt/mqtt.service.ts` (lines 95-111)
```typescript
if (topic.includes("/door/") && topic.endsWith("/state")) {
  this.eventEmitter.emit("mqtt.door.state", { topic, message });
}
```
**Apply to:** New OSDP event topics routed via same pattern — add new `else if` branches for `/door//event`, `/controller//discovery`, `/onvif//event`

### Socket.IO Gateway → Dashboard Real-Time
**Source:** `apps/api/src/modules/door/door.gateway.ts` (lines 48-63)
```typescript
@OnEvent("door.state-changed", { async: true })
handleDoorStateChanged(payload: { doorId: string; orgId: string; ... }) {
  this.server.to(`org:${payload.orgId}`).emit("state-update", payload);
}
```
**Apply to:** New gateway events — `door:osdp-event`, `controller:status`, `controller:discovery`, `door:command-state`, `ptz:preset-update`

### Dashboard Socket.IO Client Pattern
**Source:** `apps/dashboard/app/(dashboard)/portes/page.tsx` (lines 220-260)
```typescript
const socket: Socket = io(`${WS_URL}/ws/doors`, { transports: ["websocket"], reconnection: true });
socket.on("state-update", (payload: any) => {
  setDoors(prev => prev.map(d => d.doorId === payload.doorId ? { ...d, state: payload.newState } : d));
});
```
**Apply to:** New event handlers in `doors/page.tsx`, `controleurs/page.tsx`

### EventEmitter2 Handler Pattern (Service)
**Source:** `apps/api/src/modules/door/door.service.ts` (lines 100-104)
```typescript
@OnEvent("mqtt.door.state", { async: true })
async handleDoorStateEvent(payload: { topic: string; message: DoorStatePayload }) {
```
**Apply to:** New `@OnEvent` handlers in `door.service.ts` for `mqtt.door.event`, and potentially in `controller.service.ts` for `mqtt.controller.discovery`

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `edge/agent/services/osdp_channel.py` (NEW) | service | serial I/O | No existing pyserial-asyncio Channel wrapper for libosdp — use libosdp Python example pattern from RESEARCH.md |
| `edge/agent/services/camera_snapshot.py` (NEW) | service | file I/O, HTTP | No existing snapshot capture service — use aiohttp GET pattern from RESEARCH.md |
| `apps/api/src/modules/controller/controller.module.ts` | module | — | New module — but exact analog in `door.module.ts` |

These files have patterns documented in RESEARCH.md that should be used as reference.

---

## Metadata

**Analog search scope:** `edge/agent/`, `apps/api/src/modules/door/`, `apps/api/src/modules/camera/`, `apps/api/src/mqtt/`, `apps/api/prisma/schema.prisma`, `apps/dashboard/app/(dashboard)/portes/`, `apps/dashboard/app/(dashboard)/chronologie/`, `apps/dashboard/app/(dashboard)/equipement/controleurs/`, `apps/dashboard/components/`, `apps/dashboard/lib/`, `packages/shared/src/`
**Files scanned:** 30+
**Pattern extraction date:** 2026-07-17
