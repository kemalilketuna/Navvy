---
title: Models & Providers
description: Connect Navvy to any OpenAI-compatible model provider.
---

Navvy is model-agnostic. It talks to any provider that speaks the **OpenAI-compatible**
chat-completions API, so you can bring your own key and pick the model that fits your budget and
latency needs.

![Navvy provider settings](/screenshots/ext-providers.png)

## Choosing a provider

Open **Settings → Providers**, pick a provider preset, and Navvy fills in the right base URL and a
sensible default model. Presets ship for OpenAI, Anthropic, Gemini, Groq, DeepSeek, Mistral,
OpenRouter, xAI, Together, Fireworks, Cerebras, Perplexity, NVIDIA NIM, Cloudflare Workers AI,
Ollama, and a **Custom** option for anything else.

Enter your API key, choose a **Model**, and press **Test connection** to validate the credentials
before you run a task — the test fires a minimal request and reports HTTP or network errors inline.
Switching providers is painless: Navvy remembers each provider's key separately, so moving between
them doesn't make you re-type credentials.

:::tip[No key? Try it first.]
The bundled **Navvy Demo (testing)** provider lets you try Navvy without any setup. It routes
through a shared, rate-limited testing endpoint — switch to your own provider for real work. Because
the demo endpoint only accepts a canonical tool set, some features ([skills](/docs/features/skills),
tab naming, and free-form tools) are unavailable on it.
:::

## Vision models

If you attach an image to a task (capture the tab or upload a file), Navvy forwards it as an
OpenAI-compatible `image_url` content part. When the selected model is **not** vision-capable, the
attach button stays visible but disabled and explains why — so you always know whether images will
be understood.

## Reasoning models & token limits

Navvy adapts request parameters per model family. For GPT-5 and o-series reasoning models it sends
`max_completion_tokens` instead of `max_tokens`, and it honors a provider's `Retry-After` hint on
rate limits so retries wait the right amount of time instead of hammering the endpoint. Keys are
[encrypted at rest](/docs/features/data-masking#encryption-at-rest).
