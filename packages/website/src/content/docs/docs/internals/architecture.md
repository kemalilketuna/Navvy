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

## Runtime surfaces

Inside Chrome, Navvy spreads across several contexts that can't share memory and must talk by
message passing:

- **Side panel** — the primary UI, and, unusually, **where the agent's reasoning loop actually
  runs**.
- **Service worker** — a thin background router that forwards page and tab operations and broadcasts
  tab events.
- **Content script** — injected into each page; runs the real page controller against that page's DOM.
- **Settings page** — opens in a tab so it can do things the panel can't, like request microphone
  permission.
- **Hub page** — a bridge tab for the [Automation API](/docs/reference/automation-api).

## How they talk

The agent engine never touches the DOM directly. It delegates every page operation to the page
controller through async methods, and the page controller exposes page state (a simplified DOM,
page info) back through async getters. This keeps the model-facing reasoning and the
browser-facing mechanics fully decoupled and independently testable.

Because the agent runs in the side panel but the DOM lives in each tab's content script, the page
controller the agent holds is really a **message-passing proxy**: each call is packaged as a message,
routed through the service worker to the right tab, run there, and the result relayed back. A
navigation that tears down the page mid-operation is recognized and handled gracefully rather than
reported as a failure. The same indirection is what powers [multi-tab
automation](/docs/features/multi-tab) — tabs and tab groups are a service-worker concern, driven from
the panel by messages.

The on-page cursor and activity mask are coordinated a little differently: while a task runs, the
panel writes a periodic heartbeat to storage, and the content script polls it to know when to show or
hide the overlay — a deliberately simple backup, since the panel can close without a reliable
shutdown signal.

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

See [The DOM Pipeline](/docs/internals/dom-pipeline) for how a live page becomes model-ready text,
and [Action Execution](/docs/internals/action-execution) for how the agent's chosen action becomes
real events on the page.
