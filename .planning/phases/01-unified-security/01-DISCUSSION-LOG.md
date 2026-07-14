# Phase 1: Unified Security - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-14
**Phase:** 01-unified-security
**Areas discussed:** MQTT Transport, Door State Machine, Credential Model, Access Levels, Video Correlation, Audit Architecture, Tailgating Detection, TimescaleDB+Prisma, Event Bus

---

## Mode

Auto mode — all decisions auto-selected from research-backed recommendations.

---

## MQTT Transport & Device Integration

| Option | Description | Selected |
|--------|-------------|----------|
| MQTT.js custom NestJS transport | Native protocol for door controllers, no additional broker | ✓ |
| Kafka messaging | General-purpose event streaming, overengineered for device integration | |
| Raw WebSocket | Custom protocol, no industry standard support | |

**Auto-selected:** MQTT.js 5.15.2 — recommended because it's the native protocol of Mercury, Axis, and HID door controllers. Build protocol adapter for manufacturer-specific topic schemas.

---

## Door State Machine

| Option | Description | Selected |
|--------|-------------|----------|
| Event-sourced state machine with sequence numbers | Validated transitions, out-of-sequence protection, explicit states | ✓ |
| Simple boolean (locked/unlocked) | Minimal implementation but destroys operator trust | |
| Database-triggered state | Enforced in DB but requires DB-aware door controllers | |

**Auto-selected:** Event-sourced state machine — research flagged boolean state as the most common critical mistake in access control software. Sequence numbers prevent MQTT ordering issues from generating false alerts.

---

## Credential Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| Polymorphic credential types | Base table with badge/PIN/mobile/QR variants, single User mapping | ✓ |
| Separate tables per credential type | No shared fields, complex joins | |
| Single flat table | All credential types in one row, nullable fields proliferate | |

**Auto-selected:** Polymorphic base table — balances normalization with query simplicity. Mobile credentials via QR scanning for Phase 1; wallet-based NFC deferred to Phase 2.

---

## Access Levels & Zone Rules

| Option | Description | Selected |
|--------|-------------|----------|
| Zone × Schedule intersection matrix | Union of assigned access levels, cached evaluation | ✓ |
| Individual rule evaluation | No caching, N rules per request | |
| RBAC-only | Role-based gates, no zone/schedule dimensions | |

**Auto-selected:** Zone × Schedule matrix — provides the granularity security operators expect. Holiday overrides and emergency modes supported from the start.

---

## Video-Event Correlation

| Option | Description | Selected |
|--------|-------------|----------|
| Async correlation via BullMQ | Access decision immediate (<100ms), video correlation async after | ✓ |
| Synchronous correlation | Wait for video frame before granting access — blocks physical safety | |
| Batch correlation | Periodic scan of event log, loose coupling but delayed evidence | |

**Auto-selected:** Async via BullMQ — non-negotiable per research. Physical access decisions cannot wait for video processing. Camera-to-door mapping as a first-class data model.

---

## Audit Log Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| TimescaleDB hypertable + pgcrypto hash chains | Automatic partitioning, compression, retention, crypto integrity | ✓ |
| Prisma model + application-level integrity | Single ORM, no extension dependency, but unbounded growth | |
| Separate audit database (immudb) | Maximum integrity, separate infrastructure, deployment complexity | |

**Auto-selected:** TimescaleDB hypertable — research showed Prisma migrations silently destroy TimescaleDB configuration, so strict separation is required. Separate SQL migration directory for time-series DDL.

---

## Tailgating Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Extend existing Ollama inference pipeline | New detection path in frame-processing queue, reuses vision model | ✓ |
| Separate ML model for tailgating | Dedicated model, higher accuracy but new infrastructure | |
| Rule-based person counting | No AI, simple frame differencing, high false positive rate | |

**Auto-selected:** Extend existing pipeline — Ollama/moondream already running for frame analysis. Tailgating is a new prompt + detection type, not new infrastructure.

---

## Claude's Discretion

- BullMQ queue naming (`access-events`, `door-alerts`, `audit-write`)
- API endpoint structure following NestJS conventions
- Credential validation logic implementation details
- Schedule caching strategy (Redis)
- MQTT topic schema normalization
- Specific alert thresholds (adjustable via config)

## Deferred Ideas

- OSDP support → Phase 2+ (Wiegand is Phase 1 minimum)
- Wallet-based NFC credentials → Phase 2 (QR scanning for Phase 1)
- Visitor management → Phase 2
- Incident management full lifecycle → Phase 2
- ANPR/LPR → Phase 2
- AI assistant → Phase 2
- Equipment health beyond door controllers → Phase 3
- Security analytics dashboards → Phase 3
- Risk scoring → Phase 3
- Maintenance workflows → Phase 3
- Biometric credentials → v2
