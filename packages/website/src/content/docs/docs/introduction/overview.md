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
- **Privacy by design.** Sensitive values you save are stored locally and encrypted at rest; with
  [data masking](/docs/features/data-masking) they are filled into forms without ever being sent
  to the model.
- **You can talk to it.** [Voice mode](/docs/features/voice) lets you drive Navvy hands-free.
- **It learns your routines.** [Teach → Skills](/docs/features/skills) turns a one-time narration
  into a reusable automation.
- **Bring your own model.** Navvy works with any OpenAI-compatible provider — see
  [Models & Providers](/docs/features/models).

## Next steps

- [Quick Start](/docs/introduction/quick-start) — install and run your first task.
- [Architecture](/docs/internals/architecture) — a tour under the hood.
