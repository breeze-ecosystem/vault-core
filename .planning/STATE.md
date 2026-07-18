# STATE: VaultOS v1.0

**Project**: VaultOS — Self-hosted AI video surveillance
**Milestone**: v1.0 Minimum Commercial Product (VISION + BASTION)
**Last updated**: 2026-07-18

---

## Project Reference

**Core Value**: Correlate every physical security event with video evidence and AI analysis in real time, so security operators know what happened, where, and what to do — without switching between disconnected systems.

**Current Focus**: Establish foundation architecture (license system, feature gating, vault-app admin portal) then complete VISION and BASTION packs per founders' spec.

**Key Decisions**:
- vault-os = product deployed at client sites; vault-app = admin portal for VaultOS teams
- License generation in vault-app; activation only in vault-os
- 2 fixed packs only (VISION + BASTION), no custom packs
- Annual license only (no monthly), out-of-band payment
- 24h verification + 72h degraded mode + read-only on expiry

---

## Current Position

| Dimension | Value |
|-----------|-------|
| Current Phase | None (roadmapping complete) |
| Current Plan | Awaiting `/gsd-plan-phase 1` |
| Phase Status | Not started |
| Phase Progress | ░░░░░░░░░░░ 0% |

---

## Performance Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Requirements mapped | 78/78 (100%) | 100% |
| Phases defined | 5 | 3-5 (coarse) |
| Unmapped requirements | 0 | 0 |

---

## Accumulated Context

### Decisions Made
| Decision | Rationale |
|----------|-----------|
| 5 phases for coarse granularity | 78 requirements naturally cluster into 5 delivery boundaries; 4 would overload Phase 4 with 30 requirements |
| Phase 1 = License + Admin foundation | Everything depends on license system; vault-app admin portal needed first to generate keys |
| Phase 2 = VISION complete | VISION is entry-level product; must ship before BASTION enterprise features |
| Phase 3 = BASTION AI + Access | Advanced AI and physical access control are the core BASTION differentiators |
| Phase 4 = BASTION Enterprise | Compliance, API, advanced storage are additive enterprise value |
| Phase 5 = Launch Readiness | Documentation, support, training, marketing are launch prerequisites, not feature work |
| BAS-36 to BAS-40 in Phase 5 | Support/SLA/doc items are non-software deliverables; belong in launch prep |
| ADM-04 (usage dashboard) in Phase 5 | Usage stats require production data to be meaningful; must come after product features ship |

### TODOs
- [ ] `/gsd-plan-phase 1` — Architecture & License Foundation
- [ ] Research WhatsApp Business API integration options
- [ ] Research SMS gateway providers for Niger/West Africa
- [ ] Research HAPDP compliance requirements (Niger data protection authority)

### Blockers
- None currently

### Risks
| Risk | Mitigation |
|------|------------|
| WhatsApp Business API approval delays | Start Phase 2 research early; prepare SMS-only fallback |
| HAPDP compliance complexity | Phase 4 starts after legal review of requirements; wizard approach reduces implementation risk |
| License system refactor breaks existing deployments | Phase 1 must include migration path for existing vault-os instances without licenses |
| SMS modem compatibility | Support common GSM modems (Huawei, ZTE) via PPP/AT commands |

### Existing Code Reuse Notes
- Video ingestion pipeline, camera management, ONVIF discovery — already built, minor alignment needed for VIS-01
- Alert system (BullMQ + Socket.IO) — extend for WhatsApp/SMS channels
- Access control (OSDP, badges, QR, zones) — upgrade for BAS-07 to BAS-12 specifics
- JWT auth + RBAC — extend for granular roles (BAS-16) and SSO (BAS-17)
- Audit logs — already built (BAS-18), verify hash-chain coverage
- Marketing site — already has pages (ADM-05), needs pricing section
- Multi-site — already exists in code, needs dashboard and sync (BAS-13 to BAS-19)

---

## Session Continuity

**Planned phases workflow**: Sequential execution starting from Phase 1.
**Next session trigger**: `/gsd-plan-phase 1`

### Context for Next Agent
- License refactor is the hardest dependency: vault-app needs admin auth + org CRUD + key generation before vault-os can validate
- Feature gating (FREE/PROFESSIONAL/ENTERPRISE → VISION/BASTION+modules) touches every module in vault-os
- Mode dégradé and read-only on expiry need infrastructure for local license caching and grace period tracking
- WhatsApp alerts require WhatsApp Business API account setup
- HAPDP compliance is a complete sub-system (wizard, register, consent, pseudonymization, subject portal, traceability) — treat as separate tracks within Phase 4
