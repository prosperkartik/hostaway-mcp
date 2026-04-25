import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { hostawayFetch, qs } from "../hostaway.js";

interface Conversation {
  id: number;
  reservationId?: number | null;
  listingMapId?: number | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  guestEmail?: string | null;
  hostEmail?: string | null;
  hasUnreadMessages?: boolean | number | null;
  isArchived?: boolean | number | null;
  isSnoozed?: boolean | number | null;
  messageReceivedOn?: string | null;
  messageSentOn?: string | null;
  type?: string | null;
}

interface ConversationMessage {
  id: number;
  conversationId?: number | null;
  body?: string | null;
  isIncoming?: boolean | number | null;
  isSeen?: boolean | number | null;
  date?: string | null;
  insertedOn?: string | null;
  status?: string | null;
  channelId?: number | null;
  attachments?: unknown[] | null;
}

function isTrue(v: boolean | number | null | undefined): boolean {
  return v === true || v === 1;
}

function formatConversationList(conversations: Conversation[], titleSuffix = ""): string {
  if (conversations.length === 0) {
    return `No conversations found${titleSuffix}.`;
  }
  const unreadCount = conversations.filter((c) => isTrue(c.hasUnreadMessages)).length;
  const lines = [
    `Found ${conversations.length} conversation${conversations.length === 1 ? "" : "s"}${titleSuffix}${unreadCount ? `  ·  ${unreadCount} with unread messages` : ""}:`,
    "",
    "| ID | Guest | Listing | Reservation | Unread | Last activity |",
    "|---|---|---|---|---|---|",
  ];
  for (const c of conversations) {
    const lastActivity = c.messageReceivedOn || c.messageSentOn || "—";
    const unread = isTrue(c.hasUnreadMessages) ? "🔴" : "—";
    lines.push(
      `| ${c.id} | ${c.recipientName ?? "—"} | ${c.listingMapId ?? "—"} | ${c.reservationId ?? "—"} | ${unread} | ${lastActivity} |`
    );
  }
  return lines.join("\n");
}

function formatConversationMessages(
  conversationId: number,
  messages: ConversationMessage[]
): string {
  if (messages.length === 0) {
    return `Conversation ${conversationId} has no messages.`;
  }
  const lines = [
    `# Conversation ${conversationId}`,
    `${messages.length} message${messages.length === 1 ? "" : "s"}`,
    "",
  ];
  for (const m of messages) {
    const direction = isTrue(m.isIncoming) ? "← Guest" : "→ Host";
    const seen = isTrue(m.isSeen) ? " (seen)" : "";
    const when = m.date || m.insertedOn || "—";
    lines.push(`**${direction}${seen}** · ${when}`);
    lines.push(m.body?.trim() || "_(no body)_");
    lines.push("");
  }
  return lines.join("\n");
}

export function registerConversationsTools(server: McpServer): void {
  server.registerTool(
    "list_conversations",
    {
      description:
        "List guest message threads (conversations) on the connected Hostaway account. Returns a compact Markdown table with conversation id, guest, linked listing/reservation, unread state, and last activity time.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(20)
          .describe("Maximum number of conversations to return (1–50, default 20)."),
      },
    },
    async ({ limit }) => {
      const conversations = await hostawayFetch<Conversation[]>(
        `/conversations${qs({ limit })}`
      );
      return {
        content: [{ type: "text", text: formatConversationList(conversations) }],
      };
    }
  );

  server.registerTool(
    "list_unread_conversations",
    {
      description:
        "List only guest message threads that have unread messages. The most useful tool for answering 'do I have any guests waiting on a reply?'",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(20)
          .describe("Maximum number of conversations to scan (1–50, default 20)."),
      },
    },
    async ({ limit }) => {
      const all = await hostawayFetch<Conversation[]>(`/conversations${qs({ limit })}`);
      const unread = all.filter((c) => isTrue(c.hasUnreadMessages));
      return {
        content: [
          {
            type: "text",
            text: formatConversationList(unread, " with unread messages"),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_conversation_messages",
    {
      description:
        "Fetch the full message history of a single conversation by id. Returns each message with direction (incoming/outgoing), timestamp, and body.",
      inputSchema: {
        conversation_id: z
          .number()
          .int()
          .positive()
          .describe("The numeric Hostaway conversation id."),
      },
    },
    async ({ conversation_id }) => {
      const messages = await hostawayFetch<ConversationMessage[]>(
        `/conversations/${conversation_id}/messages`
      );
      return {
        content: [
          {
            type: "text",
            text: formatConversationMessages(conversation_id, messages),
          },
        ],
      };
    }
  );
}
