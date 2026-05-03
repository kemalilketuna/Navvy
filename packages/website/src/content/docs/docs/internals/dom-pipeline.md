---
title: The DOM Pipeline
description: From a live DOM to model-ready text to indexed actions.
---

Every step Navvy takes runs through the same pipeline: turn the live page into something a language
model can reason about, let the model decide, then act on the real page.

## 1. Extraction

The live DOM is walked into a flat map of nodes, with same-origin iframes, open shadow DOM, and rich
`contenteditable` editors all traversed so nothing operable is missed. Each interactive element gets
a numeric **index**. Indices, not CSS selectors, are how the model refers to elements, which is why
Navvy works on pages it has never seen. Each indexed node keeps a **live reference** to the real DOM
element, so acting on an index is exact and immediate.

### What counts as interactive

Reliably detecting "can a human click this?" is harder than checking the tag name — sites wire up
plain `<div>`s all the time, and the APIs that would reveal event listeners only exist in DevTools.
Navvy layers several signals, in priority order:

1. **Cursor style** — the primary heuristic. If the page styles an element with `cursor: pointer`
   (or `text`, `move`, `grab`, and similar), its author almost certainly made it interactive.
2. **Native tags** — `a`, `button`, `input`, `select`, `textarea`, and friends, unless disabled.
3. **`contenteditable`** regions.
4. **Dropdown hints** like `aria-haspopup` or `data-toggle="dropdown"`.
5. **ARIA roles** — `button`, `menuitem`, `tab`, `switch`, `slider`, `combobox`, and so on.
6. **Scrollable containers**, so the agent can scroll an inner region, not just the page.

To keep the outline clean, Navvy assigns **one index per logical control** — it won't separately
number a button and the `<span>` inside it — and only considers elements that are actually visible and
not hidden behind something else.

## 2. Dehydration

That tree is dehydrated into compact text: visible labels, roles, values, and indices, with the
noise stripped out. The goal is a representation small enough to fit comfortably in a prompt while
preserving everything the model needs to choose an action.

## 3. Reasoning

The model receives the dehydrated page plus your task and returns a single next action — _click 7_,
_type "Rome" into 3_, _scroll down_, _navigate_. Navvy reflects before acting: the model reasons
about the page state, then commits to one tool call.

## 4. Indexed action

Navvy maps the chosen index back to the real element and performs the action through the page
controller. Typing dispatches real `input` events (with `inputType`) so autosuggest and validation
behave exactly as they would for a human, and the field isn't blurred afterward so popups stay open.

Then the loop repeats: re-extract, re-reason, re-act — until the task is done or you press `Esc`.

## Why indices, not selectors

Recorded selectors break the moment a layout changes. By re-deriving indices from the live DOM on
every step, Navvy adapts to dynamic pages, A/B tests, and redesigns without any per-site
maintenance — the same reason [skills](/docs/features/skills) re-execute as guided plans rather
than replayed clicks.

Because indices are re-derived each step, they are **per-step labels**, not durable IDs — element 7
this step may be a different element next step. That's by design: the agent always acts on the page as
it is *right now*. See [Action Execution](/docs/internals/action-execution) for what happens once the
model picks an index.
