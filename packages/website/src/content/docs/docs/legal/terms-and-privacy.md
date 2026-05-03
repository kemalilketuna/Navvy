---
title: Terms & Privacy
description: How Navvy handles your data and the terms of use.
---

## Your data stays local

Navvy stores your settings, API keys, and saved values in your browser's local storage on your
device. Secrets — provider and voice API keys, saved credentials, and masking values — are
**encrypted at rest** with device-bound AES-GCM. Navvy has no backend of its own and does not
collect or transmit your data to us.

## What gets sent to your model provider

To complete a task, Navvy sends the simplified page content and your instructions to the model
provider **you configure**. With [data masking](/docs/features/data-masking) enabled, values you
mark sensitive are replaced with opaque tokens before anything leaves your browser. Your use of a
provider is governed by that provider's own terms and privacy policy.

## The testing provider

The bundled **Navvy Demo (testing)** provider routes requests through a shared, rate-limited
endpoint so you can try Navvy without a key. Do not send sensitive data through the testing
endpoint; configure your own provider for real work.

## Permissions

Navvy requests only the browser permissions it needs to read and act on the pages you ask it to
automate. It acts within your existing browser session.

:::note
This page summarizes Navvy's data handling for the documentation site. For the authoritative terms,
see the project repository.
:::
