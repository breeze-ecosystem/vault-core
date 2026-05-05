# Contributing to OVERSIGHT AI

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. **Fork & clone** the repository
2. **Install** dependencies:
   ```bash
   pnpm install
   ```
3. **Generate** Prisma client:
   ```bash
   pnpm --filter @repo/api prisma generate
   ```
4. **Copy** environment config:
   ```bash
   cp .env.example .env
   ```
5. **Start** the development stack:
   ```bash
   docker compose up -d postgres redis
   pnpm dev
   ```

## Project Conventions

- **Language**: Code and comments in **English**; user-facing UI in **French**
- **Monorepo**: Managed with Turborepo + pnpm workspaces
- **Packages**: Shared code lives in `packages/` — never duplicate types or utilities
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add camera PTZ controls`
  - `fix: resolve WebSocket reconnection loop`
  - `docs: update API authentication guide`
- **Branches**:
  - `main` — production-ready code
  - `develop` — integration branch
  - `feat/short-description` — feature branches
  - `fix/short-description` — bugfix branches

## Code Style

- **TypeScript** strict mode across all packages
- **ESLint** + **Prettier** enforced via `pnpm lint` and `pnpm format`
- Run `pnpm check-types` before pushing to catch type errors

## Pull Requests

1. Create a branch from `develop`
2. Make your changes with clear, focused commits
3. Ensure `pnpm lint` and `pnpm check-types` pass
4. Open a PR against `develop` with a clear description
5. Address review feedback

## Reporting Issues

- Use [GitHub Issues](https://github.com/breeze-ecosystem/oversight-hub/issues)
- Include steps to reproduce, expected vs. actual behavior, and logs

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
