---
title: Teach → Skills
description: Turn a one-time narration into a reusable, parameterized automation.
---

A **skill** is an automation you teach Navvy once and reuse forever. You narrate the steps — by
voice or by text — and Navvy refines them into a structured, parameterized routine it can run again
whenever you're on a matching page.

## Teaching a skill

Press the **Teach** button (the graduation-cap icon) in the side panel's action bar to open the
Teach screen. Narrate the steps while looking at the real page, or type them in. Navvy's refiner
turns your narration into a structured skill — a name, a description, a URL pattern, typed
parameters, and an ordered plan — which you review and edit before saving.

You can also author a skill entirely from text in **Settings → Skills**, with no microphone needed.

## How skills run

Every enabled skill is registered as a `skill_<name>` tool, but it is only **advertised to the
planner on pages whose URL matches** the skill's pattern. Invoking a skill injects its plan — with
your parameters filled in — as authoritative steps for the agent to carry out.

This is a **guided natural-language sub-task**, not a brittle replay of recorded clicks, so a skill
keeps working even when the page layout shifts.

## A concrete example

A skill for filing an expense might look like this:

- **Name** — `file_expense`
- **URL pattern** — `https://expenses.example.com/*`
- **Parameters** — `amount`, `category`
- **Plan** — _"Click New Expense. Enter `{amount}` in the Amount field. Choose `{category}` in the
  Category dropdown. Click Submit and confirm the success message."_

On a matching page the agent gains a `file_expense` action; invoking it with your `amount` and
`category` fills the placeholders and runs the plan as ordinary steps.

:::tip[Where to manage skills]
The Teach screen only **captures and saves** new skills. Listing, editing, enabling, and deleting
all happen in **Settings → Skills**.
:::
