---
title: Overview
description: What Navvy is, how it works, and what makes it different.
---

**Navvy** is a browser extension that turns natural-language instructions into real actions on
the web. You tell it what you want — _"find the cheapest direct flight to Rome next weekend and
start the booking"_ — and it reads the page, decides what to do, and carries out the clicks,
typing, scrolling, and navigation on your behalf.

## How it works

Navvy runs a tight perception–reasoning–action loop:

1. **Read the page.** Navvy extracts the live DOM into a compact, model-friendly representation,
   assigning each interactive element a stable index.
2. **Reason.** A language model receives that simplified page plus your task and decides the next
   action — click element 7, type into element 3, scroll, navigate, and so on.
3. **Act.** Navvy executes the action against the real page through its page controller, then
   re-reads the page and repeats until the task is done.

This indexed approach means Navvy works on pages it has never seen before, without brittle
hand-written selectors.

## What makes it different

- **It runs where you browse.** Navvy lives in a side panel next to your tabs, not in a separate
  app or a remote sandbox.
- **You can watch it work.** An on-screen cursor glides to each target and clicks, and a soft glow
  marks the page as automated — so you always see what the agent is doing. While it works, the page is
  shielded so you and the agent don't fight over the same controls.
- **Privacy by design.** Sensitive values you save are stored locally and encrypted at rest; with
  [data masking](/docs/features/data-masking) they are filled into forms without ever being sent
  to the model.
- **You can talk to it.** [Voice mode](/docs/features/voice) lets you drive Navvy hands-free.
- **It learns your routines.** [Teach → Skills](/docs/features/skills) turns a one-time narration
  into a reusable automation.
- **Bring your own model.** Navvy works with any OpenAI-compatible provider — see
  [Models & Providers](/docs/features/models).

## What Navvy can do

- **[Models & Providers](/docs/features/models)** — bring your own key for any OpenAI-compatible model.
- **[Voice Mode](/docs/features/voice)** — speak your tasks and hear the answers, with a free
  in-browser option.
- **[Data Masking](/docs/features/data-masking)** — fill secrets into forms without sending them to
  the model.
- **[Teach → Skills](/docs/features/skills)** — turn a one-time narration into a reusable automation.
- **[Multi-Tab Automation](/docs/features/multi-tab)** — let one task span and coordinate several tabs.
- **[Vision & Images](/docs/features/vision)** — attach screenshots so a vision model can see the page.
- **[Conversation History](/docs/features/history)** — review, re-run, and export past tasks.
- **[Custom Instructions](/docs/features/custom-instructions)** — set standing guidance the agent
  always follows.
- **[Languages](/docs/features/languages)** — a localized interface and a separate reply language.
- **[Shortcuts](/docs/features/shortcuts)** — single-key cancel and push-to-talk, fully rebindable.
- **[Automation API](/docs/reference/automation-api)** — drive Navvy from a page, an external app, or
  an MCP client.

## Next steps

- [Quick Start](/docs/introduction/quick-start) — install and run your first task.
- [Privacy & Security](/docs/introduction/privacy-and-security) — what stays local and what's sent.
- [The Agent Loop](/docs/internals/agent-loop) — how the agent reasons step by step.
- [Architecture](/docs/internals/architecture) — a tour under the hood.
