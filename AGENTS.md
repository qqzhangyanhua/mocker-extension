# Repository Guidelines

## Project Structure & Module Organization
- Core files at root: `background.ts` (service worker), `popup.tsx`, `options.tsx`, `monitor.tsx`, `scenes.tsx`.
- Feature folders:
  - `components/` React UI (e.g., `RuleList.tsx`, `TopBar.tsx`).
  - `contents/` content scripts (e.g., `interceptor.ts`).
  - `lib/` shared logic (`types.ts`, `storage.ts`, `matcher.ts`, `utils.ts`).
  - `assets/` static assets (icons). Build output in `build/`.
- Path alias: use `~/` to import from repo root (see `tsconfig.json`).

## Build, Test, and Development Commands
- `pnpm dev` - start Plasmo dev server; load `build/chrome-mv3-dev` in Chrome via `chrome://extensions`.
- `pnpm build` - production build to `build/chrome-mv3-prod`.
- `pnpm package` - zip the production build for store upload.
- `pnpm type-check` - TypeScript type check.
- Optional: `node scripts/generate-icons.js` - generate placeholder icons under `assets/`.

## Coding Style & Naming Conventions
- Language: TypeScript + React; prefer functional components and hooks.
- Formatting: Prettier 3 + sort-imports plugin; 2-space indent; single source of truth is Prettier.
- Naming: `PascalCase` for React components/files in `components/`; `camelCase` for variables/functions; content scripts are descriptive (e.g., `interceptor.ts`).
- Imports: prefer `~/lib/...` over long relative paths.

## Testing Guidelines
- Current state: no formal unit tests. Required before PR: `pnpm type-check` and manual verification in Chrome (console errors, behavior).
- Suggested (future): place unit tests as `*.test.ts` next to source (e.g., `lib/matcher.test.ts`); target >= 80% coverage.

## Commit & Pull Request Guidelines
- Commit style: Conventional Commits (e.g., `feat: add regex support to matcher`, `fix: handle fetch timeout`).
- PR requirements: clear description, linked issue if any, test steps, expected result, screenshots/GIFs for UI, note permissions changes in `.plasmorc.ts`/`package.json`.
- Keep PRs focused and small; avoid unrelated refactors.

## Security & Configuration Tips
- Do not commit secrets; prefer environment variables with `PLASMO_PUBLIC_*` when needed.
- Request minimum permissions; justify changes to `host_permissions` and `permissions`.
- Ensure icons exist under `assets/` and manifest metadata is correct.