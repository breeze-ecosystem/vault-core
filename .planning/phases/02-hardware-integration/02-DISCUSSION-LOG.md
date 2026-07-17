# Phase 2: Hardware Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 2-Hardware Integration
**Areas discussed:** OSDP Security, Camera Onboarding Flow, Door Control UX, PTZ Control Design, Event Journal Detail, Camera↔Door Association, Command Reliability, Bulk Operations, ONVIF Event Subscriptions, Dashboard Hardware Views, Existing Camera Migration, PTZ Access Control, OSDP Controller Enrollment, Event Retention

---

## OSDP Security

| Option | Description | Selected |
|--------|-------------|----------|
| Encrypt where possible | OSDP Secure Channel where supported, fallback to plain for older hardware | ✓ |
| Plain OSDP sufficient | RS-485 bus is physically secured, MQTT layer already has TLS | |

**User's choice:** Encrypt where possible
**Notes:** Prioritized security without breaking compatibility with older controllers.

---

## Camera Onboarding Flow

| Question | Options | Selected |
|----------|---------|----------|
| Discovery model | Fully automatic / Semi-automatic (pending review) | **Fully automatic** |
| Organization model | Group by site location / Flat list | **Group by site location** |

**User's choice:** Fully automatic + site-based grouping
**Notes:** "Zero manual IP configuration" from success criteria drives the fully automatic approach. Location metadata from ONVIF where available.

---

## Door Control UX

| Question | Options | Selected |
|----------|---------|----------|
| Interaction style | Quick-action buttons / Confirmed actions | **Quick-action buttons** |
| Zone changes | Inline dropdown / Dedicated zone management page | **Inline dropdown** |

**User's choice:** Quick-action one-click + inline zone dropdown
**Notes:** Confirmation toast instead of modal dialog. Leverages existing Door.zoneId FK and Door state machine.

---

## PTZ Control Design

| Question | Options | Selected |
|----------|---------|----------|
| Control placement | Integrated overlay / Side panel / Dedicated toolbar | **Integrated overlay on video** |
| Presets style | Thumbnail-based / Named list | **Thumbnail-based presets** |

**User's choice:** Integrated overlay + thumbnail presets
**Notes:** Camera model currently has no PTZ fields — must add during planning.

---

## Event Journal Detail

| Question | Options | Selected |
|----------|---------|----------|
| Detail level | Rich details / Minimal details | **Rich details** |
| Inline snapshots | Yes, inline thumbnails / Text only | **Yes, inline thumbnails** |

**User's choice:** Rich details + inline thumbnails
**Notes:** CameraDoorMap association needed for nearest-camera snapshot capture.

---

## Camera ↔ Door Association

| Option | Description | Selected |
|--------|-------------|----------|
| Manual assignment | Operator assigns 1-2 cameras per door during setup | ✓ |
| Proximity-based auto | System matches via ONVIF FOV metadata | |
| Operator chooses per event | Show all camera feeds, operator selects | |

**User's choice:** Manual assignment
**Notes:** CameraDoorMap join table already exists with priority field — ready to use.

---

## Command Reliability

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-retry with feedback | Sending→Sent→Acknowledged states, retry on timeout, clear failure | ✓ |
| Fire-and-forget | Optimistic success, corrected on next heartbeat | |

**User's choice:** Auto-retry with state feedback
**Notes:** 2-second timeout window, one retry.

---

## Bulk Operations

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — bulk actions | Lock All / Unlock All per zone or site with confirmation | ✓ |
| No — single door only | Each door controlled individually | |

**User's choice:** Yes — bulk actions with confirmation
**Notes:** Confirmation dialog required for safety.

---

## ONVIF Event Subscriptions

| Option | Description | Selected |
|--------|-------------|----------|
| All available events | Motion, tampering, video loss, line crossing, intrusion, PTZ preset reached | ✓ |
| Core events only | Motion, tampering, video loss | |

**User's choice:** All available events
**Notes:** Operators can filter per-camera later.

---

## Dashboard Hardware Views

| Option | Description | Selected |
|--------|-------------|----------|
| Integrated into existing views | Door controls in Doors page, PTZ in Camera viewer | ✓ |
| Dedicated Hardware page | New sidebar section with sub-pages | |

**User's choice:** Integrated into existing views

---

## Existing Camera Migration (v1.0)

| Option | Description | Selected |
|--------|-------------|----------|
| Replace on discovery | Upgrade in-place if ONVIF address matches existing camera | ✓ |
| Keep separate | Auto-discovered cameras in separate pool, manual merge | |

**User's choice:** Replace on discovery
**Notes:** Preserves existing name/group, adds RTSP/PTZ config.

---

## PTZ Access Control

| Option | Description | Selected |
|--------|-------------|----------|
| Supervisors and above | Only supervisor/admin roles can control PTZ | ✓ |
| All operators | Any operator with camera access | |

**User's choice:** Supervisors and above
**Notes:** Operators can view but not reposition cameras.

---

## OSDP Controller Enrollment

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-discovery on serial bus | Edge Agent probes RS-485, discovered controllers appear as Pending | ✓ |
| Manual configuration | Admin configures address/port upfront | |

**User's choice:** Auto-discovery on serial bus
**Notes:** Pending controllers named and assigned to site in Dashboard.

---

## Event Retention

| Option | Description | Selected |
|--------|-------------|----------|
| 90 days | Standard security audit alignment, auto-archive | ✓ |
| 30 days | Reduced storage, less compliance-ready | |
| Indefinite | Full audit trail, significant storage growth | |

**User's choice:** 90 days

---

## Agent's Discretion

The user delegated the following technical decisions to the agent:
- OSDP library choice (Python bindings vs raw serial vs C library wrapper)
- ONVIF library choice
- MQTT command/response topic schema details
- Edge Agent serial port probing strategy
- PTZ command format specifics
- Snapshot capture mechanism

## User Notes
- User consistently selected recommended options when presented
- User explicitly wants "zero manual configuration" for camera discovery
- Strong preference for rich event detail with visual context (inline snapshots)

