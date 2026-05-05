# Changelog

All notable changes to the **OVERSIGHT AI API** (`@repo/api`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-05

### Added

- NestJS API scaffold with Fastify adapter
- Prisma ORM with PostgreSQL 16 schema
- JWT authentication (access + refresh tokens)
- User module (CRUD, profile)
- Notification module (service + WebSocket gateway)
- BullMQ integration for async job processing
- AI preprocessor proxy integration (Ollama inference)
- Audit logging middleware
- Global exception filter with structured error responses
- Swagger/OpenAPI documentation at `/api/docs`
- Health check endpoint at `/api/health`
- Docker image (`docker/api.Dockerfile`)
- CI pipeline (lint, type-check, test)

[0.1.0]: https://github.com/breeze-ecosystem/oversight-hub/releases/tag/api-v0.1.0
