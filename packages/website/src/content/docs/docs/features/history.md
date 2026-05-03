---
title: Conversation History
description: Every completed run is saved locally so you can review, re-run, or export it.
---

Navvy keeps a record of each task it runs, so you can look back at what happened, run something again
without retyping it, or export a run to share or debug. History lives entirely on your device.

## What gets saved

When a run finishes with any recorded steps, Navvy stores a session containing the original task, the
full step-by-step history, a status, and a timestamp. A task you stop early is saved too, marked as
interrupted, so you never lose the trail of what the agent did.

## Reviewing and re-running

The history list shows your runs newest-first, each with a status icon, the task text, how long ago
it ran, and how many steps it took. From a run you can:

- **Re-run** — start the same task again from scratch.
- **Export** — download the full session as a formatted JSON file, named for the task and time, for
  sharing or debugging.
- **Delete** — remove a single run, or use **Clear all** to wipe the history.

Opening a run shows its complete step stream — the agent's reflections and the result of each
action — read-only, exactly as it happened.

:::note[Stored locally]
History is kept in your browser's local database and never leaves your device. Clearing it is
permanent — export anything you want to keep first.
:::
