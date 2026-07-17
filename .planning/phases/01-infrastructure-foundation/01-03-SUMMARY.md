---
phase: 01-infrastructure-foundation
plan: 03
type: execute
wave: 2
subsystem: tests
tags: [unit-tests, integration-tests, build-validation]
key-files:
  created:
    - edge/agent/tests/__init__.py
    - edge/agent/tests/test_config.py
    - edge/agent/tests/test_models.py
    - edge/agent/tests/test_mqtt_task.py
    - edge/agent/tests/test_http_task.py
    - edge/agent/tests/test_serial_task.py
    - edge/agent/tests/test_metrics.py
    - edge/agent/tests/pytest.ini
    - edge/agent/tests/integration/__init__.py
    - edge/agent/tests/integration/test_mqtt_integration.py
    - edge/agent/tests/integration/docker-compose.test.yml
    - edge/agent/Makefile
metrics:
  unit_tests: 99
  integration_tests: 7
  syntax_checks: pass
  archived_packages: 0
  sync_io_patterns: 0
---

# Plan 03: Tests + Build Validation

**Committed:** 2026-07-17

## Commits

| Type | Commit | Description |
|------|--------|-------------|
| feat | `65bd66e` | Create unit tests with mocked I/O for all modules |
| feat | `079e6ae` | Create integration tests, test infrastructure, and Makefile |

## Tasks

### Task 1: Unit tests with mocked I/O — Complete

Files created:
- `edge/agent/tests/__init__.py`
- `edge/agent/tests/pytest.ini` — `asyncio_mode = auto`, `integration` and `slow` markers
- `edge/agent/tests/test_config.py` — defaults, env override, serial ports parsing
- `edge/agent/tests/test_models.py` — door state, badge read, health, heartbeat, sequence validation
- `edge/agent/tests/test_mqtt_task.py` — reconnect loop, publish, subscribe, buffer overflow, replay, TLS params, message parsing
- `edge/agent/tests/test_http_task.py` — heartbeat payload structure, HTTP error, timeout, health report
- `edge/agent/tests/test_serial_task.py` — timeout, shutdown, connection error
- `edge/agent/tests/test_metrics.py` — system metrics structure, service status graceful degradation

### Task 2: Integration tests + test infrastructure — Complete

Files created:
- `edge/agent/tests/integration/__init__.py`
- `edge/agent/tests/integration/test_mqtt_integration.py` — 7 class-based integration tests
- `edge/agent/tests/integration/docker-compose.test.yml` — standalone Mosquitto for tests
- `edge/agent/Makefile` — targets: `test`, `test-integration`, `test-all`, `test-ci`, `build`, `lint`

### Task 3: Human verification (checkpoint) — Pending

## Deviations

None — all tasks completed as planned.

## Verification

- [x] All test files pass `ast.parse()` syntax check
- [x] No archived `asyncio-mqtt` references — only `aiomqtt` used
- [x] No sync I/O patterns in async code (`time.sleep`, `httpx`, `schedule`)
- [x] Makefile targets: `test`, `test-integration`, `test-all`, `test-ci`, `build`, `lint`
- [ ] Docker image builds successfully (human verification needed)
- [ ] Package legitimacy confirmed on PyPI (human verification needed)
- [ ] Unit tests pass (environment-dependent)
