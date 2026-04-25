import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { hostawayFetch, qs } from "../hostaway.js";

interface Reservation {
  id: number;
  listingMapId?: number | null;
  listingName?: string | null;
  channelName?: string | null;
  channelId?: number | null;
  guestName?: string | null;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestEmail?: string | null;
  phone?: string | null;
  numberOfGuests?: number | null;
  adults?: number | null;
  children?: number | null;
  infants?: number | null;
  arrivalDate?: string | null;
  departureDate?: string | null;
  nights?: number | null;
  status?: string | null;
  totalPrice?: number | null;
  currency?: string | null;
  cleaningFee?: number | null;
  taxAmount?: number | null;
  channelCommissionAmount?: number | null;
  hostawayCommissionAmount?: number | null;
  isInitial?: boolean | null;
  isPaid?: number | boolean | null;
  reservationDate?: string | null;
  confirmationCode?: string | null;
  source?: string | null;
}

function fmtMoney(amount?: number | null, currency?: string | null): string {
  if (amount === null || amount === undefined) return "—";
  const c = currency || "";
  return `${amount.toFixed(2)} ${c}`.trim();
}

function formatReservationList(reservations: Reservation[]): string {
  if (reservations.length === 0) {
    return "No reservations found matching those filters.";
  }
  const lines = [
    `Found ${reservations.length} reservation${reservations.length === 1 ? "" : "s"}:`,
    "",
    "| ID | Listing | Guest | Check-in | Check-out | Nights | Status | Channel | Total |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of reservations) {
    const guest = r.guestName || [r.guestFirstName, r.guestLastName].filter(Boolean).join(" ") || "—";
    lines.push(
      `| ${r.id} | ${r.listingName ?? "—"} | ${guest} | ${r.arrivalDate ?? "—"} | ${r.departureDate ?? "—"} | ${r.nights ?? "—"} | ${r.status ?? "—"} | ${r.channelName ?? "—"} | ${fmtMoney(r.totalPrice, r.currency)} |`
    );
  }
  return lines.join("\n");
}

function formatReservationDetail(r: Reservation): string {
  const guest = r.guestName || [r.guestFirstName, r.guestLastName].filter(Boolean).join(" ") || "—";
  const sections = [
    `# Reservation #${r.id}`,
    "",
    `**Status:** ${r.status ?? "—"}  `,
    `**Confirmation code:** ${r.confirmationCode ?? "—"}  `,
    `**Booked on:** ${r.reservationDate ?? "—"}`,
    "",
    `## Property`,
    `- Listing: ${r.listingName ?? "—"} (id ${r.listingMapId ?? "—"})`,
    `- Channel: ${r.channelName ?? "—"}${r.source ? ` (${r.source})` : ""}`,
    "",
    `## Guest`,
    `- Name: ${guest}`,
    `- Email: ${r.guestEmail ?? "—"}`,
    `- Phone: ${r.phone ?? "—"}`,
    `- Party: ${r.numberOfGuests ?? "—"} total (adults ${r.adults ?? "—"}, children ${r.children ?? "—"}, infants ${r.infants ?? "—"})`,
    "",
    `## Dates`,
    `- Check-in: ${r.arrivalDate ?? "—"}`,
    `- Check-out: ${r.departureDate ?? "—"}`,
    `- Nights: ${r.nights ?? "—"}`,
    "",
    `## Pricing`,
    `- Total: ${fmtMoney(r.totalPrice, r.currency)}`,
    `- Cleaning fee: ${fmtMoney(r.cleaningFee, r.currency)}`,
    `- Tax: ${fmtMoney(r.taxAmount, r.currency)}`,
    `- Channel commission: ${fmtMoney(r.channelCommissionAmount, r.currency)}`,
    `- Paid: ${r.isPaid ? "yes" : "no"}`,
  ];
  return sections.join("\n");
}

export function registerReservationsTools(server: McpServer): void {
  server.registerTool(
    "list_reservations",
    {
      description:
        "List reservations on the connected Hostaway account. Optional filters by arrival date range and reservation status. Returns a Markdown table with the most useful operational fields.",
      inputSchema: {
        arrival_start_date: z
          .string()
          .optional()
          .describe("Filter reservations with arrival date on or after this YYYY-MM-DD."),
        arrival_end_date: z
          .string()
          .optional()
          .describe("Filter reservations with arrival date on or before this YYYY-MM-DD."),
        status: z
          .string()
          .optional()
          .describe(
            "Filter by reservation status (e.g. 'new', 'modified', 'cancelled', 'ownerStay', 'pending', 'awaitingPayment', 'declined', 'expired', 'inquiry', 'inquiryPreapproved', 'inquiryDenied', 'inquiryTimedout', 'inquiryNotPossible')."
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(20)
          .describe("Maximum number of reservations to return (1–50, default 20)."),
      },
    },
    async ({ arrival_start_date, arrival_end_date, status, limit }) => {
      const reservations = await hostawayFetch<Reservation[]>(
        `/reservations${qs({
          arrivalStartDate: arrival_start_date,
          arrivalEndDate: arrival_end_date,
          status,
          limit,
        })}`
      );
      return {
        content: [{ type: "text", text: formatReservationList(reservations) }],
      };
    }
  );

  server.registerTool(
    "get_reservation",
    {
      description:
        "Fetch full details for a single Hostaway reservation by id. Returns guest info, dates, pricing breakdown, and channel details.",
      inputSchema: {
        reservation_id: z
          .number()
          .int()
          .positive()
          .describe("The numeric Hostaway reservation id."),
      },
    },
    async ({ reservation_id }) => {
      const reservation = await hostawayFetch<Reservation>(`/reservations/${reservation_id}`);
      return {
        content: [{ type: "text", text: formatReservationDetail(reservation) }],
      };
    }
  );
}
