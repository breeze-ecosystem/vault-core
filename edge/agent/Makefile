# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║              Oversight Hub — Edge Agent Makefile                             ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
#
# Development targets for the Edge Agent.
# Run from the project root or set `-C edge/agent` flag.

.PHONY: all test test-integration test-all build lint test-ci

all: lint test

# ─── Unit tests ──────────────────────────────────────────────────────────────────
test:
	@echo "Running unit tests..."
	@cd edge/agent && python -m pytest tests/ -x -v --asyncio-mode=auto -m "not integration"

# ─── Integration tests (requires Docker) ────────────────────────────────────────
test-integration:
	@echo "Running integration tests (requires Docker + Mosquitto)..."
	@cd edge/agent && python -m pytest tests/integration/ -x -v --asyncio-mode=auto

# ─── All tests ───────────────────────────────────────────────────────────────────
test-all: test test-integration

# ─── CI tests (unit only, no Docker required) ────────────────────────────────────
test-ci:
	@echo "Running CI test suite..."
	@cd edge/agent && python -m pytest tests/ -x -v --asyncio-mode=auto -m "not integration"

# ─── Docker build ────────────────────────────────────────────────────────────────
build:
	@echo "Building Edge Agent Docker image..."
	docker build -t oversight-edge-agent:test -f edge/agent/Dockerfile edge/agent/

# ─── Lint (syntax check) ─────────────────────────────────────────────────────────
lint:
	@echo "Checking Python syntax..."
	@python3 -m py_compile edge/agent/main.py && echo "  OK: main.py"
	@python3 -m py_compile edge/agent/config.py && echo "  OK: config.py"
	@python3 -m py_compile edge/agent/models.py && echo "  OK: models.py"
	@for f in edge/agent/tasks/*.py; do python3 -m py_compile "$$f" && echo "  OK: $$f"; done
	@for f in edge/agent/services/*.py; do python3 -m py_compile "$$f" && echo "  OK: $$f"; done
	@echo "All files pass syntax check."
