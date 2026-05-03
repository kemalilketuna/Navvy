---
title: Actions & Tools
description: The full set of actions the agent can take on a page, and how it targets elements.
---

Every step, the model chooses exactly **one action** from a fixed vocabulary. Each action takes the
**index** of an element from the page outline (see [The DOM Pipeline](/docs/internals/dom-pipeline)),
or a tab id, or a bit of text. This page lists what the agent can do.

## Page actions

| Action | Parameters | What it does |
| --- | --- | --- |
| `click_element_by_index` | `index` | Click an element |
| `input_text` | `index`, `text` | Focus a field and type into it |
| `select_dropdown_option` | `index`, `text` | Choose an option in a native `<select>` by its text |
| `get_dropdown_options` | `index` | Read the options of a native `<select>` |
| `scroll` | `down`, `num_pages`, `pixels?`, `index?` | Scroll the page, or a scrollable container by index |
| `scroll_horizontally` | `right`, `pixels`, `index?` | Scroll sideways |
| `scroll_to_text` | `text` | Find text on the page and bring it into view |
| `send_keys` | `keys` | Press key combinations such as `Enter`, `Tab`, or `ctrl+a` |
| `drag_and_drop` | `source_index`, `target_index` | Drag one element onto another |
| `go_back` | — | Navigate back in history |
| `wait` | `seconds` (1–10) | Pause briefly |
| `ask_user` | `question` | Ask you a question mid-task (when answering is wired up) |
| `done` | `text`, `success` | Finish the task and report the result |

## Tab actions

When [multi-tab automation](/docs/features/multi-tab) is in play, the agent also has:

| Action | Parameters | What it does |
| --- | --- | --- |
| `open_new_tab` | `url` | Open a URL in a new tab and switch to it |
| `switch_to_tab` | `tab_id` | Make another task tab the current one |
| `close_tab` | `tab_id` | Close a tab |

## How targeting works

There is no separate "find the element" step. The page outline already numbers every operable
element, so the model names an `index` directly and Navvy maps it back to the real element to act on.
The agent is constrained to **only use indices it was actually shown**, which removes selector
guesswork. After an action, Navvy re-reads the page and re-numbers everything, so the next step always
works from a fresh, accurate outline.

## One action at a time

Navvy deliberately runs a single action per step rather than batching a plan. Each action's result —
and the freshly re-read page — inform the next decision, which is what lets the agent adapt to pages
that change as it works (a dropdown opening, a form revealing new fields, a navigation).

## Tools that aren't always available

The tool set is composed per run:

- **`execute_javascript`** (run arbitrary page script) is **off by default** and experimental. It is
  also **force-disabled whenever [data masking](/docs/features/data-masking) is active**, because a
  script could read a masked value straight out of the page and defeat the masking guarantee.
- **`ask_user`** is present only when there's a way to surface the question to you.
- **Skills** appear as extra `skill_<name>` actions, but only on pages their URL pattern matches —
  see [Teach → Skills](/docs/features/skills).
- On the bundled demo provider, tools that need a full provider (and skills, and tab naming) are
  stripped, since the shared testing endpoint only accepts a canonical tool set.
