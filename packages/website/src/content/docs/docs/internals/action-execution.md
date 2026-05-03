---
title: Action Execution
description: How Navvy turns "click element 7" into events that even React- and framework-driven widgets accept.
---

Deciding *what* to do is the model's job; *doing* it reliably is the page controller's. The hard part
is that modern web apps don't respond to naive automation — a framework-controlled input ignores a
plain value assignment, and a custom widget ignores a synthetic `click()`. Navvy executes actions by
**simulating what a real user's browser does**, event for event.

## Clicking

Instead of calling `element.click()`, Navvy dispatches the full pointer-and-mouse sequence a real
click produces:

1. Clear any leftover hover or focus from the previous action.
2. Scroll the target (and its iframe, if nested) into view.
3. Glide the on-screen cursor to it and play the click animation.
4. Hit-test the exact coordinates to find the deepest real element there — matching how a browser
   routes a physical click.
5. Fire the events in spec order: `pointerover → mouseover → pointerdown → mousedown → focus →
   pointerup → mouseup → click`, with focus landing between mousedown and mouseup, just as browsers
   do it.

This is what makes hover menus, custom dropdowns, and widgets that only listen for low-level events
respond correctly.

## Typing

Framework-controlled inputs (React, Ant Design, and similar) override the field's value internally
and never see a direct assignment. So for native inputs and textareas Navvy writes through the
**native value setter** taken from the element's own prototype — bypassing the framework's override —
and then dispatches real `beforeinput`/`input` events so the framework's `onChange` fires and
validation and autosuggest behave exactly as they would for a human. The field is deliberately
**not** blurred afterward, so typeaheads and suggestion lists stay open.

For rich `contenteditable` editors, Navvy tries a synthetic-input approach first and falls back to
the browser's text-insertion command if the text didn't land — covering the common editors. A few
heavyweight code editors (Monaco, CodeMirror, Draft.js) are not supported for text input.

## Everything else

- **Select** matches a native `<select>` option by its text and fires `change`.
- **Scroll** walks up the DOM to find a genuinely scrollable container (or scrolls the window),
  moving by whole viewports or an explicit pixel amount.
- **Send keys** parses combos like `ctrl+shift+a` and dispatches `keydown`/`keyup` to the focused
  element — it presses keys, it doesn't type characters (use typing for that).
- **Drag and drop** fires both pointer/mouse events and HTML5 drag events with a shared data payload
  across several interpolated steps, so it works with both native drag-and-drop and pointer-based
  libraries.

## Errors and stale elements

Actions don't retry at this layer — each runs once and, on failure, returns a clear `❌` message that
goes straight to the agent rather than being silently swallowed. Navvy doesn't try to revalidate
individual elements either; instead it **re-reads and re-numbers the whole page between steps**, so
staleness is handled by the loop, not by patching nodes. One friendly special case: when a click
triggers a navigation that tears down the page before a response comes back, Navvy reports it as a
**successful** click rather than a spurious error.

See [The DOM Pipeline](/docs/internals/dom-pipeline) for how elements get their indices in the first
place, and [Architecture](/docs/internals/architecture) for how these operations reach the page from
the side panel.
