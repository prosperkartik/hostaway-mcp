#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListingsTools } from "./tools/listings.js";
import { registerReservationsTools } from "./tools/reservations.js";
import { registerCalendarTools } from "./tools/calendar.js";
import { registerConversationsTools } from "./tools/conversations.js";
import { registerFinancialsTools } from "./tools/financials.js";
import { registerAccountTools } from "./tools/account.js";

async function main(): Promise<void> {
  const server = new McpServer({
    name: "hostaway-mcp",
    version: "0.1.0",
  });

  registerListingsTools(server);
  registerReservationsTools(server);
  registerCalendarTools(server);
  registerConversationsTools(server);
  registerFinancialsTools(server);
  registerAccountTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout is reserved for MCP JSON-RPC; logs go to stderr.
  console.error("hostaway-mcp v0.1.0 running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
