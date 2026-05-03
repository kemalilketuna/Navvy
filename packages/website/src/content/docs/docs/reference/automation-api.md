---
title: Automation API (Hub & MCP)
description: Drive Navvy programmatically — from a trusted page, an external app, or an MCP client.
---

Beyond the side panel, Navvy can be driven programmatically. Because the agent runs **inside your
real, authenticated browser session** — your logins, your cookies — these integrations relay tasks
*to* the extension rather than running the agent themselves.

There are three entry points, in increasing distance from the browser.

## Page API

A trusted web page can drive the agent directly. When the page presents the extension's **User Auth
Token** (found in [Settings → About](/docs/reference/settings#about)) in its `localStorage`, Navvy
exposes a small API on the page:

```js
window.PAGE_AGENT_EXT = {
  version,
  execute(task), // start a task
  stop(),        // stop the running task
}
```

Status, activity, and history events stream back to the page, so your own UI can follow along. This
is the lightest integration: no server, just a page you control plus the token.

## Hub (external apps)

The **Hub** is a bridge for apps running outside the browser. An external app opens a pinned Hub tab
pointed at a local WebSocket port; the tab connects back to your app and speaks a small JSON protocol
— send `execute`/`stop`, receive `ready`/`result`/`error`. The Hub runs one task at a time, and new
connections require your approval (unless you've opted into auto-approve). Manage it from
[Settings → About](/docs/reference/settings#about).

## MCP server

For MCP clients — Claude Desktop, IDEs, and other agent tooling — Navvy ships a companion **MCP
server** (`@page-agent/mcp`, binary `page-agent-mcp`). It exposes a single tool, `execute_task(task)`,
and under the hood runs a local bridge that opens the Hub and forwards each task to your extension,
returning the agent's final result.

Point your MCP client at the `page-agent-mcp` command. You can inject LLM credentials with
environment variables — `LLM_BASE_URL`, `LLM_MODEL_NAME`, `LLM_API_KEY` — or omit them to use the
extension's own provider configuration.

:::note[Why a relay instead of a standalone runner]
The whole point is to act in *your* session. An external server has none of your logins, so it can't
do the task itself — it hands the task to the extension that already lives in your authenticated
browser, and the extension does the work.
:::
