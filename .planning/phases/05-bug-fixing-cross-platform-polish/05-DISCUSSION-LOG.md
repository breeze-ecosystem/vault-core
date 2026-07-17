# Phase 5: Bug Fixing & Cross-Platform Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-17
**Phase:** 5 - Bug Fixing & Cross-Platform Polish
**Areas discussed:** Bug inventory & triage, Cross-platform consistency audit, Mobile stability & performance, Translation audit strategy

---

## Bug Inventory & Triage

| Option | Description | Selected |
|--------|-------------|----------|
| Git log + code grep | Search recent git commits for 'fix', 'bug', 'TODO', 'FIXME', 'HACK' | |
| Manual screen-by-screen audit | Walk through every screen in Dashboard and Mobile with a checklist | ✓ |
| Combined approach | Start with git/code search then manual pass on high-risk areas | |

**User's choice:** Manual screen-by-screen audit
**Notes:** Full audit walkthrough preferred over automated search.

Follow-up — audit order:

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard first, Mobile second | Fix Dashboard issues, then audit Mobile against fixed Dashboard | ✓ |
| Mobile first, Dashboard second | Focus on mobile stability first | |
| Parallel — API then both UIs | Audit API error handling first, then both UIs together | |

**User's choice:** Dashboard first, Mobile second

---

## Cross-Platform Consistency Audit

| Option | Description | Selected |
|--------|-------------|----------|
| Feature parity | Same data and actions. Visual differences acceptable. | ✓ |
| Full functional parity | Same data, actions, AND workflow behavior | |
| Pixel-level parity | Mirror Dashboard layout as closely as possible | |

**User's choice:** Feature parity — same data, same actions

Follow-up — parity gap analysis:

| Option | Description | Selected |
|--------|-------------|----------|
| Build a parity matrix | Create checklist mapping Dashboard routes to Mobile screens | ✓ |
| Fix what's reported | Don't proactively search for gaps | |
| Audit only POL-listed apps | Focus on Dashboard and Mobile only | |

**User's choice:** Build a parity matrix

---

## Mobile Stability & Performance

| Option | Description | Selected |
|--------|-------------|----------|
| Add Sentry/crash reporting | Integrate crash monitoring into Expo app | ✓ |
| Manual testing only | Walk through workflows manually | |
| Console error audit | Fix existing warnings/errors only | |

**User's choice:** Add Sentry crash reporting

Follow-up — performance baseline:

| Option | Description | Selected |
|--------|-------------|----------|
| Smooth 60fps navigation | Tab switching, scrolling, transitions at 60fps | |
| No crashes during workflows | Zero crashes in standard operator flows | |
| Both — 60fps AND no crashes | Hit both performance bars | ✓ |

**User's choice:** Both — 60fps AND no crashes

---

## Translation Audit Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| grep + manual review | grep hardcoded strings, then review each screen | ✓ |
| Extract i18n keys, compare locales | Parse all `t()` calls, compare against locale JSONs | |
| Both — automated scan then manual | Scripted key extraction + focused manual review | |

**User's choice:** grep + manual review

---

## Test Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Fix only — no new tests | Don't add tests. Just fix bugs. | ✓ |
| Regression tests for fixed bugs | Add tests for each fix to prevent regression | |
| Fix bugs + boost strategic coverage | Add coverage for high-risk modules | |

**User's choice:** Fix only — no new tests

---

## Source Locale

**Confirmed:** French (fr) is the source of truth for all cross-platform parity comparisons.

---

## Agent's Discretion

The user delegated the following to the agent:
- Sentry integration setup details
- React Native performance optimization specifics
- Parity matrix format
- Specific bug fix implementation
- Priority ordering within Dashboard audit
- Translation key naming and i18n file organization

## Deferred Ideas

- Adding tests/coverage — out of scope for Phase 5, consider for future maintenance
- Performance benchmarks suite (POL-05) — deferred to v3.1
- CI/CD integration — out of scope
