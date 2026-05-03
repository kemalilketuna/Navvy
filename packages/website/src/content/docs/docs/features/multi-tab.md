---
title: Multi-Tab Automation
description: Let one task span several tabs — Navvy opens, switches, and closes tabs as it works.
---

A single task often outgrows a single page: compare two listings, copy a value from one site into a
form on another, open a result in a new tab and keep going. Navvy treats all of those tabs as **one
task** — it can open new tabs, switch between them, and close them, and it keeps every tab it touches
in a dedicated Chrome **tab group** so your task stays visually separated from the rest of your
browsing.

## How it works

Navvy always sees a live list of the task's tabs, prepended to the page description it reads each
step:

| Tab ID | URL | Title | Current |
| --- | --- | --- | --- |
| 482 | `https://news.example` | Front page | ✓ |
| 483 | `https://docs.example` | API reference | |

Because every tab has a stable **Tab ID**, the agent can target any of them by id. It has three
tab tools available:

- **Open a new tab** at a URL and switch to it.
- **Switch to a tab** by id to continue working there.
- **Close a tab** by id when it's no longer needed.

When a task starts, Navvy finds your active tab, groups the task's tabs together, and asks the model
for a short Title-Case name for the group (falling back to a sensible default if naming is
unavailable). As you and the agent open or close tabs, the list stays in sync automatically — newly
opened tabs are adopted and closed ones drop off. Before each step, Navvy waits for the current tab
to finish loading so the agent never reasons about a half-rendered page.

## Including existing tabs

By default a task operates on the tab you started from plus any tabs the agent opens. The
experimental **Include all tabs** option (in [Settings → Advanced](/docs/reference/settings#advanced))
widens the starting set to all of your unpinned, allowed tabs, so the agent can work across pages you
already had open.

:::note[Where the coordination happens]
The agent's reasoning runs in the side panel, but tabs and tab groups live in the browser's
background service worker. Navvy bridges the two with message passing — see
[Architecture](/docs/internals/architecture) for the full picture.
:::
