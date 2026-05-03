---
title: Troubleshooting
description: Fixes for common setup and provider issues.
---

## "Authentication failed" or quota errors

Navvy detects authentication and quota problems and shows a short hint with an **Open provider
settings** link on the error card. Re-check your API key and the selected model in
**Settings → Providers**, then press **Test connection**.

## Rate limits

On a `429`, Navvy reads the provider's `Retry-After` hint and waits the indicated time before
retrying. If you hit limits often, switch to a higher-tier model or a less constrained provider.

## The microphone doesn't work

The side panel can't show Chrome's mic prompt. Open **Settings → Voice**, use the **Microphone
access** control to grant permission in a tab, then try again. Navvy warns you up front if access is
blocked. See [Voice Mode](/docs/features/voice).

## Shortcuts don't fire on some pages

`Esc` and `` ` `` rely on a content script, which Chrome won't inject on `chrome://` pages, the Web
Store, or PDFs. This is expected — see [Shortcuts](/docs/features/shortcuts).

## A provider returns a 403 on tool calls

Some OpenAI-compatible gateways reject a named `tool_choice` or strictly validate tool names. Navvy
already adapts to several of these (for example, it mirrors nested action names as stub tools for
Groq). If a custom gateway still fails, try a different model or the **Custom** provider with a
standard configuration.

## The agent stops before finishing

Navvy caps how many steps a task may take (40 by default) so a confused run can't loop forever. For
genuinely long tasks, raise **Max steps** in [Settings → Advanced](/docs/reference/settings#advanced).
If a task stalls or repeats itself instead, a more capable model usually helps — see
[Limitations](/docs/introduction/limitations#model-dependent-quality).

## "Context length exceeded"

Very large pages plus a long history can overflow a model's context window. Switch to a model with a
larger context, or break the task into smaller ones. Navvy reports this as a distinct error so you
know it's a size issue, not a credentials problem.

## Still stuck?

Open an issue on [GitHub](https://github.com/kemalilketuna/Navvy/issues) with the provider, model,
and the error shown on the card.
