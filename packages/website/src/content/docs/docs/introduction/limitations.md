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
