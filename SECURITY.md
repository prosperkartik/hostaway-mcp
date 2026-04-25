# Security Policy

## Supported versions

This project follows [semantic versioning](https://semver.org). Security fixes are issued for the latest minor release line.

| Version | Security updates |
|---------|------------------|
| 0.1.x   | ✅ supported |
| < 0.1.0 | ❌ not supported |

When a new minor release ships (0.2.x, 0.3.x), older minor lines are unsupported unless the change is critical.

## Reporting a vulnerability

**Please do not file a public GitHub issue for security reports.**

Send a private report through one of these channels:

- **GitHub Security Advisories** — preferred — open a draft advisory at <https://github.com/prosperkartik/hostaway-mcp/security/advisories/new>
- **Email** — `prosperkartik@gmail.com` with subject line starting `[hostaway-mcp security]`

When reporting, please include:

- A description of the issue and its impact
- Reproduction steps (or a minimal proof of concept)
- Affected version(s) of `@prosperkartik/hostaway-mcp`
- Your contact information for follow-up

You should expect an initial acknowledgment within **72 hours**. After triage, I will share a remediation timeline and coordinate disclosure with you.

## Scope

### In scope

- Authentication / authorization issues in the Hostaway API client (auth flow, token handling, credential leakage)
- Any pathway where `hostaway-mcp` could mutate Hostaway data (the v0.1 design is strictly read-only — write capability is a security regression)
- Improper handling of user-supplied input that reaches the Hostaway API or the local filesystem
- Supply chain issues in this package's published artifacts
- Disclosure of credentials, bearer tokens, or guest data through logs, errors, or output

### Out of scope

- Vulnerabilities in the upstream Hostaway API itself — please report those directly to [Hostaway](https://www.hostaway.com)
- Vulnerabilities in third-party dependencies — please report those upstream; we will update once a patched version is released
- User-controlled credential mismanagement (e.g. committing `.env` files, posting credentials publicly)
- Security issues in the MCP client (Claude Desktop, Claude Code, etc.) — please report those to the client's vendor

## Handling secrets

- **Never commit credentials.** `.env`, `.env.*`, `.npmrc`, and `secrets/` are gitignored at the repository level.
- The published package reads `HOSTAWAY_ACCOUNT_ID` and `HOSTAWAY_API_KEY` from environment variables only and keeps the bearer token in process memory.
- The package never writes credentials, tokens, or operator data to disk.
- All logs go to stderr (stdout is reserved for MCP JSON-RPC); credentials are never logged.

## Security design notes

- **Read-only by default.** The v0.1 release exposes only `GET`-style tools. There is no code path in this package that can mutate Hostaway data. Any future write tools will be gated behind an explicit `confirm: true` parameter that the caller must include.
- **Per-process token cache.** Bearer tokens are cached in memory for the lifetime of the process. The cache is dropped on `401` responses and re-minted on the next request.
- **Native `fetch`, no extra HTTP deps.** Reduces supply chain attack surface — no `axios`, `node-fetch`, or `undici` in the dependency tree.

## Acknowledgments

Thanks to anyone who responsibly discloses vulnerabilities. Reporters who follow this policy will be credited (with permission) in the release notes for the fix.
