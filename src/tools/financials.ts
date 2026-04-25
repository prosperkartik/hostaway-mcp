import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { hostawayFetch, qs } from "../hostaway.js";

interface OwnerStatement {
  id: number;
  statementName?: string | null;
  status?: string | null;
}

function formatOwnerStatements(statements: OwnerStatement[]): string {
  if (statements.length === 0) {
    return "No owner statements found.";
  }
  const lines = [
    `Found ${statements.length} owner statement${statements.length === 1 ? "" : "s"}:`,
    "",
    "| ID | Statement name | Status |",
    "|---|---|---|",
  ];
  for (const s of statements) {
    lines.push(`| ${s.id} | ${s.statementName ?? "—"} | ${s.status ?? "—"} |`);
  }
  return lines.join("\n");
}

export function registerFinancialsTools(server: McpServer): void {
  server.registerTool(
    "list_owner_statements",
    {
      description:
        "List owner financial statements on the connected Hostaway account. Returns a compact table of statement id, name, and status. Useful for revenue and payout reporting.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(20)
          .describe("Maximum number of statements to return (1–50, default 20)."),
      },
    },
    async ({ limit }) => {
      const statements = await hostawayFetch<OwnerStatement[]>(
        `/ownerStatements${qs({ limit })}`
      );
      return {
        content: [{ type: "text", text: formatOwnerStatements(statements) }],
      };
    }
  );
}
