---
title: Custom Instructions
description: Steer the agent with standing guidance — globally, and from a site's own llms.txt.
---

Sometimes you want to shape *how* the agent works, not just give it a one-off task — "always confirm
before submitting a form", "prefer keyboard navigation", "keep summaries short". Custom instructions
let you set that guidance once and have it apply automatically.

## Global instructions

In [Settings → Advanced](/docs/reference/settings#advanced), the **Custom instructions** field holds
free-form guidance that is added to **every** task, on every site. Use it for standing preferences
that should always hold, no matter what you ask.

These differ from a [skill](/docs/features/skills): a skill is a named, parameterized routine that
only appears on pages it matches, while custom instructions are always-on guidance with no parameters
and no triggering pattern.

## Site guidance via `llms.txt`

Some sites publish an [`llms.txt`](https://llmstxt.org/) — a machine-readable file of hints for AI
agents about how to use that site. Turn on **Read `llms.txt`** (experimental) in
[Settings → Advanced](/docs/reference/settings#advanced) and, when one exists, Navvy fetches the
current site's file and passes the author's guidance to the agent for that domain.

## How the agent sees them

Navvy keeps these sources distinct when it briefs the model — global instructions, page-specific
instructions, and site `llms.txt` are labelled separately — so the model can weigh always-on rules,
context for the current page, and site-author hints appropriately rather than treating them as one
blurred blob. The page-specific channel is the same mechanism Navvy uses internally to advertise
[masked tokens](/docs/features/data-masking) and [matching skills](/docs/features/skills) for the URL
you're on.
