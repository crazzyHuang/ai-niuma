# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router pages and API routes (e.g., `src/app/api/...`).
- `src/lib`: Core services and agents (`agents/*`, adapters, LLM orchestration, auth, db, redis).
- `src/components`: UI components (use PascalCase, e.g., `AdminSidebar.tsx`).
- `src/{contexts,hooks,types}`: React context, hooks, and shared types.
- `prisma`: Prisma schema, migrations, and seed (`schema.prisma`, `migrations/`, `seed.ts`).
- `public`: Static assets. `docs/` and top‑level `*.md` for design notes.
- Test utilities: root `test-*.js` scripts for manual/integration checks.

## Build, Test, and Development Commands
- Install: `pnpm i` (pnpm is preferred; lockfile present).
- Dev server: `pnpm dev` (Next.js; defaults to `http://localhost:3000`).
- Build: `pnpm build`; Start: `pnpm start` (serve production build).
- Lint: `pnpm lint` (ESLint flat config: Next + TS).
- Prisma: `pnpm prisma generate`, `pnpm prisma migrate dev` (requires `DATABASE_URL`).
- Integration scripts: `node test-integration.js` (expects API reachable; some scripts use port 3001—set `PORT=3001 pnpm dev` or edit the script).

## Coding Style & Naming Conventions
- TypeScript strict mode on; path alias `@/*` maps to `src/*`.
- Components/files: PascalCase for React components, kebab/flat for modules (e.g., `scene-analyzer-agent.ts`).
- Functions/vars: camelCase; constants UPPER_SNAKE_CASE.
- Indentation: 2 spaces. Run `pnpm lint` before pushing.

## Testing Guidelines
- Framework: no Jest configured; use the provided Node scripts (`test-*.js`) for manual and integration testing.
- DB: ensure migrations applied and `.env` set. Example: `DATABASE_URL=postgresql://...`.
- Add new scripts under the project root and name `test-<area>.js` for consistency.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subject; include scope when helpful (e.g., `feat(auth): add JWT verify`).
- PRs: clear description, scope, screenshots for UI, linked issues, and notes on migrations or env changes. Ensure `pnpm lint` passes.

## Security & Configuration Tips
- Required env: `DATABASE_URL`, `JWT_SECRET`, optional `REDIS_URL`. Keep secrets in `.env.local`; never commit secrets.
- Prisma data changes must be accompanied by migrations and minimal seed updates when needed.
