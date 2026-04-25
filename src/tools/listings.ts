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

interface ListingDetail extends Listing {
  externalListingName?: string | null;
  internalListingName?: string | null;
  thumbnailUrl?: string | null;
  street?: string | null;
  zipcode?: string | null;
  state?: string | null;
  lat?: number | null;
  lng?: number | null;
  timeZoneName?: string | null;
  bedsNumber?: number | null;
  squareMeters?: number | null;
  averageNightlyPrice?: number | null;
  averageReviewRating?: number | null;
  cancellationPolicy?: string | null;
  cleaningFee?: number | null;
  defaultCleaningFee?: number | null;
  refundableDamageDeposit?: number | null;
  airbnbListingUrl?: string | null;
  vrboListingUrl?: string | null;
}

function formatListingDetail(l: ListingDetail): string {
  const name = l.internalListingName || l.name || l.externalListingName || `Listing ${l.id}`;
  const status = l.specialStatus ?? "active";
  const location = [l.street, l.city, l.state, l.zipcode, l.country].filter(Boolean).join(", ") || "—";
  const lines = [
    `# ${name}`,
    "",
    `**ID:** ${l.id}  ·  **Status:** ${status}  ·  **Currency:** ${l.currencyCode ?? "—"}`,
    "",
    `## Location`,
    `- ${location}`,
    l.timeZoneName ? `- Time zone: ${l.timeZoneName}` : "",
    l.lat && l.lng ? `- Coordinates: ${l.lat}, ${l.lng}` : "",
    "",
    `## Capacity`,
    `- Bedrooms: ${l.bedroomsNumber ?? "—"}  ·  Beds: ${l.bedsNumber ?? "—"}  ·  Bathrooms: ${l.bathroomsNumber ?? "—"}`,
    `- Person capacity: ${l.personCapacity ?? "—"}`,
    l.squareMeters ? `- Size: ${l.squareMeters} m²` : "",
    "",
    `## Pricing`,
    l.averageNightlyPrice !== null && l.averageNightlyPrice !== undefined
      ? `- Avg nightly: ${l.averageNightlyPrice} ${l.currencyCode ?? ""}`
      : "",
    l.cleaningFee !== null && l.cleaningFee !== undefined ? `- Cleaning fee: ${l.cleaningFee} ${l.currencyCode ?? ""}` : "",
    l.refundableDamageDeposit ? `- Damage deposit: ${l.refundableDamageDeposit} ${l.currencyCode ?? ""}` : "",
    l.cancellationPolicy ? `- Cancellation policy: ${l.cancellationPolicy}` : "",
    "",
    `## Reputation`,
    l.averageReviewRating !== null && l.averageReviewRating !== undefined
      ? `- Average review rating: ${l.averageReviewRating}`
      : "- Average review rating: —",
    "",
    `## Channel URLs`,
    l.airbnbListingUrl ? `- Airbnb: ${l.airbnbListingUrl}` : "",
    l.vrboListingUrl ? `- VRBO: ${l.vrboListingUrl}` : "",
  ].filter((line) => line !== "");
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

  server.registerTool(
    "get_listing",
    {
      description:
        "Fetch full details for a single Hostaway listing by id. Returns location, capacity, pricing, reputation, and channel URLs as Markdown sections.",
      inputSchema: {
        listing_id: z
          .number()
          .int()
          .positive()
          .describe("The numeric Hostaway listing id."),
      },
    },
    async ({ listing_id }) => {
      const listing = await hostawayFetch<ListingDetail>(`/listings/${listing_id}`);
      return {
        content: [{ type: "text", text: formatListingDetail(listing) }],
      };
    }
  );
}
