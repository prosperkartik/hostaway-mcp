# Changelog

## v0.1.0 — 2026-04-25

Initial public release of `@prosperkartik/hostaway-mcp`. Built and end-to-end tested against the live Hostaway API.

### 10 read-only tools

**Account**
- `whoami` — connection check returning account-level counts

**Listings**
- `list_listings` — properties on the account
- `get_listing` — full single-listing detail (location, capacity, pricing, reputation, channel URLs)

**Reservations**
- `list_reservations` — with optional arrival-date and status filters
- `get_reservation` — full single-reservation detail

**Calendar**
- `list_calendar` — per-day availability for a listing across a date range

**Conversations**
- `list_conversations` — guest message threads with unread state
- `list_unread_conversations` — only threads with unread messages
- `get_conversation_messages` — full message history of a thread

**Financials**
- `list_owner_statements` — owner financial statements

### Engineering

- OAuth client-credentials auth with in-memory token caching and 401 retry
- Native Node.js `fetch`, no extra HTTP deps
- ESM, Node 20+
- Scoped npm package: `@prosperkartik/hostaway-mcp`
