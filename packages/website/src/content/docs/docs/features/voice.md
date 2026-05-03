---
title: Voice Mode
description: Talk to Navvy and hear it respond, hands-free.
---

Voice mode wraps the text agent in speech: hold a key to talk, release to send, and hear the
agent's replies read back. It is an input/output layer around the same agent — everything you can
type, you can say.

![Navvy voice settings](/screenshots/ext-voice.png)

## Enabling voice

Open **Settings → Voice** and turn on **Enable voice mode**. This reveals the microphone button in
the composer and activates the push-to-talk shortcut. By default Navvy uses the browser's built-in
**Web Speech API**, which needs no API key and works out of the box.

## Providers

Speech-to-text (STT) and text-to-speech (TTS) are chosen **independently**, so you can mix a fast
recognizer with a high-quality voice:

- **Web Speech API** — zero-key, in-browser. The default for both directions.
- **OpenAI-compatible** — reuses your existing chat credentials for `audio/transcriptions` and
  `audio/speech`.
- **Groq** — fast cloud transcription (STT only).
- **ElevenLabs** — high-quality TTS, plus Scribe STT.
- **Deepgram** — low-latency STT and Aura TTS.

Each section has its own **test** button: TTS synthesizes and plays a phrase; STT records from your
mic and shows what it heard, validating the credentials end to end.

For the cloud providers, Navvy records your whole utterance and sends it in one request when you
finish speaking — simple and reliable, at the cost of no live partial transcript as you talk.

## Talking and listening

There are two ways to speak to Navvy:

- **Push-to-talk** — hold the push-to-talk key (default `` ` ``) to record and release to send. The
  key works both on the page and in the side panel — see [Shortcuts](/docs/features/shortcuts) to
  rebind it.
- **Tap the mic** — click the microphone button in the composer to start and stop recording, no key
  held.

Turn on **auto-speak** in settings to have the agent read its final answer aloud when a task
finishes. Playback is barge-in friendly: start a new recording and any in-progress speech stops
immediately.

:::caution[Microphone permission]
The side panel cannot show Chrome's microphone prompt directly. The first time you record, Navvy
surfaces a **Microphone access** control that opens in a tab where you can grant permission; the
warning clears automatically once access is granted.
:::

## Spoken questions

When the agent needs to ask you something mid-task, it speaks the question aloud. You press the mic
to answer by voice, and your spoken reply is fed straight back into the task.
