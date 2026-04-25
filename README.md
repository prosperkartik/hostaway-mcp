# hostaway-mcp

> Connect Claude to your Hostaway PMS via the Model Context Protocol.

`hostaway-mcp` is an open-source [MCP](https://modelcontextprotocol.io) server that lets Claude (in Claude Desktop, Claude Code, or any MCP-compatible client) query your Hostaway account: listings, reservations, and more on the way.

[![npm version](https://img.shields.io/npm/v/hostaway-mcp.svg?style=flat-square)](https://www.npmjs.com/package/hostaway-mcp)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)

<!-- demo gif goes here once recorded -->

## Why

Vacation rental operators spend hours every day asking the same questions of their PMS: *what's checking in this week, what's the status of reservation #X, which listings are active?* `hostaway-mcp` puts those answers one Claude conversation away — and gives AI agents the building blocks to take real action on STR ops.

## What it does (v0.1)

| Tool | Description |
|---|---|
| `list_listings` | List properties on the connected Hostaway account |
| `list_reservations` | List reservations, with optional filters by arrival date range and status |
| `get_reservation` | Full detail for a single reservation by id |

All v0.1 tools are **read-only**. Write operations (sending messages, blocking calendar dates, etc.) are coming in later versions, gated behind explicit confirmation.

## Quick start

### 1. Get your Hostaway API credentials

In your Hostaway operator account, go to **Settings → Hostaway API** and generate API credentials. You'll get an **Account ID** and an **API Key** (in OAuth terms these are the `client_id` and `client_secret`).

### 2. Configure Claude Desktop

Open `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows) and add:

```json
{
  "mcpServers": {
    "hostaway": {
      "command": "npx",
      "args": ["-y", "hostaway-mcp"],
      "env": {
        "HOSTAWAY_ACCOUNT_ID": "your-account-id",
        "HOSTAWAY_API_KEY": "your-api-key"
      }
    }
  }
}
```

Restart Claude Desktop. The Hostaway tools will appear in the tools picker.

### 3. Try it

Ask Claude things like:

- *"List my Hostaway listings."*
- *"What reservations are checking in next week?"*
- *"Tell me about reservation 12345."*

## Use with Claude Code

Same config works in Claude Code — add the snippet to your MCP config and Claude Code will pick it up.

## Use with other MCP clients

Any [MCP client](https://modelcontextprotocol.io/clients) can use this server. The server speaks stdio JSON-RPC.

```bash
HOSTAWAY_ACCOUNT_ID=... HOSTAWAY_API_KEY=... npx -y hostaway-mcp
```

## Local development

```bash
git clone https://github.com/prosperkartik/hostaway-mcp.git
cd hostaway-mcp
npm install
cp .env.example .env  # fill in credentials
npm run build
npm start
```

For dev with hot-reload via `tsx`:

```bash
npm run dev
```

## Roadmap

- [x] **v0.1** — `list_listings`, `list_reservations`, `get_reservation`
- [ ] **v0.2** — `get_listing` (single listing detail) and `list_calendar` (availability per listing)
- [ ] **v0.3** — Conversations: `list_conversations`, `get_conversation_messages` (read-only)
- [ ] **v0.4** — Financials: `list_owner_statements`, `list_users`
- [ ] **v0.5+** — Write operations (send guest messages, update calendar) gated behind explicit `confirm: true`

Have a request? [Open an issue](https://github.com/prosperkartik/hostaway-mcp/issues) or [start a discussion](https://github.com/prosperkartik/hostaway-mcp/discussions).

## Configuration

| Env var | Required | Description |
|---|---|---|
| `HOSTAWAY_ACCOUNT_ID` | yes | Hostaway account ID (acts as OAuth `client_id`) |
| `HOSTAWAY_API_KEY` | yes | Hostaway API secret (acts as OAuth `client_secret`) |

The server exchanges those for a bearer token at startup and caches it in memory for the duration of the process.

## Security

- Credentials are read from environment variables only — never written to disk by this server
- The bearer token lives in process memory; no persistent storage
- v0.1 is read-only, so it cannot modify your Hostaway data
- For multi-property operators: the Hostaway API returns data scoped to the account whose credentials you supply, so you naturally cannot read other accounts' data

## Contributing

Issues and PRs welcome. The codebase is small and easy to read; start at [`src/index.ts`](./src/index.ts).

## License

MIT — see [LICENSE](./LICENSE).

## Author

Built by **[Kartik Vats](https://kodeit.io)** ([@prosperkartik](https://github.com/prosperkartik)).

If you're an STR or vacation rental operator and want help wiring AI into your ops, get in touch via [kodeit.io](https://kodeit.io).
