---
title: Data Masking
description: Fill sensitive fields without ever sending the real values to the model.
---

Data masking lets Navvy fill in a card number, password, or any private value **without that value
ever reaching the language model**. You store it once, locally; the agent works with an opaque
token, and the real value is only ever written into the page.

![Navvy saved data settings](/shots/saved-data.png)

## How it works

Masking runs in two directions:

1. **Outbound (page → model): redaction.** Before the simplified page is sent to the model, any
   occurrence of a sensitive value is replaced with its token, e.g. `{{credit_card}}`. The model
   never sees the real number, even if it was already rendered on the page.
2. **Inbound (model → page): detokenization.** The model is told it may type `{{credit_card}}`
   into a field. Navvy intercepts the write, swaps the token for the real value at the last
   moment, and types it into the DOM. Tool results report only the token, never the value.

Because sensitive values are always redacted outbound, a value typed this step is re-masked on the
next read — so it never leaks back to the model.

## Saved data vs. masking

The same mechanism powers two needs, distinguished by a **sensitive** flag:

- **Sensitive** (card, password, SSN): redacted outbound **and** filled inbound. The model only
  sees the token.
- **Autofill** (name, address, email): filled inbound only. These aren't secret, so the agent may
  see them for context.

For multi-field data like an address, define one token per field — `{{addr_street}}`,
`{{addr_city}}`, `{{addr_zip}}` — so the agent can map each to the right input.

## Encryption at rest

Saved values and API keys are encrypted in local storage with device-bound **AES-GCM**, using a
non-extractable key. Encryption happens only at the storage boundary; legacy plaintext is migrated
transparently the first time you load.

:::caution[JavaScript execution is disabled with masking on]
When any masking entry is enabled, Navvy removes the `execute_javascript` tool, because arbitrary
page scripts could read a value back out and defeat the masking guarantee.
:::
