---
title: Shortcuts
description: Single-key cancel and push-to-talk, working across the page and side panel.
---

Navvy gives you two single-key shortcuts and lets you rebind both. They are designed to be reachable
without reaching for a modifier combo.

![Navvy keyboard shortcut settings](/screenshots/ext-shortcuts.png)

## The shortcuts

- **Cancel running task — `Esc`.** Stops the agent immediately, aborting the in-flight model
  request (not just the step between actions). Active only while a task is running.
- **Push to talk — `` ` ``.** Hold to record, release to send. Requires [voice mode](/docs/features/voice)
  to be enabled.

Open **Settings → Shortcuts** and click a key to rebind it.

## Why single keys (a design note)

Chrome's built-in extension `commands` were the obvious first choice — but they **require a
`Ctrl`/`Alt`/`Cmd` modifier and reject bare keys**, and they fire only on key-down with no key-up,
which makes "hold to talk" impossible to express.

So Navvy implements both shortcuts as ordinary JavaScript `keydown`/`keyup` listeners: one in the
side panel, and one in a content script that bridges the keys to the panel so they work while you're
looking at the page. This unlocks single keys (`Esc`, `` ` ``), a real key-up for hold-to-talk, and
free rebinding.

:::note[The trade-off]
Content scripts can't run on restricted pages — `chrome://` settings, the Chrome Web Store, and the
PDF viewer — so the shortcuts won't fire there. We accept that gap in exchange for single-key,
hold-capable, rebindable ergonomics on the pages where automation actually happens.
:::
