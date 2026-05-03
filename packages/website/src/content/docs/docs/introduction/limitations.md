---
title: Limitations
description: What Navvy can and cannot do today.
---

Navvy is powerful but not magic. Knowing its boundaries helps you get reliable results.

## Browser-native actions

Navvy drives the **page**, not the browser chrome. It dispatches synthetic keyboard and pointer
events, so page-level shortcuts and forms work — but browser-native shortcuts (`Ctrl+T`, `Ctrl+F`,
`Ctrl+S`) and the address bar are out of reach, because synthetic events are not trusted by the
browser for those.

## Restricted pages

Content scripts cannot run on `chrome://` pages, the Chrome Web Store, or the PDF viewer. On those
pages the on-page cursor and the [single-key shortcuts](/docs/features/shortcuts) won't function.

## Model-dependent quality

Navvy is only as good as the model behind it. Smaller or heavily rate-limited models make more
mistakes on complex, multi-step tasks. For anything intricate, prefer a capable model and watch the
step history — you can stop with `Esc` at any time.

## Logins, captchas, and payments

Navvy acts in your session, so it can use pages you're already logged into — but it will not solve
captchas for you, and you should review anything irreversible (payments, deletions) before letting
it proceed.

## Current capability gaps

A few things Navvy doesn't do yet — useful to know before you plan a task around them:

- **No file uploads.** Navvy can't pick a file for an `<input type="file">`.
- **No standalone hover.** Hover only happens as part of a click; there's no separate "hover over
  this" action.
- **Some rich-text editors.** Code editors like Monaco, CodeMirror, and Draft.js aren't supported for
  typing. Ordinary inputs, textareas, and common `contenteditable` editors work fine.
- **Exact-match masking.** [Data masking](/docs/features/data-masking) redacts values by exact text,
  so a value the page reformats (for example, spacing a card number differently) may not be caught.
- **One step at a time.** Navvy runs a single action per step and re-reads the page between them, so
  throughput is bounded by model latency — reliable, but not instantaneous.

