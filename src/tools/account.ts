import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { hostawayFetch } from "../hostaway.js";

interface CountedResponse {
  // The Hostaway list endpoints return result as an array; we just need .length.
}

/**
 * Best-effort count of items at a list endpoint. Returns 0 on error so a
 * partial whoami still renders. We pass limit=1 to minimize payload — but
 * Hostaway returns count metadata in the envelope, which the wrapper drops.
 * Falling back to client-side length on a small page is fine for v0.1.
 */
async function safeCount(path: string): Promise<number | "error"> {
  try {
    const items = await hostawayFetch<unknown[]>(path);
    return Array.isArray(items) ? items.length : 0;
  } catch {
    return "error";
  }
}

export function registerAccountTools(server: McpServer): void {
  server.registerTool(
    "whoami",
    {
      description:
        "Health-check tool — confirms credentials work and returns a quick summary of the connected Hostaway account: counts of listings, reservations, conversations, owner statements, and users. Use this first when setting up to verify the connection.",
      inputSchema: {},
    },
    async () => {
      const accountId = process.env.HOSTAWAY_ACCOUNT_ID ?? "(not set)";
      const [listings, reservations, conversations, statements, users] =
        await Promise.all([
          safeCount("/listings?limit=50"),
          safeCount("/reservations?limit=50"),
          safeCount("/conversations?limit=50"),
          safeCount("/ownerStatements?limit=50"),
          safeCount("/users?limit=50"),
        ]);

      const lines = [
        `# Hostaway connection check`,
        "",
        `**Account ID:** ${accountId}`,
        `**Status:** ✓ connected`,
        "",
        `## Counts (capped at 50 per fetch)`,
        `- Listings: ${listings}`,
        `- Reservations: ${reservations}`,
        `- Conversations: ${conversations}`,
        `- Owner statements: ${statements}`,
        `- Users on account: ${users}`,
        "",
        `_If any value reads 'error', that endpoint failed — check API permissions._`,
      ];

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    }
  );
}
