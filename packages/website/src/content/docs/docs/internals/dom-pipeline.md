---
title: The DOM Pipeline
description: From a live DOM to model-ready text to indexed actions.
---

Every step Navvy takes runs through the same pipeline: turn the live page into something a language
model can reason about, let the model decide, then act on the real page.

## 1. Extraction

The live DOM is walked into a flat tree of nodes. Each interactive element — links, buttons,
inputs, selects — is assigned a **stable index**. Indices, not CSS selectors, are how the model
refers to elements, which is why Navvy works on pages it has never seen.

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
