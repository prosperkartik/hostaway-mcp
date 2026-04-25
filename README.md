# @prosperkartik/hostaway-mcp

> Operator-built Model Context Protocol (MCP) server for the Hostaway PMS.

`@prosperkartik/hostaway-mcp` connects Claude (in Claude Code, Claude Desktop, or any MCP-compatible client) to your Hostaway account — listings, reservations, calendar availability, guest messaging, and financials. **Built and maintained by an actual short-term rental operator running properties on Hostaway**, not a generic API wrapper.

[![npm version](https://img.shields.io/npm/v/@prosperkartik/hostaway-mcp.svg?style=flat-square)](https://www.npmjs.com/package/@prosperkartik/hostaway-mcp)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)

## Why another Hostaway MCP server

Two reasons:

1. **More tools.** 10 tools covering listings, reservations, calendar, conversations, financials, and a health-check. Every tool the existing alternative ships, plus four it doesn't.
2. **Operator UX.** Auth takes the credentials Hostaway gives you — Account ID + API Key — and mints the bearer token internally. No "go generate a token elsewhere first" step.

## Tools (v0.1)

All v0.1 tools are **read-only**. Write operations are coming in later versions, gated behind explicit confirmation.

| Tool | Description |
|---|---|
| `whoami` | Health-check — returns connected account counts (listings, reservations, conversations, owner statements, users). Run this first to confirm setup works. |
| `list_listings` | List properties on the account |
| `get_listing` | Full detail for a single listing — location, capacity, pricing, reputation, channel URLs |
| `list_reservations` | List reservations, with optional filters by arrival date range and status |
| `get_reservation` | Full detail for a single reservation — guest, dates, pricing, channel |
| `list_calendar` | Per-day availability for a listing across a date range — answers *"is property X free between A and B?"* |
| `list_conversations` | List guest message threads with unread state and last activity |
| `list_unread_conversations` | Only conversations with unread guest messages — answers *"who's waiting on a reply?"* |
| `get_conversation_messages` | Full message history of a single conversation |
| `list_owner_statements` | List owner financial statements |

## Quick start

### 1. Get your Hostaway API credentials

In your Hostaway operator account → **Settings → Hostaway API**. Generate API credentials. You'll get an **Account ID** and an **API Key**.

### 2. Add to Claude Code

```bash
claude mcp add hostaway \
  --scope user \
  -e HOSTAWAY_ACCOUNT_ID=your-account-id \
  -e HOSTAWAY_API_KEY=your-api-key \
  -- npx -y @prosperkartik/hostaway-mcp
```

(Or use `--scope local` to install for the current project only.)

### 3. Or add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) and add:

```json
{
  "mcpServers": {
    "hostaway": {
      "command": "npx",
      "args": ["-y", "@prosperkartik/hostaway-mcp"],
      "env": {
        "HOSTAWAY_ACCOUNT_ID": "your-account-id",
        "HOSTAWAY_API_KEY": "your-api-key"
      }
    }
  }
}
```

Restart Claude Desktop. The Hostaway tools appear in the tools picker.

### 4. Try it

Ask Claude things like:

- *"Run whoami to confirm Hostaway is connected."*
- *"List my Hostaway listings."*
- *"What reservations are checking in next week?"*
- *"Is listing 12345 available May 10–17?"*
- *"Do I have any unread guest messages?"*
- *"Show me the conversation with [guest]."*

## Example output (placeholder data)

```
> List my Hostaway listings.

Found 3 listings:

| ID    | Name              | Location          | Beds | Baths | Capacity | Status |
|-------|-------------------|-------------------|------|-------|----------|--------|
| 10001 | Sample Apt 2BR    | Sample City, US   | 2    | 2     | 4        | active |
| 10002 | Sample Loft       | Sample City, US   | 1    | 1     | 2        | active |
| 10003 | Sample Beachfront | Sample Beach, US  | 3    | 2     | 6        | active |
```

```
> Is listing 10001 available May 10–17?

# Calendar for listing 10001
8 days returned (2026-05-10 → 2026-05-17)  ·  6 available, 2 reserved, 0 blocked

| Date       | Available | Status   | Price | Min stay | Reserved | Blocked | Note |
|------------|-----------|----------|-------|----------|----------|---------|------|
| 2026-05-10 | ✓         | available| 220   | 2        | 0        | 0       |      |
| 2026-05-11 | ✓         | available| 220   | 2        | 0        | 0       |      |
| 2026-05-12 | ✗         | reserved | 220   | 2        | 1        | 0       |      |
| ...                                                                            |
```

## Configuration

| Env var | Required | Description |
|---|---|---|
| `HOSTAWAY_ACCOUNT_ID` | yes | Your Hostaway account ID (acts as OAuth `client_id`) |
| `HOSTAWAY_API_KEY` | yes | Your Hostaway API secret (acts as OAuth `client_secret`) |

The server exchanges those for a bearer token at startup and caches it in memory for the lifetime of the process.

## Local development

```bash
git clone https://github.com/prosperkartik/hostaway-mcp.git
cd hostaway-mcp
npm install
cp .env.example .env  # fill in credentials
npm run build
npm start
```

Hot-reload via `tsx`:

```bash
npm run dev
```

## Roadmap

- [x] **v0.1** — 10 read-only tools across listings, reservations, calendar, conversations, financials, and health-check
- [ ] **v0.2** — Tasks (`list_tasks`, `get_task`); Cancellation policies; Custom fields read
- [ ] **v0.3** — Guest payments read; Webhooks read
- [ ] **v0.4+** — Write operations (send guest messages, update calendar blocks, create tasks) gated behind explicit `confirm: true`

Have a request? [Open an issue](https://github.com/prosperkartik/hostaway-mcp/issues) or [start a discussion](https://github.com/prosperkartik/hostaway-mcp/discussions).

## Security

- Credentials live in environment variables only — never written to disk by this server
- The bearer token lives in process memory; no persistent storage
- v0.1 is read-only end-to-end; nothing in this codebase can mutate Hostaway data
- For multi-property operators: the Hostaway API returns data scoped to the account whose credentials you supply, so cross-account access is not possible

## Contributing

Issues and PRs welcome. The codebase is small and easy to read; start at [`src/index.ts`](./src/index.ts).

## License

MIT — see [LICENSE](./LICENSE).

## Author

Built by **[Kartik Vats](https://kodeit.io)** ([@prosperkartik](https://github.com/prosperkartik)) — STR operator, AI engineer at [Kodeit](https://kodeit.io).

If you're an STR or vacation rental operator and want help wiring AI into your ops, get in touch via [kodeit.io](https://kodeit.io).
