# Navvy — "Under the Hood" Decision Catalog

Research material for the End-of-Project report (Methodology + Results). Harvested from the
commit history, `docs/plans/voice-teach-masking.md`, `AGENTS.md`, and the code seams on
2026-06-03. Each entry is a real engineering decision with the **Problem → First approach →
Limitation → Final design → Trade-off** shape and commit refs, ready to be written up.

**Naming discipline (critical):** present every item as a Navvy design decision authored by us.
Some commit messages (`4ea39524`, `f5bce5a9`, `611aa85d`) mention a "fork" / inherited origin —
**do not** reproduce that framing anywhere in the report. The *engineering* in those commits is
still ours to narrate; just drop the origin story.

Legend: ⭐ = headline story (write in depth) · ▸ = supporting story (write briefly).

---

## A. Input & keyboard shortcuts

### ⭐ A1. Cancel + push-to-talk: Chrome `commands` → content-script/side-panel JS listeners
*(the headline trade-off — commits `875dae2c`, `d6f91a64`, `273e56f7`)*
- **Problem:** give the user a one-key "stop the agent" and a hold-to-talk mic key that work
  while they're looking at the page.
- **First approach:** Chrome manifest `chrome.commands` (`875dae2c` bound `Ctrl/Cmd+Shift+X` →
  background relays `CANCEL_ACTION` to the side panel → `stop()`).
- **Limitations:** (a) `commands` **require a `Ctrl`/`Alt`/`Cmd` modifier and reject bare single
  keys**; (b) they fire once on keydown with **no key-up**, so hold-to-talk is inexpressible;
  (c) the content scripts that capture page-level keys **cannot inject on `chrome://`, the Chrome
  Web Store, or PDF-viewer pages**.
- **Final design:** move both to **JS `keydown`/`keyup` listeners** in the side panel + a
  **content script** bridged over the runtime message bus — enabling single keys (**Esc** to
  cancel while running, hold **`` ` ``** to talk/release-to-send) and a true key-up. Later made
  **rebindable** via a Shortcuts settings tab (`shortcutsConfig`, live-reloaded through
  `storage.onChanged`).
- **Trade-off accepted:** listeners don't run on restricted pages (`chrome://`, Web Store, PDF).
  We chose single-key, hold-capable, rebindable ergonomics over universal page coverage —
  usability over completeness, stated openly.

### ▸ A2. Opening the side panel: custom command → built-in `_execute_action`, preserve user gesture
*(commits `38ba410a`, `8e7c4155`, `95dbef6a`)*
- Added `Ctrl/Cmd+Shift+E`, then discovered `chrome.sidePanel.open` **must be called
  synchronously inside the `onCommand` handler** — `await tabs.query(...)` first loses the user
  gesture and the open silently fails. Final: bind to the built-in `_execute_action`
  (`Cmd/Ctrl+E`), open synchronously with the tab the handler already provides.

---

## B. Voice mode (STT/TTS, push-to-talk)

### ⭐ B1. Provider-agnostic audio layer + free Web Speech fallback
*(commit `a96b8123`; design in `voice-teach-masking.md` Phase C)*
- One `SttClient`/`TtsClient` interface (`packages/llms/src/audio/`) with OpenAI-compatible,
  ElevenLabs, Deepgram, **and** browser Web Speech implementations; STT and TTS chosen
  independently; OpenAI-compatible audio **reuses the chat credentials**. Default is Web Speech
  (zero-key, works out of the box). Decision: ship an input/output *shell* around the existing
  text agent, not an always-listening mode.

### ▸ B2. Hold-to-talk needs a key-up → content-script bridge
- `chrome.commands` has no key-up (see A1), so PTT uses raw `keyup`/`keydown` and a content
  script that forwards `VOICE_PTT_DOWN/UP` runtime messages so the gesture works globally, not
  only when the side panel is focused.

### ⭐ B3. MV3 microphone permission can't prompt from the side panel
*(commits `607e6df7`, `eca3b3ce`, `8ffe2dc9`)*
- **Problem:** Web Speech / `getUserMedia` failed **silently** with `not-allowed` because the
  side panel document **cannot show the mic permission prompt**.
- **Final design:** track mic permission and **warn up front** (on panel open + on mic press,
  not only after a failure); add a "Microphone access" control in settings that **opens in a tab**
  (which *can* prompt); surface transcription errors/empty results via toast; listen for
  permission changes so the warning clears live. Also **stopped auto-arming** capture after
  `ask_user` — the question is spoken but the user starts the mic (`8ffe2dc9`).
- **Trade-off:** an extra click/tab to grant the mic, accepted because MV3 gives the side panel
  no prompt surface.

### ▸ B4. Voice language: free text → dropdown, empty = auto-detect *(commit `44521db1`)*
- Replaced a free-text hint with a Select of Auto + supported ISO-639-1 codes (accepted by both
  network STT and Web Speech); empty selection passes through as `undefined` so providers
  auto-detect.

---

## C. Data masking & at-rest encryption

### ⭐ C1. Mask sensitive values without ever sending them to the LLM
*(commit `bbd873d5`; design in `voice-teach-masking.md` Phase B)*
- **Two directions:** outbound `transformPageContent` redacts real values → `{{token}}`; inbound
  `input_text`/`send_keys`/`select_dropdown_option` overrides detokenize `{{token}}` → real value
  *just before the DOM write*, and tool results echo only the token. Introduced the **compose
  refactor** in `MultiPageAgent` (one seam merging `customTools` + `transformPageContent` +
  `getPageInstructions`).
- **Safety coupling:** when masking is on, `execute_javascript` is **force-disabled** (it could
  bypass the mechanism). Round-trip is leak-free because `sensitive` entries are always re-masked
  outbound next step.

### ⭐ C2. Encrypt API keys + masking values at rest *(commit `a4f7736c`)*
- **Threat model:** secrets sat in plain `chrome.storage.local`. **Design:** device-bound
  **AES-GCM** with a **non-extractable key in IndexedDB**; encryption lives **only at the storage
  boundary** (runtime config stays plaintext); legacy plaintext **migrated transparently** on
  load; decrypt failures **degrade to unset rather than crash**. Doc note updated plaintext →
  encrypted (`d240eca1`).

### ▸ C3. Validate saved-data entries before persisting *(commit `5a64b73b`)*
- Drop blank rows silently; block save when a non-blank entry misses its required token/value,
  with inline errors — partial/corrupt entries can't be stored.

---

## D. Teach → Skills

### ⭐ D1. Reusable skills: register-all tools + advertise-matching per URL; guided NL sub-task
*(commit `0446e485`; design in `voice-teach-masking.md` Phase D)*
- **Why register-all + advertise-matching (not register-per-URL):** `customTools` is built **once
  at construction**, but the URL changes per step. So all enabled skills register as
  `skill_<slug>` tools up front, and `getPageInstructions(url)` (re-evaluated per step) advertises
  only the URL-matching ones. Tool names are assigned over the **full active set** so registration
  and per-URL instructions always agree.
- **Execution model:** **guided natural-language sub-task** — invoking a skill injects its
  interpolated plan as authoritative steps for the existing loop, rather than brittle
  record-and-replay of action indices.

### ▸ D2. Skill refiner forces a tool call → thread `disableNamedToolChoice` *(commit `82bc5175`)*
- The refiner forces a single tool call; providers with `disableNamedToolChoice` reject a named
  `tool_choice`, so the flag is threaded through exactly as the main agent does.

### ▸ D3. Author skills by text when voice is unavailable *(commit `c0954fc8`)*
- The narration box + Refine are always available (mic is a pure optional add-on) so skills can be
  authored when voice is off / blocked / mis-recognized; the review screen can correct the
  narration and re-run the refiner.

---

## E. Agent engine & LLM robustness

### ⭐ E1. Distinguish user aborts from real errors *(commit `88f08126`)*
- **Bug:** `stop()` threw `Error('AbortError')` whose `name` was still `'Error'`, so guards never
  matched — the LLM retried twice and the panel showed bogus "Error: AbortError" cards.
- **Fix:** throw a proper **`DOMException` AbortError** and centralize detection in an
  `isAbortError` helper; the abort signal is threaded into `llm.invoke(...)` so the **in-flight
  network call** is cancelled mid-step, and aborts no longer retry. (User abort → `stopped`
  status, amber dot — `3316db68`.)

### ⭐ E2. Provider compatibility hardening (OpenAI-compatible ≠ uniform)
*(commits `04bd4f50`, `3d23dc5a`, `44644e80`, `a0aba8b1`)*
- **Retry-After:** honor the provider's `Retry-After` header / Groq's "try again in Ns" message
  (+ jitter, 60s cap) instead of a fixed 100 ms, so retries don't instantly re-hit the limit.
- **Groq strict tool validation:** Groq rejects any tool name not in `request.tools`; some models
  call the nested action directly, bypassing the `AgentOutput` wrapper. Mirror nested action names
  as **minimal stub tool entries** when the baseURL is Groq, then repack downstream.
- **Token-cap key per model:** GPT-5/o-series reject `max_tokens`; pick `max_completion_tokens`
  for them so connection tests work everywhere.
- **Redundant named `tool_choice`:** some OpenAI-compatible gateways 403 on the named form;
  `tool_choice: "required"` already forces the single tool, so drop the named shape.

### ⭐ E3. Provider-aware tool & prompt gating *(commits `c3d88da8`, `dfd8f340`, `a5c8d620`, `0231e327`)*
- A `requiresFullProvider` flag + `restrictedToolset` strips advanced tools (`send_keys`,
  `go_back`, `scroll_to_text`, `get_dropdown_options`, `drag_and_drop`) for prompt-locked
  providers; a `restrictsSystemPrompt` flag declaratively marks providers (e.g. a testing proxy)
  that reject non-canonical system prompts, so Navvy skips a **guaranteed-to-fail** request rather
  than 403-ing and logging noise. The tab-title summarizer was isolated from the agent's retry/
  event bus so its failures never surface as task errors.

### ▸ E4. Actionable quota/auth error hints *(commit `8ac839af`)*
- Detect quota-exceeded / auth-failed on the error card and show a short explanation + "Open
  provider settings" link instead of a raw stack.

### ▸ E5. LLM-summarized tab-group titles, entity-focused *(commits `86928c43`, `39b24381`, `62f309c6`)*
- Replace stopword heuristics with a 1–2 word LLM summary (fallback to heuristic on error),
  tuned with few-shot examples to prefer the specific named entity over navigation verbs/generic
  destinations.

---

## F. Page Controller & DOM grounding

### ⭐ F1. `input_text` must trigger real typeaheads *(commit `3ec4cd97`)*
- **Bug:** a bare `Event('input')` was ignored by listeners that check `inputType`, and blurring
  the field after typing closed autosuggest popups (e.g. Wikipedia search) and fired premature
  validation. **Fix:** dispatch `InputEvent` with `inputType`/`data` (+ a `beforeinput` pair) and
  **stop blurring** — synthetic typing now behaves like a real user for autosuggest/validation.

### ⭐ F2. Persist the simulator cursor across cross-origin navigations *(commits `43b26fe5`, `e1a42011`, `8446c73e`, `ac4e6169`)*
- The content script recreates the `PageController` on navigation, snapping the cursor to viewport
  center. Persist position + rotation + a visibility flag to `chrome.storage.local` (with
  `sessionStorage` fallback) and resume without re-animating, so the on-page presence is
  continuous. **MV3 detail:** `chrome.storage.session` is **unusable from content scripts** without
  an explicit access-level grant from the service worker — hence `storage.local`.

---

## G. Extension architecture (MV3)

### ⭐ G1. Settings as a standalone page + shared `configStore` synced via storage events
*(commits `dffccedf`, `d03a64fb`, `9046bcb0`)*
- Moving Settings/Skills out of the side panel into `settings.html` required a shared `configStore`
  so the side panel stays in sync through `chrome.storage` change events — the same allow-listed
  `onChanged` mechanism every feature relies on. Closing settings restores the user's prior tab
  (stashed in `chrome.storage.session`) and reopens the side panel there.

### ▸ G2. New Chat resets the agent to prevent context leak *(commit `4a16e2ad`)*
- New Chat fully resets `MultiPageAgent` so history/observations/`lastURL` don't bleed into the
  next prompt.

### ▸ G3. Split UI language vs. agent response language *(commit `01b81fda`)*
- Independent `language` (UI) and `responseLanguage` (agent directive) keys; response defaults to
  Auto so the agent mirrors the task language unless pinned.

### ▸ G4. Image attachments with vision-capability gating *(commit `e34cac29`)*
- `+` menu captures the visible tab or uploads a file, forwarded as OpenAI-compatible `image_url`
  parts (widened `Message.content`, `TaskAttachment` threaded through `execute`); on non-vision
  models the button stays visible but disabled with an explanatory toast.

---

## H. i18n & build/workspace

### ▸ H1. Two i18n systems, one file per language *(commits `c74706d0`, `3aa79bed`)*
- Manifest `__MSG__` strings (`public/_locales/*/messages.json`) and React `t()` strings
  (`src/lib/locales/*.ts`) are **separate systems** that can't be unified; locales were split one
  file per language with the English file owning the schema type so others stay type-checked.
  Seven locales (en, de, es, fr, it, pt, tr).

### ▸ H2. `workspace:*` protocol — the stale-dist bug *(commits `d23129d9`, `18256b15`, `bfe0b518`)*
- Internal deps pinned to an exact version string made pnpm resolve **registry copies** instead of
  local builds, so source edits silently shipped stale `dist/`. Switching to `workspace:*` (and
  adding `pnpm-workspace.yaml`, since pnpm ignores the `workspaces` field) made local edits
  actually reach the bundle; `workspace:*` is rewritten at publish time so the artifact is
  unchanged.

---

## Suggested selection for the report

**Methodology** (how the system works): A1, B1, C1, D1, E3, F1/F2, G1 — these explain the
architecture and the seams.

**Results & Discussion** (decisions, trade-offs, what we learned): A1 ⭐ (the headline), B3, C2,
E1, E2 — each is a clean "problem → trade-off" narrative with a defensible engineering judgment.

Keep the rest (▸) as a "further engineering notes" appendix or short call-outs so the catalog's
breadth shows without bloating the graded sections.
