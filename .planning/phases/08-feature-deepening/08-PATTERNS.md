# Phase 8: Feature Deepening — Pattern Map

**Mapped:** 2026-07-16
**Files analyzed:** 65 (23 API + 9 shared + 26 dashboard + 7 mobile)
**Analogs found:** 62 / 65

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/api/src/modules/door/door-state-machine.ts` | service | event-driven | Existing `door-state-machine.ts` (same file) | exact |
| `apps/api/src/modules/door/door.service.ts` | service | event-driven + CRUD | Existing `door.service.ts` (same file) | exact |
| `apps/api/src/modules/door/door.controller.ts` | controller | request-response | Existing `door.controller.ts` (same file) | exact |
| `apps/api/src/modules/door/door.processor.ts` | processor | event-driven | Existing `door.processor.ts` (same file) | exact |
| `apps/api/src/modules/incident/incident.service.ts` | service | CRUD + event-driven | Existing `incident.service.ts` (same file) | exact |
| `apps/api/src/modules/incident/incident.controller.ts` | controller | request-response | Existing `incident.controller.ts` (same file) | exact |
| `apps/api/src/modules/incident/incident.processor.ts` | processor | event-driven | Existing `incident.processor.ts` (same file) | exact |
| `apps/api/src/modules/incident/incident-state-machine.ts` | service | state-machine | Existing `incident-state-machine.ts` (same file) | exact |
| `apps/api/src/modules/visitor/visitor.service.ts` | service | CRUD | Existing `visitor.service.ts` (same file) | exact |
| `apps/api/src/modules/visitor/visitor.controller.ts` | controller | request-response | Existing `visitor.controller.ts` (same file) | exact |
| `apps/api/src/modules/visitor/visitor.module.ts` | module | config | Existing `visitor.module.ts` (same file) | exact |
| `apps/api/src/modules/anpr/anpr.service.ts` | service | CRUD + event-driven | Existing `anpr.service.ts` (same file) | exact |
| `apps/api/src/modules/anpr/anpr.controller.ts` | controller | request-response | Existing `anpr.controller.ts` (same file) | exact |
| `apps/api/src/modules/anpr/anpr.processor.ts` | processor | event-driven | Existing `anpr.processor.ts` (same file) | exact |
| `apps/api/src/modules/access/access.service.ts` | service | CRUD | Existing `access.service.ts` (same file) | exact |
| `apps/api/src/modules/access/access.controller.ts` | controller | request-response | Existing `access.controller.ts` (same file) | exact |
| `apps/api/src/modules/analytics/analytics.service.ts` | service | CRUD + request-response | Existing `analytics.service.ts` (same file) | exact |
| `apps/api/src/modules/analytics/analytics.controller.ts` | controller | request-response | Existing `analytics.controller.ts` (same file) | exact |
| `apps/api/src/modules/equipment/equipment.service.ts` | service | CRUD + batch | Existing `equipment.service.ts` (same file) | exact |
| `apps/api/src/modules/equipment/equipment.controller.ts` | controller | request-response | Existing `equipment.controller.ts` (same file) | exact |
| `apps/api/src/modules/equipment/equipment.predictor.ts` | service | batch | Existing `equipment.predictor.ts` (same file) | exact |
| `apps/api/src/modules/organization/organization.service.ts` | service | CRUD | Existing `organization.service.ts` (same file) | exact |
| `apps/api/prisma/schema.prisma` | config | data-model | Existing `schema.prisma` (same file) | exact |
| `packages/shared/src/schemas/door.schema.ts` | schema | validation | Existing `door.schema.ts` (same file) | exact |
| `packages/shared/src/schemas/incident.schema.ts` | schema | validation | Existing `incident.schema.ts` (same file) | exact |
| `packages/shared/src/schemas/visitor.schema.ts` | schema | validation | Existing `visitor.schema.ts` (same file) | exact |
| `packages/shared/src/schemas/equipment.schema.ts` | schema | validation | Existing `equipment.schema.ts` (same file) | exact |
| `packages/shared/src/schemas/analytics.schema.ts` | schema | validation | Existing `analytics.schema.ts` (same file) | exact |
| `packages/shared/src/schemas/access.schema.ts` | schema | validation | Existing `access.schema.ts` (same file) | exact |
| `packages/shared/src/schemas/vehicle.schema.ts` | schema | validation | Existing `vehicle.schema.ts` (same file) | exact |
| `packages/shared/src/constants/index.ts` | utility | config | Same file | exact |
| `packages/shared/src/index.ts` | utility | barrel-export | Same file | exact |
| `apps/dashboard/app/(dashboard)/portes/page.tsx` | component | request-response | Same file | exact |
| `apps/dashboard/app/(dashboard)/incidents/page.tsx` | component | request-response | Same file | exact |
| `apps/dashboard/app/(dashboard)/incidents/[id]/page.tsx` | component | request-response | Same file | exact |
| `apps/dashboard/app/(dashboard)/visiteurs/page.tsx` | component | request-response | Same file | exact |
| `apps/dashboard/app/(dashboard)/vehicules/page.tsx` | component | request-response | Same file | exact |
| `apps/dashboard/app/(dashboard)/acces/page.tsx` | component | request-response | Same file | exact |
| `apps/dashboard/app/(dashboard)/analytique/page.tsx` | component | request-response | Same file | exact |
| `apps/dashboard/app/(dashboard)/equipement/page.tsx` | component | request-response | Same file | exact |
| `apps/dashboard/lib/api.ts` | utility | request-response | Same file | exact |
| `apps/dashboard/components/door-threshold-config.tsx` | component | request-response | `portes/page.tsx` DoorCard + alert config modal | role-match |
| `apps/dashboard/components/sla-profile-grid.tsx` | component | request-response | `pages/parametres` org settings pattern | pattern-match |
| `apps/dashboard/components/sla-status-badge.tsx` | component | request-response | `Badge` shadcn/ui component pattern | partial |
| `apps/dashboard/components/evidence-bundle-list.tsx` | component | request-response | Incidents evidence section (service pattern) | partial |
| `apps/dashboard/components/escalation-chain-editor.tsx` | component | request-response | Org member multi-select pattern | partial |
| `apps/dashboard/components/visitor-approval-panel.tsx` | component | request-response | Existing prereg form + host dropdown | role-match |
| `apps/dashboard/components/anpr-confidence-slider.tsx` | component | request-response | Door threshold slider pattern | pattern-match |
| `apps/dashboard/components/allowlist-blocklist-table.tsx` | component | request-response | Existing ANPR vehicle list tables | exact |
| `apps/dashboard/components/credential-lifecycle-form.tsx` | component | request-response | `access.schema.ts` createCredentialSchema | role-match |
| `apps/dashboard/components/credential-status-badge.tsx` | component | request-response | Door state badges + Badge shadcn/ui | pattern-match |
| `apps/dashboard/components/health-score-gauge.tsx` | component | request-response | Phase 6 `DonutChart` component | role-match |
| `apps/dashboard/components/device-health-card.tsx` | component | request-response | DoorCard from `portes/page.tsx` | role-match |
| `apps/dashboard/components/site-health-card.tsx` | component | request-response | GlassCard + MetricHero pattern | role-match |
| `apps/dashboard/components/health-threshold-config.tsx` | component | request-response | Door threshold config modal pattern | role-match |
| `apps/dashboard/components/zone-metrics-grid.tsx` | component | request-response | Analytics page MetricHero grid pattern | role-match |
| `apps/dashboard/components/trend-chart.tsx` | component | request-response | Phase 6 `Sparkline` component | exact |
| `apps/dashboard/components/heatmap-grid.tsx` | component | request-response | Tailwind CSS grid pattern (no analog) | no-analog |
| `apps/mobile/app/(tabs)/incidents.tsx` | component | request-response | Same file (placeholder → full) | exact |
| `apps/mobile/app/(tabs)/_layout.tsx` | layout | config | Same file | exact |
| `apps/mobile/app/incident/[id].tsx` | component | request-response | `mobile/app/cameras/[id].tsx` or similar | pattern-match |
| `apps/mobile/app/portes.tsx` | component | request-response | `mobile/app/cameras.tsx` route pattern | pattern-match |
| `apps/mobile/components/mobile-incident-card.tsx` | component | request-response | Existing mobile card components | pattern-match |
| `apps/mobile/components/mobile-door-card.tsx` | component | request-response | Existing mobile card components | pattern-match |
| `apps/mobile/lib/api.ts` | utility | request-response | Existing `mobile/lib/api.ts` | exact |

## Pattern Assignments

### `apps/api/src/modules/door/door-state-machine.ts` (service, event-driven)

**Analog:** Same file (extend existing). Core state machine already correct per D-02.

**Per-door config lookup pattern** — Modify `getOrCreateMachine()` in `door.service.ts` to read new columns:
```typescript
// Source: apps/api/src/modules/door/door.service.ts lines 542-555 (current pattern)
// Extend to read new columns:
private getOrCreateMachine(doorId: string, door: { heldOpenThresholdMs: number | null; settlingTimeoutMs: number | null }): DoorStateMachine {
  let machine = this.machines.get(doorId);
  if (!machine) {
    const config: DoorAlertConfig = {
      ...DEFAULT_ALERT_CONFIG,
      // Per-door columns override defaults; null falls back to DEFAULT
      ...(door.heldOpenThresholdMs != null && { heldOpenThresholdMs: door.heldOpenThresholdMs }),
      ...(door.settlingTimeoutMs != null && { settlingTimeoutMs: door.settlingTimeoutMs }),
    };
    machine = new DoorStateMachine(doorId, config);
    this.machines.set(doorId, machine);
  }
  return machine;
}
```

**Config interface** (already exists, lines 5-11):
```typescript
export interface DoorAlertConfig {
  heldOpenThresholdMs: number;
  forcedOpenImmediate: boolean;
  unsecuredImmediate: boolean;
  settlingTimeoutMs: number;
  desyncMaxRetries: number;
}
```

---

### `apps/api/src/modules/door/door.service.ts` (service, event-driven + CRUD)

**Analog:** Same file. Core MQTT handler, alert config update, state queries.

**Redis-persisted sequence dedup pattern** (D-03) — extend current in-memory `lastSequence` (line 41):
```typescript
// Current: private lastSequence = new Map<string, number>(); (line 41)
// Enhancement: persist to Redis on each valid message
// In handleDoorStateEvent(), after validating sequence (lines 120-127):
// On valid sequence:
const seqKey = `door:seq:${doorId}`;
await this.redis.setex(seqKey, 86400, String(message.sequence));
// On startup (new method):
async restoreSequences() {
  const keys = await this.redis.keys('door:seq:*');
  for (const key of keys) {
    const doorId = key.replace('door:seq:', '');
    const seq = await this.redis.get(key);
    if (seq) this.lastSequence.set(doorId, parseInt(seq, 10));
  }
}
```

**Per-door threshold update endpoint pattern** — follow `updateAlertConfig()` (lines 475-510):
```typescript
// Extend to write to both columns AND keep alertConfig JSON for backward compat:
async updateThresholdConfig(doorId: string, config: { heldOpenThresholdMs?: number; settlingTimeoutMs?: number }) {
  const door = await this.prisma.door.findUnique({ where: { id: doorId } });
  if (!door) throw new NotFoundException('Door not found');

  // Validate ranges
  if (config.heldOpenThresholdMs !== undefined) {
    if (config.heldOpenThresholdMs < 100 || config.heldOpenThresholdMs > 30000) {
      throw new BadRequestException('heldOpenThresholdMs must be 100-30000');
    }
  }
  // Update both dedicated columns + JSON alertConfig for backward compat
  await this.prisma.door.update({
    where: { id: doorId },
    data: {
      heldOpenThresholdMs: config.heldOpenThresholdMs,
      settlingTimeoutMs: config.settlingTimeoutMs,
      alertConfig: { ...(door.alertConfig as any), ...config } as any,
    },
  });
  // Update in-memory machine
  const machine = this.machines.get(doorId);
  if (machine) {
    Object.assign(machine.config, config);
  }
}
```

---

### `apps/api/src/modules/door/door.processor.ts` (processor, event-driven)

**Analog:** Same file. Alert evaluation with Redis cooldown.

**Redis cooldown dedup pattern** (lines 49-59):
```typescript
// Existing: 60s cooldown prevents duplicate alerts for same door+state
const cooldownKey = `door:alert:cooldown:${doorId}:${state}`;
const isOnCooldown = await this.redis.get(cooldownKey);
if (isOnCooldown) {
  this.logger.debug(`Alert cooldown active for door ${doorId} (${state}), skipping`);
  return { skipped: true, reason: "cooldown" };
}
await this.redis.setex(cooldownKey, 60, "1");
```

**Tenant context wrapper** (line 47):
```typescript
return withTenantContext(this.prisma, orgId, async () => {
  // ... DB operations within tenant scope
});
```

---

### `apps/api/src/modules/incident/incident.service.ts` (service, CRUD + event-driven)

**Analog:** Same file. 728 lines of existing SLA, evidence, PDF, event bus patterns.

**SLA profile lookup pattern** (D-04) — add new method (follow existing `create` at lines 72-104):
```typescript
// New: resolve SLA from org settings
async getSlaConfig(orgId: string, severity: string) {
  const org = await this.prisma.organization.findUnique({
    where: { id: orgId },
    select: { slaProfiles: true },
  });
  const profiles = (org?.slaProfiles as Record<string, any>) ?? {};
  return profiles[severity] ?? { targetMinutes: 30, escalationUserIds: [] };
}

// Modify create() to use SLA profiles:
// Replace hardcoded slaMinutes: 30 with:
const slaConfig = await this.getSlaConfig(dto.organizationId, dto.severity);
// Then in create call: slaMinutes: slaConfig.targetMinutes,
```

**Evidence auto-bundling pattern** (D-05) — new method following `addEvidence()` (lines 322-366):
```typescript
// New: auto-bundle evidence on closure
async autoBundleEvidence(incidentId: string): Promise<number> {
  const incident = await this.prisma.incident.findUnique({
    where: { id: incidentId },
    select: { createdAt: true, organizationId: true },
  });
  if (!incident) return 0;

  const startWindow = new Date(incident.createdAt.getTime() - 5 * 60 * 1000);
  const endWindow = new Date(incident.createdAt.getTime() + 5 * 60 * 1000);

  // Parallel queries across hypertables (Pattern 3 from RESEARCH.md)
  const [accessEvents, alerts, videoClips] = await Promise.all([
    this.prisma.$queryRaw<Array<any>>`
      SELECT id, time, door_id, decision FROM access_events
      WHERE time >= ${startWindow}::timestamptz AND time <= ${endWindow}::timestamptz
      AND organization_id = ${incident.organizationId}::uuid LIMIT 50
    `,
    this.prisma.alert.findMany({
      where: { createdAt: { gte: startWindow, lte: endWindow }, organizationId: incident.organizationId },
      take: 50,
    }),
    this.prisma.$queryRaw<Array<any>>`
      SELECT id, camera_id, time FROM video_clips
      WHERE time >= ${startWindow}::timestamptz AND time <= ${endWindow}::timestamptz
      AND organization_id = ${incident.organizationId}::uuid LIMIT 50
    `,
  ]);
  // Create IncidentEvidence records
  let attached = 0;
  for (const event of accessEvents as any[]) {
    await this.addEvidence(incidentId, {
      type: 'access_event', eventType: event.decision,
      eventId: event.id, description: `Access event ${event.decision} at door ${event.door_id}`,
    }, 'system');
    attached++;
  }
  // ... same for alerts and video clips
  return attached;
}
```

**Redis dedup for SLA timers** (D-06) — follow `handleAlertCreated()` dedup (lines 680-689):
```typescript
// In assignIncident() and onModuleInit(), wrap SLA scheduling:
const dedupKey = `incident:sla:dedup:${incidentId}:${level}`;
const alreadyScheduled = await this.redis.get(dedupKey);
if (alreadyScheduled) {
  this.logger.debug(`SLA timer already scheduled for incident ${incidentId}`);
  return;
}
await this.redis.setex(dedupKey, 3600, '1');
```

---

### `apps/api/src/modules/incident/incident.processor.ts` (processor, event-driven)

**Analog:** Same file. Auto-triage and SLA escalation workers.

**SLA escalation with job dedup** — enhance existing `handleSlaEscalation()` (lines 111-161):
```typescript
// Add stalled job detection + retry support
// BullMQ WorkerHost already handles retries, add:
private async handleSlaEscalation(data: { incidentId: string; level: number; notifyUserId?: string }) {
  // Check if already processed
  const dedupKey = `incident:sla:executed:${data.incidentId}:${data.level}`;
  const executed = await this.redis.get(dedupKey);
  if (executed) {
    return { skipped: true, reason: 'already-escalated' };
  }
  // ... proceed with escalation ...
  await this.redis.setex(dedupKey, 86400, '1');
  // Log to incident timeline on failure
}
```

---

### `apps/api/src/modules/visitor/visitor.service.ts` (service, CRUD)

**Analog:** Same file. Full visitor CRUD with check-in/check-out/cancel.

**Host approval workflow** (D-07) — extend `preregister()` (lines 67-212):
```typescript
// Add host approval status on visit creation
// New method:
async requestHostApproval(visitId: string) {
  const visit = await this.prisma.visit.findUnique({
    where: { id: visitId },
    include: { visitor: true, host: true },
  });
  if (!visit) throw new NotFoundException('Visit not found');
  if (visit.approvalStatus !== 'pending') {
    throw new BadRequestException(`Approval already ${visit.approvalStatus}`);
  }
  // Send email via Resend (follow InviteService.sendInviteEmail pattern)
  await this.sendApprovalEmail(visit.host.email, visit);
  this.logger.log(`Approval request sent for visit ${visitId}`);
}

// Also add to Visit model: approvalStatus, hostApprovedAt, approvedById, timedPass fields
```

---

### `apps/api/src/modules/anpr/anpr.service.ts` (service, CRUD + event-driven)

**Analog:** Same file. PaddleOCR integration, allowlist/blocklist, event recording.

**Per-org confidence threshold** (D-10) — add to `processFrame()` (lines 176-198):
```typescript
// New: resolve confidence threshold from org settings
async getConfidenceThreshold(orgId: string): Promise<number> {
  const org = await this.prisma.organization.findUnique({
    where: { id: orgId },
    select: { anprConfidenceThreshold: true },
  });
  return org?.anprConfidenceThreshold ?? 70; // default 70%
}

// Modify processFrame() to filter by threshold:
async processFrame(frame: string, cameraId: string, organizationId: string, imageUrl?: string) {
  const threshold = await this.getConfidenceThreshold(organizationId);
  const plates = await this.analyzePlate(frame, cameraId);

  for (const plateResult of plates) {
    if (plateResult.confidence < threshold) {
      // Log but don't trigger alert — follow existing recordEvent pattern
      await this.recordEvent({ ...plateResultData }, 'MONITOR', 'low-confidence');
      continue;
    }
    // Full evaluation path for plates above threshold
    const evaluation = await this.evaluatePlate(plateResult.plate, organizationId);
    await this.recordEvent({ ... }, evaluation.decision, evaluation.reason);
  }
}
```

---

### `apps/api/src/modules/analytics/analytics.service.ts` (service, CRUD + request-response)

**Analog:** Same file. Zone/site analytics queries using raw SQL with `$queryRawUnsafe`.

**Per-zone metrics** — new methods following existing `getZoneAnalytics()` (lines 22-86):
```typescript
// New: per-zone summary for dashboard
async getZoneMetricsSummary(organizationId: string, from?: string, to?: string) {
  const conditions: string[] = ['zah.organization_id = $1::uuid'];
  const params: any[] = [organizationId];
  let paramIndex = 2;
  if (from) { conditions.push(`zah.bucket >= $${paramIndex}::timestamptz`); params.push(from); paramIndex++; }
  if (to) { conditions.push(`zah.bucket <= $${paramIndex}::timestamptz`); params.push(to); paramIndex++; }

  try {
    return await this.prisma.$queryRawUnsafe(`
      SELECT zah.zone_id, z.name, SUM(zah.denied_count) as denied, SUM(zah.granted_count) as granted,
             SUM(zah.door_anomaly_count) as anomalies
      FROM zone_analytics_hourly zah JOIN zones z ON z.id = zah.zone_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY zah.zone_id, z.name ORDER BY z.name
    `, ...params);
  } catch (err: any) {
    this.logger.warn(`Zone metrics query failed: ${err.message}`);
    return [];
  }
}
```

**The raw SQL query pattern** (lines 60-78):
```typescript
const rows = await this.prisma.$queryRawUnsafe<Array<Record<string, any>>>(
  `SELECT ... FROM zone_analytics_hourly zah ... ${whereClause}
   ORDER BY ... LIMIT 100`,
  ...params,
);
return rows as unknown as ZoneAnalyticsDto[];
```

---

### `apps/api/src/modules/equipment/equipment.service.ts` (service, CRUD + batch)

**Analog:** Same file. Cron-based health checks, Redis debounce, hypertable writes.

**Health score aggregation** (D-15) — new method:
```typescript
// New: per-site health score = weighted average
async getSiteHealthScore(orgId: string): Promise<{
  score: number; totalDevices: number; healthy: number; degraded: number; critical: number;
}> {
  const cameras = await this.getCameraHealth();
  const readers = await this.getReaderHealth();
  const allDevices = [...cameras, ...readers];
  if (allDevices.length === 0) return { score: 100, totalDevices: 0, healthy: 0, degraded: 0, critical: 0 };

  const scored = allDevices.map(d => this.computeDeviceScore(d));
  const totalScore = scored.reduce((sum, s) => sum + s.score, 0);
  return {
    score: Math.round(totalScore / scored.length),
    totalDevices: scored.length,
    healthy: scored.filter(s => s.score >= 70).length,
    degraded: scored.filter(s => s.score >= 40 && s.score < 70).length,
    critical: scored.filter(s => s.score < 40).length,
  };
}

private computeDeviceScore(device: any): { score: number } {
  // Camera: frame drop (inverse), heartbeat recency, connection uptime
  // Reader: response time (inverse), auth failure rate (inverse)
  // Returns 0-100
}
```

**Frame drop rate monitoring** (D-14) — extend `checkCameraHealth()` (lines 26-78):
```typescript
// Add frame drop rate tracking:
const frameDropThreshold = await this.getHealthThreshold(orgId, 'frame_drop_rate');
// In camera health check, query frame_drops from camera_health trend
// Compare against threshold and emit alert if exceeded
```

---

### `apps/api/src/modules/equipment/equipment.predictor.ts` (service, batch)

**Analog:** Same file. Linear regression, configurable thresholds.

**Configurable thresholds** — replace hardcoded `THRESHOLDS` (lines 28-34) with dynamic lookup:
```typescript
// Modify to accept per-org thresholds:
async getThresholds(orgId: string): Promise<typeof this.THRESHOLDS> {
  const org = await this.prisma.organization.findUnique({
    where: { id: orgId },
    select: { healthThresholds: true },
  });
  const custom = (org?.healthThresholds as any) ?? {};
  return {
    ...this.THRESHOLDS,
    ...(custom.frameDropRate != null && { fpsRatio: custom.frameDropRate }),
    ...(custom.responseTimeMs != null && { latencyMs: custom.responseTimeMs }),
    ...(custom.authFailureRate != null && { failedReads: custom.authFailureRate }),
  };
}
```

---

### `apps/api/src/modules/access/access.service.ts` (service, CRUD)

**Analog:** Same file. Full credential CRUD with anti-passback, access evaluation.

**Credential lifecycle** (D-16) — extend with revoke/reissue/expiration:
```typescript
// New: revoke credential with reason + audit
async revokeCredential(id: string, reason: string, revokedBy: string) {
  const credential = await this.getCredential(id);
  // Deactivate + set revocation metadata
  const updated = await this.prisma.credential.update({
    where: { id },
    data: { isActive: false, revokedAt: new Date(), revokedReason: reason, revokedById: revokedBy },
  });
  // Invalidate Redis cache
  await this.redis.del(`credential:revoked:${id}`);
  // Emit event for audit
  this.eventEmitter.emit('credential.revoked', { credentialId: id, reason, revokedBy });
  return updated;
}

// New: reissue credential (revoke old, issue new with same settings)
async reissueCredential(id: string, newExpiry: string, reissuedBy: string) {
  const old = await this.getCredential(id);
  await this.revokeCredential(id, 'Reissued', reissuedBy);
  return this.createCredential({
    userId: old.userId, type: old.type,
    validUntil: newExpiry, ...(old.badgeNumber && { badgeNumber: old.badgeNumber }),
  });
}
```

---

### `apps/api/prisma/schema.prisma` (config, data-model)

**Analog:** Same file. All model definitions follow existing patterns.

**New columns pattern** (follow existing Door model lines 114-133):
```prisma
/// Add to Door model:
model Door {
  // ... existing fields ...
  heldOpenThresholdMs  Int?     // New D-02: nullable, fallback to DEFAULT_ALERT_CONFIG
  settlingTimeoutMs    Int?     // New D-02: nullable, fallback to DEFAULT_ALERT_CONFIG
}

/// Add to Organization model:
model Organization {
  // ... existing fields ...
  slaProfiles            Json?  @default("{}")  // D-04: per-severity SLA config
  anprConfidenceThreshold Int?  @default(70)     // D-10: ANPR confidence threshold %
  healthThresholds       Json?  @default("{}")  // D-14: health monitoring thresholds
}

/// Add to Visit model (extend existing):
model Visit {
  // ... existing fields ...
  approvalStatus  String?   @default("pending") // D-07: pending/approved/denied
  approvedById    String?
  approvedAt      DateTime?
  timeWindowStart DateTime?
  timeWindowEnd   DateTime?
}

/// Add to Credential model (extend existing):
model Credential {
  // ... existing fields ...
  revokedAt        DateTime?
  revokedReason    String?
  revokedById      String?
  issuedAt         DateTime?  @default(now())
  lastAccessedAt   DateTime?
}
```

---

### `packages/shared/src/schemas/` (schema, validation)

**Analog:** Same directory pattern. Each schema is a `.ts` file exporting Zod schemas + inferred types.

**New schemas pattern** (follow `door.schema.ts` lines 1-13):
```typescript
import { z } from "zod";

export const slaProfileSchema = z.object({
  slaProfiles: z.object({
    CRITICAL: z.object({ targetMinutes: z.literal(15), escalationUserIds: z.array(z.string().uuid()) }),
    HIGH: z.object({ targetMinutes: z.literal(30), escalationUserIds: z.array(z.string().uuid()) }),
    MEDIUM: z.object({ targetMinutes: z.literal(120), escalationUserIds: z.array(z.string().uuid()) }),
    LOW: z.object({ targetMinutes: z.literal(480), escalationUserIds: z.array(z.string().uuid()) }),
  }),
});

export const doorThresholdConfigSchema = z.object({
  heldOpenThresholdMs: z.number().int().min(100).max(30000).optional(),
  settlingTimeoutMs: z.number().int().min(100).max(60000).optional(),
});

export const anprConfidenceSchema = z.object({
  confidenceThreshold: z.number().int().min(50).max(100),
});

export const credentialLifecycleSchema = z.object({
  type: z.enum(['BADGE', 'PIN', 'MOBILE', 'QR']),
  userId: z.string().uuid(),
  badgeNumber: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  zoneRestrictions: z.array(z.string().uuid()).optional(),
  notes: z.string().optional(),
  isTemporary: z.boolean().optional(),
});

export const evidenceBundleSchema = z.object({
  incidentId: z.string().uuid(),
  eventIds: z.array(z.string().uuid()).optional(),
});

export type SlaProfileInput = z.infer<typeof slaProfileSchema>;
export type DoorThresholdConfigInput = z.infer<typeof doorThresholdConfigSchema>;
export type AnprConfidenceInput = z.infer<typeof anprConfidenceSchema>;
export type CredentialLifecycleInput = z.infer<typeof credentialLifecycleSchema>;
export type EvidenceBundleInput = z.infer<typeof evidenceBundleSchema>;
```

**Barrel export pattern** — follow `packages/shared/src/index.ts` (lines 1-60):
```typescript
// Add section headers and grouped exports:
// Schemas - Door
export { doorThresholdConfigSchema } from "./schemas/door.schema";
export type { DoorThresholdConfigInput } from "./schemas/door.schema";

// Schemas - Incident
export { slaProfileSchema, evidenceBundleSchema } from "./schemas/incident.schema";
export type { SlaProfileInput, EvidenceBundleInput } from "./schemas/incident.schema";

// ... etc
```

---

### `apps/dashboard/app/(dashboard)/portes/page.tsx` (component, request-response)

**Analog:** Same file. Door surveillance with Socket.IO, alert config modal, filters.

**Door threshold config UI** — integrate `DoorThresholdConfig` component, following existing alert config modal (lines 588-631):
```typescript
// Replace the simple Alert Config modal with DoorThresholdConfig component
// Follow same pattern: set showThresholdConfig state, render inline or dialog
//
// The existing modal at lines 588-631 provides the template:
// - Fixed overlay with backdrop
// - Card/container with heading and close button  
// - Input fields + Save/Cancel buttons
// - Toast on success/error
```

---

### `apps/dashboard/components/trend-chart.tsx` (component, request-response) — NEW

**Analog:** Phase 6 `Sparkline` component (`sparkline.tsx` lines 1-79).

**Pattern** — follow Sparkline for SVG architecture, enlarge for TrendChart:
```typescript
// Source: apps/dashboard/components/sparkline.tsx lines 8-79
// Key patterns to copy:
// - Pure SVG rendering (no canvas)
// - PolyLine for data series
// - Linear gradient fill underneath
// - preserveAspectRatio for responsive sizing
// - accepts className via cn()
//
// Extend to TrendChart with:
// - X/Y axis labels using SVG <text> elements
// - Grid lines (horizontal reference lines)
// - Date range selector (7d/30d/90d pill buttons)
// - motion path drawing animation (motion.path with initial/animate)
// - Multiple data series (stroke colors array)
```

**SVG line chart core** — from `sparkline.tsx` lines 22-77:
```typescript
const points = data.map((val, i) => {
  const x = i * step + 5;
  const y = height - ((val - min) / range) * (height - 4) - 2;
  return `${x},${y}`;
}).join(" ");
// PolyLine for data series + gradient fill underneath
```

---

### `apps/dashboard/components/health-score-gauge.tsx` (component, request-response) — NEW

**Analog:** Phase 6 `DonutChart` component (`donut-chart.tsx` lines 1-66). CSS conic-gradient gauge.

**Pattern** — CSS conic-gradient (following UI-SPEC), not SVG:
```typescript
// Source: UI-SPEC visual contract — "CSS conic-gradient ring, 100px diameter"
// Center displays numeric score in JetBrains Mono 24px 600
// Color bands: 0-40% red, 41-69% amber, 70-100% emerald
// 
// Implement with:
const score = Math.min(100, Math.max(0, props.score));
const color = score >= 70 ? 'hsl(160 84% 39%)' : score >= 40 ? 'hsl(35 92% 50%)' : 'hsl(0 84% 60%)';
<div
  role="meter"
  aria-valuenow={score}
  aria-valuemin={0}
  aria-valuemax={100}
  style={{
    background: `conic-gradient(${color} ${score}%, transparent ${score}%)`,
  }}
  className="rounded-full"
>
  <span className="font-mono tabular-nums text-2xl font-semibold">{score}</span>
</div>
```

---

### `apps/dashboard/components/heatmap-grid.tsx` (component, request-response) — NEW

**No analog found.** Pure CSS grid 24×7 heatmap. Use Tailwind CSS grid with dynamic bg-opacity.

**Pattern** — CSS Grid + `cn()` utility:
```tsx
// 24 columns (hours) × 7 rows (days)
// Cell opacity based on value intensity: bg-primary at varying opacity
// Tooltip on hover: aria-label packed with data
// No canvas, no SVG — just Tailwind + CSS Grid

// Implementation sketch:
<div className="grid grid-cols-24 gap-0.5">
  {heatmapData.map((row, dayIdx) =>
    row.hours.map((val, hourIdx) => (
      <div
        key={`${dayIdx}-${hourIdx}`}
        className="h-4 w-4 rounded"
        style={{ backgroundColor: `hsl(var(--primary) / ${val / maxVal})` }}
        aria-label={`${hourIdx}:00 — ${dayLabels[dayIdx]} — ${val} événements`}
      />
    ))
  )}
</div>
```

---

### `apps/mobile/app/(tabs)/incidents.tsx` (component, request-response) — REWRITE

**Analog:** Same file (currently a placeholder). Follow existing mobile screen patterns.

**Pattern** — follow Phase 6 mobile card-based list pattern:
```typescript
// Follow existing placeholders for structure (lines 1-56)
// Use FlatList for incident list (from React Native)
// Use StyleSheet.create() for styles at bottom
// Follow @repo/design colors/typography tokens

// For status transitions:
// - Buttons call API (fetchWithAuth from mobile/lib/api.ts)
// - Optimistic UI update on button press
// - Toast on success, error state on failure
// - Large touch targets (min 44px), full-width buttons
```

---

### `apps/mobile/components/mobile-incident-card.tsx` (component, request-response) — NEW

**Analog:** Follow existing mobile component patterns (cards from other screens).

**Pattern** — following `mobile/app/(tabs)/incidents.tsx` placeholder card structure:
```tsx
// From existing placeholder pattern:
import { View, Text, StyleSheet } from "react-native";
import { colors, typography } from "@repo/design";

// Card component:
<View style={styles.card}>
  <View style={styles.header}>
    <Badge severity={incident.severity} />
    <Text style={styles.title}>{incident.title}</Text>
  </View>
  <Text style={styles.meta}>{incident.zoneName} · {timeAgo(incident.createdAt)}</Text>
  {/* SLA countdown badge */}
  {/* Status indicator */}
</View>
```

---

## Shared Patterns

### Authentication / Authorization
**Source:** `apps/api/src/modules/incident/incident.controller.ts` lines 30-38, `apps/api/src/modules/door/door.controller.ts` lines 29-37
**Apply to:** All API controller files (new/modified endpoints)
```typescript
@Post()
@Roles("ADMIN", "SUPERVISOR", "OPERATOR")  // Role guard
async create(@Body(new ZodValidationPipe(schema)) body: any, @Req() req: FastifyRequest) {
  const user = (req as any).user;  // Extract user from JWT
  return this.service.method(body, user.id);
}
```
- All new POST/PATCH endpoints use `@Roles()` decorator
- All new GET endpoints use `@Roles("ADMIN", "SUPERVISOR", "OPERATOR", "VIEWER")`
- Credential lifecycle endpoints additionally use `@Audited()` decorator

### Validation (Zod + class-validator dual pattern)
**Source:** `packages/shared/src/schemas/door.schema.ts` lines 1-13
**Apply to:** All new schemas in `packages/shared/src/schemas/`
```typescript
import { z } from "zod";
export const mySchema = z.object({ ... });
export type MyInput = z.infer<typeof mySchema>;
```
**Controller consumption** — from `incident.controller.ts` line 33:
```typescript
@Body(new ZodValidationPipe(mySchema)) body: any
```
**Barrel export** — from `packages/shared/src/index.ts` lines 1-3:
```typescript
export { mySchema } from "./schemas/my.schema";
export type { MyInput } from "./schemas/my.schema";
```

### Tenant-Scoped Raw SQL Queries
**Source:** `apps/api/src/modules/analytics/analytics.service.ts` lines 37-78
**Apply to:** AnalyticsService, EquipmentService (hypertable queries)
```typescript
const conditions: string[] = [];
const params: any[] = [];
let paramIndex = 1;

if (organizationId) {
  conditions.push(`table.org_id = $${paramIndex}::uuid`);
  params.push(organizationId);
  paramIndex++;
}
// Build WHERE, then: this.prisma.$queryRawUnsafe(`SELECT ... ${whereClause}`, ...params)
```

### Redis Dedup Pattern
**Source:** `apps/api/src/modules/incident/incident.service.ts` lines 680-689
**Apply to:** SLA scheduling, door events, auto-triage
```typescript
const dedupKey = `module:action:dedup:${entityId}`;
const alreadyProcessed = await this.redis.get(dedupKey);
if (alreadyProcessed) {
  this.logger.debug(`...skipped (already processed)`);
  return;
}
await this.redis.setex(dedupKey, 3600, "1");
// Then proceed with operation
```

### Event Bus Listener Pattern
**Source:** `apps/api/src/modules/incident/incident.service.ts` lines 665-699
**Apply to:** Auto-triage, visitor approval, credential events
```typescript
@OnEvent("event.name", { async: true })
async handleEvent(payload: { ... }) {
  // Check conditions
  // Dedup check
  // Enqueue job or execute logic
}
```

### BullMQ Worker Pattern
**Source:** `apps/api/src/modules/incident/incident.processor.ts` lines 8-28
**Apply to:** All processor files
```typescript
@Processor("queue-name")
export class MyProcessor extends WorkerHost {
  private readonly logger = new Logger(MyProcessor.name);
  constructor(private prisma: PrismaService, ...) { super(); }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case "job-type": return this.handleJob(job.data);
      default: this.logger.warn(`Unknown job: ${job.name}`);
    }
  }
}
```

### Phase 6 Design System Component Pattern
**Source:** `apps/dashboard/components/glass-card.tsx` lines 1-33
**Apply to:** All new dashboard components
```typescript
"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { itemVariants } from "@/components/page-transition";

interface Props { className?: string; ... }
export function MyComponent({ className, ... }: Props) {
  return (
    <motion.div variants={itemVariants} className={cn("...tailwind...", className)}>
      {children}
    </motion.div>
  );
}
```

### Mobile Screen Pattern
**Source:** `apps/mobile/app/(tabs)/incidents.tsx` lines 1-56 (structure)
**Apply to:** All new mobile screens
```typescript
import { View, Text, StyleSheet } from "react-native";
import { colors, typography } from "@repo/design";

export default function MyScreen() {
  return (
    <View style={styles.container}>
      {/* Screen content */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  // ... additional styles
});
```

### Resend Email Pattern (Visitor Approval)
**Source:** `apps/api/src/modules/organization/invite/invite.service.ts` lines 302-341
**Apply to:** Visitor host approval emails
```typescript
private async sendApprovalEmail(hostEmail: string, visit: any) {
  if (!this.resend) {
    this.logger.warn(`Resend not configured — approval email not sent`);
    return;
  }
  try {
    await this.resend.emails.send({
      from: this.emailFrom,
      to: hostEmail,
      subject: `Nouvelle demande de visite — ${visit.visitor.firstName} ${visit.visitor.lastName}`,
      html: this.buildApprovalEmailHtml(visit),
    });
    this.logger.log(`Approval email sent to ${hostEmail}`);
  } catch (error: any) {
    this.logger.error(`Failed to send approval email: ${error.message}`);
  }
}
```

### Dashboard API Client Pattern
**Source:** `apps/dashboard/lib/api.ts` lines 1-100
**Apply to:** New API functions for analytics, equipment health, config
```typescript
// Follow existing function pattern:
export async function fetchZoneMetrics(orgId: string): Promise<ZoneMetricsDto[]> {
  const res = await fetchWithAuth(`${API_URL}/api/analytics/zones?orgId=${orgId}`);
  if (!res.ok) throw new Error("Erreur de chargement des métriques");
  return res.json();
}
```

---

## No Analog Found

Files with no close match in the codebase (planner should use UI-SPEC.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/dashboard/components/heatmap-grid.tsx` | component | request-response | No existing CSS grid heatmap — pure Tailwind CSS grid with dynamic opacity |
| `apps/dashboard/components/sla-profile-grid.tsx` | component | request-response | Editable table with severity rows — closest is org settings form pattern |
| `apps/dashboard/components/escalation-chain-editor.tsx` | component | request-response | Multi-select user picker — no exact existing pattern |
| `apps/dashboard/components/evidence-bundle-list.tsx` | component | request-response | Incidents evidence section exists in service but no UI component |
| `apps/dashboard/components/sla-status-badge.tsx` | component | request-response | New combined time-elapsed/target display badge |

## Metadata

**Analog search scope:** `apps/api/src/modules/`, `apps/dashboard/components/`, `apps/dashboard/app/(dashboard)/`, `apps/mobile/app/`, `packages/shared/src/`
**Files scanned:** ~45 key source files
**Pattern extraction date:** 2026-07-16
