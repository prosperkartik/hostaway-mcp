# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

# `@prosperkartik/hostaway-mcp` — Model Context Protocol server for the Hostaway PMS

Open-source MCP server connecting Claude (and any MCP-compatible client) to the Hostaway property-management system. **v0.1.0 shipped Apr 25, 2026** — 10 read-only tools, on npm, MIT licensed.

- npm: <https://www.npmjs.com/package/@prosperkartik/hostaway-mcp>
- Repo: <https://github.com/prosperkartik/hostaway-mcp>
- Author: Kartik Vats — see `/Users/titan/remote-job/CLAUDE.md` for full identity context

---

## Hard rules (read these first)

These rules come from explicit user instruction and are persisted in user-level memory at `/Users/titan/.claude/projects/-Users-titan/memory/feedback_hostaway_mcp_safety.md`. They apply to every change in this repo.

1. **Read-only operations only.** v0.1 ships only `GET`-style tools. The user's API key has full account scope but is treated as read-only by policy. Adding any write capability requires explicit user permission first.
2. **Ask before adding any write tool** (`send_message`, `update_calendar`, `create_reservation`, etc.). Don't ship write capability based on "the API supports it."
3. **No real account data in documentation.** Never paste actual listing names, reservation IDs, guest names, addresses, prices, emails, or property internal names into README, examples, demo recordings, or commit messages. Use plausible fake examples instead. The author runs live Miami properties (Beacon South Beach, Hotel Ocean, Luxuri Suites) — exposing real ops data would be a privacy violation.
4. **Never commit credentials.** `.env`, `.env.*`, `.npmrc`, and `secrets/` are gitignored. The local `.npmrc` may contain a personal npm publish token — confirm with `git check-ignore .npmrc` before any commit.

---

## Tech stack (locked — don't change without good reason)

- **Language:** TypeScript (strict mode), Node ≥ 20
- **Module format:** ESM (`"type": "module"` in package.json)
- **MCP SDK:** `@modelcontextprotocol/sdk` (official Anthropic SDK)
- **Schema validation:** `zod@3` (note: zod 4 is out but the MCP SDK examples target zod 3 — stick with 3)
- **HTTP:** native Node `fetch` — **no axios, no node-fetch, no undici**. Keeps install footprint small and supply-chain attack surface narrow.
- **Build target:** `ES2022`, module/moduleResolution `Node16`, output to `./build/`

---

## File layout

```
hostaway-mcp/
├── README.md                      # public-facing — has Hostaway logo + trademark disclaimer
├── SECURITY.md                    # vulnerability reporting policy
├── CHANGELOG.md                   # one entry per release
├── LICENSE                        # MIT
├── .gitignore                     # ignores build/, .env, .npmrc, secrets/
├── .env.example                   # placeholders only, no real values
├── .npmrc                         # gitignored — local npm publish token
├── package.json                   # scoped: @prosperkartik/hostaway-mcp
├── tsconfig.json                  # ES2022 / Node16 strict
├── examples/
│   └── claude-desktop-config.json # paste-ready snippet for users
├── docs/
│   └── hostaway-logo.png          # used at the top of the README (with disclaimer)
├── src/
│   ├── index.ts                   # MCP server entry, stdio transport, tool registration
│   ├── hostaway.ts                # auth + fetch wrapper + qs() helper
│   └── tools/
│       ├── listings.ts            # list_listings, get_listing
│       ├── reservations.ts        # list_reservations, get_reservation
│       ├── calendar.ts            # list_calendar
│       ├── conversations.ts       # list_conversations, list_unread_conversations, get_conversation_messages
│       ├── financials.ts          # list_owner_statements
│       └── account.ts             # whoami
└── build/                         # tsc output (gitignored)
```

---

## Auth flow (don't trip on this)

Hostaway public API uses **OAuth 2.0 client credentials**, but exposed to the user as just two env vars:

- `HOSTAWAY_ACCOUNT_ID` (acts as `client_id`)
- `HOSTAWAY_API_KEY` (acts as `client_secret`)

The server handles the token exchange internally:

1. On first request, `getAccessToken()` posts to `https://api.hostaway.com/v1/accessTokens` with `grant_type=client_credentials`, `client_id`, `client_secret`, `scope=general`.
2. Response: a JWT bearer token valid **24 months** (`expires_in: 63158400` seconds).
3. Token is cached in module-level `cachedToken` with a 60s safety margin on the expiry.
4. All subsequent requests use `Authorization: Bearer ${token}`.
5. On `401`, the cache is dropped and the request retries once with a fresh token.

This is in `src/hostaway.ts` — keep this contract stable.

---

## Field-name gotchas (we hit these tonight)

The Hostaway API response field names don't always match what the docs imply. Verified against the live API on Apr 25, 2026:

| Object | Field we expected | Actual field |
|---|---|---|
| Listing | `status` | `specialStatus` (`null` = active, otherwise e.g. `archived`) |
| Reservation | `guestPhone` | `phone` |
| Reservation | `hostawayResortFee` | does not exist — drop |
| Reservation | `channelTotalPrice` | does not exist — drop |
| Reservation | useful money fields | `taxAmount`, `channelCommissionAmount`, `hostawayCommissionAmount`, `isPaid` |
| Calendar day | availability | `isAvailable` (boolean OR `1`/`0`); `status` (text); `countAvailableUnits` etc. |
| Conversation | unread state | `hasUnreadMessages` (boolean OR `1`/`0`); also has nested `Reservation` object (capital R) |

**Always probe the live response shape before adding a new tool.** The docs describe ~145 fields per listing; only a small subset is consistently present and useful.

Use `isTrue(v)` from `src/tools/conversations.ts` to handle the boolean-or-1 pattern.

---

## Adding a new tool — pattern

1. **Probe the live API first** — fetch one record, inspect the keys returned. Don't trust the docs alone.
2. Pick or create the right file under `src/tools/` — group by Hostaway resource (listings, reservations, calendar, conversations, financials, account).
3. Define a TypeScript interface for the response shape (only the fields you actually use).
4. Write a `formatX()` helper that returns Markdown. Tools should return human-readable Markdown (tables for lists, sections for details), not raw JSON. Claude renders this directly.
5. Register the tool with `server.registerTool(name, schema, handler)`. Use `zod` schemas with `.describe()` on every field — those descriptions are what the model sees when deciding to invoke the tool.
6. Wire it into `src/index.ts` via the `register*Tools(server)` entry point for that file.
7. Run the smoke test (see below) before publishing.

**Read-only invariant reminder:** v0.1 only ships `GET` tools. Any tool that mutates Hostaway data (`POST`, `PUT`, `DELETE`) must be gated behind an explicit `confirm: true` parameter in the schema, and its addition must be approved by Kartik first.

---

## Build / test / publish workflow

### Build

```bash
npm run build    # tsc + chmod +x on build/index.js
```

### Smoke test (manual, one-shot)

There's no committed test suite in v0.1. To verify a build works end-to-end against the live Hostaway API:

```bash
# Start the server with credentials
HOSTAWAY_ACCOUNT_ID=... HOSTAWAY_API_KEY=... node build/index.js

# In another terminal, test via Claude Code with the registered MCP server
# (already wired via `claude mcp add hostaway --scope user ...`)
```

For programmatic JSON-RPC smoke tests, the pattern that worked on Apr 25 is in this repo's git history (commit message `align field names with live Hostaway API responses`) — spawn the server as a child process, send `initialize` → `notifications/initialized` → `tools/list` → `tools/call` for each tool. **Sanitize logged output** — don't write real account data to disk per the security rules above.

### Publish

```bash
# package.json must show the next version (semver bump first)
npm version 0.2.0   # auto-bumps and creates a git tag

npm run build
npm publish         # uses .npmrc token (gitignored)

# push tag to GitHub
git push origin main --tags

# create a GitHub release
gh release create v0.2.0 --title "v0.2.0" --notes "..."
```

Note: the npm token currently in `.npmrc` does **not** have "Bypass 2FA" enabled — passkey auth is required during publish unless the token is regenerated with the bypass flag.

---

## Roadmap (advertised in README)

- ✅ **v0.1** — `list_listings`, `get_listing`, `list_reservations`, `get_reservation`, `list_calendar`, `list_conversations`, `list_unread_conversations`, `get_conversation_messages`, `list_owner_statements`, `whoami` (10 tools)
- ⏸ **v0.2** — `list_tasks`, `list_cancellation_policies` (Airbnb / Booking / Marriott / VRBO), `list_users`, optionally extra fields on `get_listing` and `get_reservation`
- ⏸ **v0.3** — Guest payments (`list_offline_charges`, `list_auto_payment_rules`), webhooks read
- ⏸ **v0.4+** — Write operations gated behind explicit `confirm: true` (`send_conversation_message`, `update_calendar_block`, `create_task`)

When picking the next batch: look at what real operator workflows are blocked. The `whoami` and `list_unread_conversations` tools came from this question — what does an operator ask Claude that v0.1 doesn't yet support?

---

## Style notes

- **Logs go to stderr.** stdout is reserved for MCP JSON-RPC. Use `console.error()`, never `console.log()` in stdio servers — `console.log` corrupts the protocol.
- Tools return Markdown text content, not JSON. Models render Markdown natively in chat clients.
- Never emit timestamps in commit messages or code as relative dates ("yesterday", "last week"). Use absolute dates (`2026-04-25`).
- Commit history matters. v0.1 shipped with 7 logical commits, not one giant commit. Future versions follow the same pattern: scaffold, auth changes, each tool group, docs.

---

## Cross-repo context

This project is part of Kartik's job-search portfolio. The job-hunt repo lives at `/Users/titan/remote-job/`, with its own `CLAUDE.md`. The MCP project is referenced in:

- Both resumes (`/Users/titan/remote-job/resumes/Kartik_Vats_Resume_*.md`)
- The dream-companies strategy (`/Users/titan/remote-job/applications/dream-companies-strategy.md`)
- Mercor interview prep (`/Users/titan/remote-job/applications/mercor-interview-qa.md`)
- LinkedIn launch post (live)
- awesome-mcp-servers PR #5416
- mcp.so submission

When iterating on this MCP, remember it's also a public artifact backing job applications. Don't ship breaking changes lightly — every PR is recruiter-visible.
