# Navvy

Fork of `page-agent`. Monorepo layout, package names (`@page-agent/*`, `page-agent`), and engine architecture documented in `AGENTS.md` still apply.

## Goal

Improve the UX of the browser extension in `packages/extension/` (and shared `packages/ui/`).

## Design System

Migrating from page-agent styling to a new **Navvy** design system. New UI work in `extension/` and `ui/` follows Navvy. Engine packages (`core`, `llms`, `page-controller`, `page-agent`) keep their names and APIs.

## Package Manager

Use **pnpm** only. Never `npm`. Substitute `pnpm` for any `npm` examples in `AGENTS.md`.

## Builds (pnpm workspace)

Downstream packages don't see source changes until upstream is rebuilt.

- Edited a library (`core`, `llms`, `page-controller`, `ui`, `page-agent`) → `pnpm run build:libs` before building extension/website.
- Edited `extension/` → `pnpm run build:ext` (build libs first if you also touched one).
- Edited `website/` → `pnpm start` (dev) or `pnpm run build`.
- Edits contained within a single package during dev → `pnpm run typecheck` is usually enough.
- When unsure → `pnpm run build` from repo root.

## Code Comments

Default to none. One line max, only when the *why* is non-obvious.

## Engineering Reference

See `AGENTS.md` for monorepo structure, module boundaries, DOM pipeline, and standards.

@AGENTS.md
