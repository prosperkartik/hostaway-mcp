import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { hostawayFetch, qs } from "../hostaway.js";

interface CalendarDay {
  id?: number;
  date: string;
  isAvailable?: boolean | number | null;
  status?: string | null;
  price?: number | null;
  minimumStay?: number | null;
  maximumStay?: number | null;
  countAvailableUnits?: number | null;
  countReservedUnits?: number | null;
  countBlockedUnits?: number | null;
  countPendingUnits?: number | null;
  closedOnArrival?: boolean | null;
  closedOnDeparture?: boolean | null;
  note?: string | null;
}

function formatCalendar(listingId: number, days: CalendarDay[]): string {
  if (days.length === 0) {
    return `No calendar data returned for listing ${listingId} in that range.`;
  }

  const availableCount = days.filter((d) => d.isAvailable === true || d.isAvailable === 1).length;
  const reservedCount = days.filter((d) => (d.countReservedUnits ?? 0) > 0).length;
  const blockedCount = days.filter((d) => (d.countBlockedUnits ?? 0) > 0).length;

  const lines = [
    `# Calendar for listing ${listingId}`,
    `${days.length} day${days.length === 1 ? "" : "s"} returned (${days[0]?.date} → ${days[days.length - 1]?.date})  ·  ${availableCount} available, ${reservedCount} reserved, ${blockedCount} blocked`,
    "",
    "| Date | Available | Status | Price | Min stay | Reserved | Blocked | Note |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const d of days) {
    const avail = d.isAvailable === true || d.isAvailable === 1 ? "✓" : "✗";
    lines.push(
      `| ${d.date} | ${avail} | ${d.status ?? "—"} | ${d.price ?? "—"} | ${d.minimumStay ?? "—"} | ${d.countReservedUnits ?? 0} | ${d.countBlockedUnits ?? 0} | ${d.note ?? ""} |`
    );
  }
  return lines.join("\n");
}

export function registerCalendarTools(server: McpServer): void {
  server.registerTool(
    "list_calendar",
    {
      description:
        "Get the availability calendar for a single listing across a date range. Returns per-day availability, status, price, minimum stay, and reserved/blocked counts. Use this to answer 'is property X available between dates A and B?'",
      inputSchema: {
        listing_id: z
          .number()
          .int()
          .positive()
          .describe("The numeric Hostaway listing id."),
        start_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Calendar start date in YYYY-MM-DD format."),
        end_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Calendar end date in YYYY-MM-DD format."),
      },
    },
    async ({ listing_id, start_date, end_date }) => {
      const days = await hostawayFetch<CalendarDay[]>(
        `/listings/${listing_id}/calendar${qs({ startDate: start_date, endDate: end_date })}`
      );
      return {
        content: [{ type: "text", text: formatCalendar(listing_id, days) }],
      };
    }
  );
}
