---
title: Languages
description: Localized interface, plus independent control over the language the agent replies in.
---

Navvy separates two things that are easy to conflate: the language **you read the app in**, and the
language **the agent answers in**. You set them independently in
[Settings → General](/docs/reference/settings#general).

## Interface language

Navvy's own UI — buttons, labels, settings, messages — ships localized in seven languages:

- English, French, German, Spanish, Italian, Portuguese, and Turkish.

It defaults to your browser's language and falls back to English for anything not yet translated.
Changing it updates the interface immediately, no reload needed.

## Agent response language

This controls the language the agent uses when it talks back to you — its answers and any questions
it asks mid-task.

- **Auto** (the default) — the agent mirrors the language of your task. Ask in German, get German
  back.
- **A specific language** — force every reply into one language regardless of how you phrased the
  task.

:::tip[They're independent on purpose]
You can run Navvy's interface in English while having the agent reply in French, or vice versa. Pick
each to match how you actually work.
:::
