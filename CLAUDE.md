# Navvy

This project is **Navvy**, a fork of the upstream `page-agent` project. The codebase was originally scaffolded from page-agent, and the monorepo layout, package names (`@page-agent/*`, `page-agent`), and core architecture documented in `AGENTS.md` still apply to the underlying engine.

## Project Goal

Navvy's focus is to **significantly improve the UX of the browser extension** built on top of the page-agent engine. The primary work happens in `packages/extension/` (and the shared `packages/ui/` it depends on).

## Design System Direction

- We are migrating away from the page-agent design system toward a **new "Navvy" design system**.
- All new UI work in the extension and `packages/ui/` should follow Navvy's design language, not legacy page-agent styling.
- When touching existing extension/UI files, prefer updating styles, tokens, and components to the Navvy design system rather than preserving legacy looks.
- The underlying engine packages (`core`, `llms`, `page-controller`, `page-agent`) retain their original names and APIs — do not rename these unless explicitly asked.

## Engineering Reference

See `AGENTS.md` for the inherited monorepo structure, build commands, module boundaries, DOM pipeline, and code standards. Those still apply.

@AGENTS.md
