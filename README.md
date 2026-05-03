# Navvy

> An AI agent that drives your browser. Tell it what to do — it does the clicking.

[![License: MIT](https://img.shields.io/badge/License-MIT-auto.svg)](https://opensource.org/licenses/MIT) [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/) [![GitHub stars](https://img.shields.io/github/stars/kemalilketuna/Navvy.svg)](https://github.com/kemalilketuna/Navvy)

[🌐 **Website**](https://navvy-extension.site) | [📖 **Docs**](https://navvy-extension.site/docs/introduction/overview) | [⬇️ **Releases**](https://github.com/kemalilketuna/Navvy/releases)

---

**Navvy** is a browser extension that turns natural-language instructions into real actions on the
web. You tell it what you want — _"find the cheapest direct flight to Rome next weekend and start the
booking"_ — and it reads the page, decides what to do, and carries out the clicks, typing, scrolling,
and navigation on your behalf.

## 🧠 How it works

Navvy runs a tight perception–reasoning–action loop:

1. **Read the page.** Navvy extracts the live DOM into a compact, model-friendly representation,
   assigning each interactive element a stable index.
2. **Reason.** A language model receives that simplified page plus your task and decides the next
   action — click element 7, type into element 3, scroll, navigate, and so on.
3. **Act.** Navvy executes the action against the real page through its page controller, then
   re-reads the page and repeats until the task is done.

This indexed approach means Navvy works on pages it has never seen before, without brittle
hand-written selectors.

## ✨ Features

- **[Models & Providers](https://navvy-extension.site/docs/features/models)** — bring your own key for any OpenAI-compatible model.
- **[Voice Mode](https://navvy-extension.site/docs/features/voice)** — speak your tasks and hear the answers, with a free in-browser option.
- **[Data Masking](https://navvy-extension.site/docs/features/data-masking)** — fill secrets into forms without sending them to the model.
- **[Teach → Skills](https://navvy-extension.site/docs/features/skills)** — turn a one-time narration into a reusable automation.
- **[Multi-Tab Automation](https://navvy-extension.site/docs/features/multi-tab)** — let one task span and coordinate several tabs.
- **[Vision & Images](https://navvy-extension.site/docs/features/vision)** — attach screenshots so a vision model can see the page.
- **[Conversation History](https://navvy-extension.site/docs/features/history)** — review, re-run, and export past tasks.
- **[Shortcuts](https://navvy-extension.site/docs/features/shortcuts)** — single-key cancel and push-to-talk, fully rebindable.
- **[Automation API](https://navvy-extension.site/docs/reference/automation-api)** — drive Navvy from a page, an external app, or an MCP client.

## 🚀 Quick Start

1. **Install the extension.** Download the latest build from the
   [releases page](https://github.com/kemalilketuna/Navvy/releases) and load it in Chrome.
2. **Open the side panel.** Click the Navvy icon, or press `Ctrl/Cmd+E`.
3. **Connect a model.** Open **Settings → Providers**, choose a provider, paste your API key, and
   press **Test connection**. To try Navvy with no setup, leave it on **Navvy Demo (testing)**.
4. **Run a task.** Type a plain-language instruction and press Enter — for example,
   _"Search Wikipedia for the Eiffel Tower and open the article."_

See the [Quick Start guide](https://navvy-extension.site/docs/introduction/quick-start) for the full walkthrough.

## 🛠️ Development

Navvy is a pnpm monorepo. The engine packages (`core`, `llms`, `page-controller`, `page-agent`)
provide the headless agent; `extension` and `ui` provide the Navvy product surface; `website` is the
docs site and `mcp` is the MCP server.

```bash
pnpm install         # install workspace dependencies
pnpm dev:website     # run the docs/landing site
pnpm dev:ext         # run the extension in dev mode
pnpm run build:libs  # rebuild engine libraries (before building extension/website)
pnpm run build:ext   # build and zip the extension
pnpm run typecheck   # typecheck all packages
```

See [`AGENTS.md`](AGENTS.md) for the full monorepo layout and module boundaries.

## 🤝 Contributing

We welcome contributions from the community! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Contributions generated entirely by **bots or AI** without substantial human involvement will **not
be accepted**.

## ⚖️ License

[MIT License](LICENSE)

## 👏 Acknowledgments

Navvy is a fork of [`page-agent`](https://github.com/alibaba/page-agent), which builds upon the
excellent work of [`browser-use`](https://github.com/browser-use/browser-use).

```
DOM processing components and prompt are derived from browser-use:

Browser Use <https://github.com/browser-use/browser-use>
Copyright (c) 2024 Gregor Zunic
Licensed under the MIT License

We gratefully acknowledge the browser-use project and its contributors for their
excellent work on web automation and DOM interaction patterns that helped make
this project possible.
```

---

**⭐ Star this repo if you find Navvy helpful!**
