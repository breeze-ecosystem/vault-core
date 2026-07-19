# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Minimum Commercial Product

**Shipped:** 2026-07-19
**Phases:** 5 | **Plans:** 35 | **Tasks:** 69+

### What Was Built
- License system refactored: vault-app generates keys, vault-os validates with 24h ping, 72h degraded mode
- Pack VISION: 23 features — live streaming, IA detection, WhatsApp/SMS alerts, H.265 local storage, face rec, geofencing, multi-user
- Pack BASTION: advanced AI (weapons, crowd, behavior, anti-spoofing), access control (RFID, biometric, QR), multi-site, HAPDP compliance, reports, API/webhooks
- vault-app admin portal: org management, usage dashboard, FCFA pricing pages, documentation, Crisp support
- Marketing extracted to standalone repo (vault-app)

### What Worked
- Schema-first approach (Prisma + Zod) kept data contracts consistent across all 5 phases
- Wave-based parallelism in Phase 2 (4 parallel backend plans) and Phase 4 (3 parallel backend plans) maximized execution speed
- YOLOv12 + insightface CPU-only approach kept AI accessible without GPU hardware
- HAPDP compliance wizard simplified a complex regulatory requirement into tractable implementation

### What Was Inefficient
- Phase 2 ROADMAP.md not updated after execution (showed 0/8 plans when all were completed) — verification step missed
- Phase 1 VERIFICATION gaps (3 UI wiring issues) not caught until verification report — should have automated component import validation
- Marketing extraction (quick task) had to be done mid-milestone instead of as Phase 0 — caused context switching

### Patterns Established
- 5-phase coarse granularity for 78 requirements — "too coarse" would be 4 phases, "too fine" would be 8+
- Plan-level autonomous mode for simple backend/UI plans, checkpoint mode for schema changes
- UI-SPEC design contracts before dashboard/mobile implementation

### Key Lessons
1. After executing all plans in a phase, immediately update ROADMAP.md status before moving to next phase — prevents stale tracking
2. Component import validation should be part of verification checklist (LicenseExpiryBanner was orphaned)
3. Extraction/refactoring work should be scoped as its own phase, not a quick task

### Cost Observations
- Model mix: ~70% standard, ~30% extended reasoning
- Sessions: 5+ phase execution sessions
- Notable: Coarse phases (5 for 78 requirements) balanced context cost vs delivery granularity

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 5+ | 5 | Initial GSD workflow applied to greenfield planning |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | ~27 (Jest + pytest) | >80% AI pipeline | 2 (sharp, insightface) |

### Top Lessons (Verified Across Milestones)

1. Schema-first + parallel waves maximizes throughput for coarse-grained phases
2. UI-SPEC before implementation prevents rework on visual components
