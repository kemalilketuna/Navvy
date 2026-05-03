---
title: Vision & Image Attachments
description: Attach a screenshot or image so a vision-capable model can see the page, not just read it.
---

Navvy normally reads a page as text — a compact outline of its interactive elements (see
[The DOM Pipeline](/docs/internals/dom-pipeline)). That's fast and token-cheap, but some tasks depend
on things text can't capture: a chart, a colour, a visual layout, or an image's contents. For those,
you can **attach an image** to your task so a vision-capable model can actually see it.

## Attaching an image

When your selected model supports images, the composer's **+** menu offers two sources:

- **Capture tab** — grabs a screenshot of the current tab's visible area as a PNG.
- **Upload image** — pick one or more image files from your computer.

Attachments appear as small thumbnails above the input; remove any of them before sending. When you
run the task, the images travel to the model alongside your instruction as standard
OpenAI-compatible image content, so every provider that understands images understands Navvy's
attachments.

## Model support

The attach button only enables for models flagged as vision-capable. If the current model is
text-only, the button stays visible but disabled and tells you why — sending images to a text-only
model would just error. Unknown models are treated as text-only to stay on the safe side. See
[Models & Providers](/docs/features/models#vision-models) for which models qualify and how to switch.

:::note[Images are task input, not per-step capture]
Attachments are part of your **initial instruction** — the framing you give up front. Navvy does
**not** automatically screenshot the page on every step; vision is context you choose to supply, not
something the agent captures on its own.
:::
