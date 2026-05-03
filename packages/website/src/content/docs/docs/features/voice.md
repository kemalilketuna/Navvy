---
title: Voice Mode
description: Talk to Navvy and hear it respond, hands-free.
---

Voice mode wraps the text agent in speech: hold a key to talk, release to send, and hear the
agent's replies read back. It is an input/output layer around the same agent — everything you can
type, you can say.

![Navvy voice settings](/shots/voice.png)

## Enabling voice

Open **Settings → Voice** and turn on **Enable voice mode**. This reveals the microphone button in
the composer and activates the push-to-talk shortcut. By default Navvy uses the browser's built-in
**Web Speech API**, which needs no API key and works out of the box.

## Providers

Speech-to-text (STT) and text-to-speech (TTS) are chosen **independently**, so you can mix a fast
recognizer with a high-quality voice:

- **Web Speech API** — zero-key, in-browser. The default.
- **OpenAI-compatible** — reuses your existing chat credentials for `audio/transcriptions` and
  `audio/speech`.
- **ElevenLabs** — high-quality TTS (and Scribe STT).
- **Deepgram** — low-latency streaming STT.

Each section has its own **test** button: TTS synthesizes and plays a phrase; STT records from your
mic and shows what it heard, validating the credentials end to end.

## Push-to-talk

Hold the push-to-talk key (default `` ` ``) to record and release to send. The key works both on
the page and in the side panel — see [Shortcuts](/docs/features/shortcuts) to rebind it.

:::caution[Microphone permission]
The side panel cannot show Chrome's microphone prompt directly. The first time you record, Navvy
surfaces a **Microphone access** control that opens in a tab where you can grant permission; the
warning clears automatically once access is granted.
:::

## Spoken questions

When the agent needs to ask you something mid-task, it speaks the question aloud. You press the mic
to answer by voice, and your spoken reply is fed straight back into the task.
