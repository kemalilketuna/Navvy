---
title: The Agent Loop
description: How Navvy reasons step by step — reflect, act, observe — until your task is done.
---

Navvy doesn't plan a whole task up front and run it blindly. It works the way a careful person does:
look at the page, decide one thing to do, do it, look again, and adjust. That cycle — **reflect →
act → observe** — repeats until the task is finished or a safety limit is reached.

## One step at a time

Each step runs the same four beats:

1. **Observe.** Navvy re-reads the page into a fresh outline (see
   [The DOM Pipeline](/docs/internals/dom-pipeline)) and notes anything relevant — the URL changed, a
   wait ended, the step budget is running low.
2. **Frame.** It assembles a single message for the model: your task, the running memory of what's
   happened so far, and the current page outline.
3. **Think and act.** The model returns exactly one [action](/docs/reference/actions), which Navvy
   validates and runs in the same round-trip.
4. **Record.** The model's reflection and the action's result are appended to the running history,
   and the loop comes back around.

This continues until the agent calls **done** or it reaches the **max steps** limit (40 by default,
adjustable in [Settings → Advanced](/docs/reference/settings#advanced)). As the budget gets close,
Navvy reminds the model how many steps remain so it can wrap up gracefully.

## Reflect before acting

The model never just returns a raw action. Every step it produces a small structured reflection
around the action:

- **Evaluation of the previous goal** — did the last action actually work? (success, failure, or
  unsure)
- **Memory** — durable progress notes: counts, items found, pages visited.
- **Next goal** — the immediate intent.
- **Action** — the single tool call to run.

Forcing this self-assessment each step is what keeps the agent honest. It can't quietly assume an
action succeeded just because it executed — it has to look at the new page state and judge. Those
reflections are fed back in as the running memory, giving the agent continuity across steps.

## Two kinds of events

Navvy tracks two separate streams:

- **History** — the persistent record of reflections and results that is fed back to the model each
  step. This is the agent's memory.
- **Activity** — transient UI signals (thinking, executing, retrying, an error) shown to *you* in the
  side panel. These are never sent to the model.

Errors are deliberately kept out of the model's history so a transient failure doesn't pollute its
reasoning — you see it, the agent moves on.

## Staying robust

Model providers differ in how they format responses, and networks fail. Two layers keep the loop
alive:

- **Retries.** A failed model call is retried with exponential backoff and jitter, honouring a
  provider's `Retry-After` hint, and never retrying things that shouldn't be (a cancelled task, an
  auth error). Errors are sorted into clear categories — auth, quota, rate limit, server, context
  length, content filter — so the UI can show a useful hint.
- **Auto-repair.** Slightly malformed model output is normalized before it runs — unwrapping extra
  layers, pulling JSON out of a text reply, coercing a shorthand into the expected shape, and falling
  back to a brief wait if no action came through at all.

## The rules it works under

Navvy's system prompt sets the agent's ground rules, including:

- Only act on indices it was actually shown.
- Re-check the page after typing, since new options may appear.
- Don't repeat the same ineffective action over and over.
- It can't solve captchas — finish and tell you instead.
- **Failing honestly is acceptable** — better than forcing a harmful or wrong action.
- Only declare success when the task is genuinely complete.

This last point is core to Navvy's design: traceability and predictability matter more than a
success rate inflated by guessing. See [Architecture](/docs/internals/architecture) for where this
loop runs and how it reaches the page.
