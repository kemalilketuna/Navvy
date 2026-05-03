---
title: Architecture
description: How Navvy is put together, module by module.
---

Navvy is built as a set of focused modules with clear boundaries. The browser extension is the
product you install; underneath it sits a headless agent engine that could run anywhere.

## The modules

- **Extension** — the React side panel, settings page, content script, and background service
  worker. It owns everything you see and the Chrome integration.
- **Agent engine** — the headless core: the reasoning loop, the tool definitions, the system
  prompts, and the configuration model. No UI.
- **LLM layer** — a provider-agnostic client for OpenAI-compatible chat and audio (STT/TTS), with
  retry logic, error normalization, and rate-limit handling.
- **Page controller** — all DOM operations (click, type, scroll, key presses) and the on-page
  visual feedback (the cursor and the activity mask). It has no knowledge of the model.
- **UI kit** — shared panel and internationalization primitives.

## How they talk

The agent engine never touches the DOM directly. It delegates every page operation to the page
controller through async methods, and the page controller exposes page state (a simplified DOM,
page info) back through async getters. This keeps the model-facing reasoning and the
browser-facing mechanics fully decoupled and independently testable.

## Extending the agent

Three composition seams let the extension add behavior without forking the engine:

- **`customTools`** — register new tools, or override built-ins by name (used by skills and by
  masking's value-writing overrides).
- **`transformPageContent`** — a hook applied to the simplified page before it reaches the model
  (used by masking's outbound redaction).
- **`getPageInstructions(url)`** — per-step, per-URL instructions (used to advertise masked tokens
  and URL-matching skills).

The extension composes all of these at a single wiring point, so masking, skills, and voice layer
on cleanly without touching engine internals.

See [The DOM Pipeline](/docs/internals/dom-pipeline) for how a live page becomes model-ready text.
