import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { hostawayFetch, qs } from "../hostaway.js";

interface Listing {
  id: number;
  name: string;
  internalListingName?: string | null;
  externalListingName?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  bedroomsNumber?: number | null;
  bathroomsNumber?: number | null;
  personCapacity?: number | null;
  specialStatus?: string | null;
  currencyCode?: string | null;
}

function formatListings(listings: Listing[]): string {
  if (listings.length === 0) {
    return "No listings found for this account.";
  }
  const lines = [
    `Found ${listings.length} listing${listings.length === 1 ? "" : "s"}:`,
    "",
    "| ID | Name | Location | Beds | Baths | Capacity | Status |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const l of listings) {
    const name = l.internalListingName || l.name || l.externalListingName || `Listing ${l.id}`;
    const location = [l.city, l.country].filter(Boolean).join(", ") || "—";
    const status = l.specialStatus ?? "active";
    lines.push(
      `| ${l.id} | ${name} | ${location} | ${l.bedroomsNumber ?? "—"} | ${l.bathroomsNumber ?? "—"} | ${l.personCapacity ?? "—"} | ${status} |`
    );
  }
  return lines.join("\n");
}

export function registerListingsTools(server: McpServer): void {
  server.registerTool(
    "list_listings",
    {
      description:
        "List properties (listings) on the connected Hostaway account. Returns a compact Markdown table with id, name, location, bedrooms/bathrooms, person capacity, and status.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(20)
          .describe("Maximum number of listings to return (1–50, default 20)."),
      },
    },
    async ({ limit }) => {
      const listings = await hostawayFetch<Listing[]>(`/listings${qs({ limit })}`);
      return {
        content: [{ type: "text", text: formatListings(listings) }],
      };
    }
  );
}
