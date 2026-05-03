---
title: Settings
description: A reference for every Navvy settings section.
---

Navvy's settings open in their own tab (so it can request things like microphone permission) and are
organized into sections you can deep-link to. Changes are staged until you **Save**, with a
cancel option and validation that blocks invalid configurations.

![Navvy general settings](/shots/settings-general.png)

## General

Two independent language controls:

- **Interface language** — the language of Navvy's own UI. Defaults to your browser's language.
  Navvy ships localized interfaces for English, French, German, Spanish, Italian, Portuguese, and
  Turkish.
- **Agent response language** — the language the agent answers in. Leave it on **auto** to mirror
  the language of your task, or pick a specific language to force it.

## Providers

Choose your LLM provider, base URL, account id (where required), API key, and model, then use
**Test connection** to validate before running a task. See
[Models & Providers](/docs/features/models) for the full list and details.

## Masking

Define the sensitive and autofill values Navvy may fill into forms, each with a token, label, and a
**sensitive** flag. See [Data Masking](/docs/features/data-masking).

## Voice

Enable voice, grant microphone access, and configure speech-to-text and text-to-speech independently,
with per-direction test buttons and an auto-speak option. See [Voice Mode](/docs/features/voice).

## Shortcuts

Rebind the cancel and push-to-talk keys with a key-capture widget. See
[Shortcuts](/docs/features/shortcuts).

## Skills

Author skills from text, and enable, edit, re-refine, or delete saved ones. See
[Teach → Skills](/docs/features/skills).

## Advanced

Power-user controls:

- **Max steps** — the cap on actions per task (1–200). Raise it for long tasks, lower it to keep
  runs short.
- **Custom instructions** — a free-form `systemInstruction` applied to **every** task on every site.
  Use it to set standing preferences ("always confirm before submitting", "prefer keyboard
  navigation").
- **Disable named tool choice** — for providers that reject a named `tool_choice`; turn it on if a
  gateway errors on tool calls.
- **Read `llms.txt`** (experimental) — when on, Navvy fetches the current site's
  [`llms.txt`](https://llmstxt.org/) and feeds the author's machine-readable guidance to the agent
  for that domain.
- **Include all tabs** (experimental) — start tasks across all your open, allowed tabs rather than
  just the active one. See [Multi-Tab Automation](/docs/features/multi-tab).

:::tip[Custom instructions vs. skills]
Custom instructions apply everywhere, all the time. A [skill](/docs/features/skills) is a named,
parameterized routine that only surfaces on matching pages. Reach for custom instructions for
standing preferences, and skills for repeatable workflows.
:::

## About

Your page **User Auth Token** (masked, with reveal and copy) used by the
[Automation API](/docs/reference/automation-api), a link to manage the Hub, the version number, and
links to the repository, site, and privacy policy.
