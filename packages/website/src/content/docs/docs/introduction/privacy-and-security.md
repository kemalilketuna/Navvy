---
title: Privacy & Security
description: What Navvy stores, what it sends to the model, and how it protects your data.
---

Navvy runs inside your own browser session and keeps your data on your own device. This page
gathers the privacy and security story in one place.

## Where your data lives

Everything Navvy needs — provider settings, API keys, saved values, skills, and
[conversation history](/docs/features/history) — is stored **locally in your browser**. None of it is
sent to any Navvy server. There is no account and no cloud sync.

## What gets sent to the model

When you run a task, Navvy sends to the **LLM provider you chose**:

- your instruction,
- a compact text outline of the current page (its interactive elements, not its full markup), and
- any [images you attached](/docs/features/vision).

That provider is a third party you bring your own key for. Choose one you trust, and use
[data masking](/docs/features/data-masking) for anything sensitive.

## Keeping secrets out of the model

[Data masking](/docs/features/data-masking) lets the agent fill in private values — card numbers,
passwords, SSNs — **without the model ever seeing them**. The real value is redacted from the page
outline before it's sent, swapped back in only at the moment it's typed into the page, and the
echo of what was typed is re-masked before it re-enters the agent's memory. As an added safeguard,
the `execute_javascript` tool is disabled whenever masking is active, so a script can't read a value
back out.

## Encryption at rest

Secret fields — API keys, voice keys, and masked values — are encrypted in local storage with
**AES-GCM-256**, using a non-extractable key that never leaves your device. Non-secret settings
(provider, model, base URL) stay readable for easy debugging, and any older plaintext is migrated to
encrypted form automatically the first time you load.

:::note[What encryption at rest does and doesn't cover]
This protects your secrets from casual inspection of disk or backups. It does **not** defend against
code running inside the extension's own context — that's an explicit non-goal, not an oversight.
:::

## Acting in your session

Because Navvy operates pages you're already logged into, treat it like you'd treat any automation of
your own account: review anything irreversible (payments, deletions) before letting it proceed, and
prefer a model you trust for sensitive sites. Navvy will never solve a captcha on your behalf.

## Programmatic access requires permission

The [Automation API](/docs/reference/automation-api) is gated. A page can only drive the agent if it
presents your **User Auth Token**, and external [Hub](/docs/reference/automation-api#hub-external-apps)
connections require your approval before they can run a task.

## Restricted pages

Chrome won't let any extension run scripts on `chrome://` pages, the Web Store, or the PDF viewer.
On those pages Navvy can't act, and its [single-key shortcuts](/docs/features/shortcuts) won't fire —
a browser security boundary, not a Navvy setting.
