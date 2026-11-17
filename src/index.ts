#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const API_BASE = "https://urpass.space/api/v1";
const API_KEY = process.env.URPASS_API_KEY ?? "";

if (!API_KEY) {
  process.stderr.write(
    "Error: URPASS_API_KEY environment variable is required.\n" +
    "Get your API key at https://urpass.space/dashboard/developer\n"
  );
  process.exit(1);
}

async function urpass(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "error" in data
        ? (data as { error: string }).error
        : text;
    throw new Error(`UrPass API ${res.status}: ${msg}`);
  }
  return data;
}

const TOOLS = [
  {
    name: "list_events",
    description:
      "List your UrPass events. Filter by status (draft, published, closed). Returns names, dates, venues, attendee counts.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["draft", "published", "closed"],
          description: "Filter by event status",
        },
        limit: { type: "number", description: "Max results 1–100 (default 20)" },
        offset: { type: "number", description: "Pagination offset" },
      },
    },
  },
  {
    name: "get_event",
    description:
      "Get full details for a single event including ticket tiers, registration counts, check-in stats, and readiness.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "The event ID" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "create_event",
    description: "Create a new event on UrPass. Returns the event ID and registration link.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Event name" },
        description: { type: "string", description: "Event description" },
        event_date: { type: "string", description: "Date in YYYY-MM-DD format" },
        start_time: { type: "string", description: "Start time HH:MM (24h)" },
        end_time: { type: "string", description: "End time HH:MM (24h)" },
        venue: { type: "string", description: "Venue name and address" },
        attendee_limit: { type: "number", description: "Maximum number of attendees" },
        is_paid_event: { type: "boolean", description: "Whether this is a paid event" },
      },
      required: ["name", "event_date"],
    },
  },
  {
    name: "update_event",
    description: "Update an existing event's details.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        event_date: { type: "string" },
        start_time: { type: "string" },
        end_time: { type: "string" },
        venue: { type: "string" },
        attendee_limit: { type: "number" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "publish_event",
    description: "Publish a draft event so attendees can register.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "The event ID to publish" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "get_event_readiness",
    description:
      "Run a pre-flight readiness check before publishing. Returns what's missing or misconfigured.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "list_ticket_tiers",
    description: "List all ticket tiers for an event — name, price, capacity, sold count.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "create_ticket_tier",
    description: "Add a ticket tier to an event, e.g. Early Bird at ₹299 with 100 seats.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        name: { type: "string", description: "e.g. 'Early Bird', 'VIP', 'General'" },
        price: { type: "number", description: "Price in INR (0 for free)" },
        capacity: { type: "number", description: "Number of seats" },
        description: { type: "string", description: "Optional tier description" },
      },
      required: ["eventId", "name", "price", "capacity"],
    },
  },
  {
    name: "list_attendees",
    description: "List attendees for an event. Filter by status: pending, approved, rejected.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        status: {
          type: "string",
          enum: ["pending", "approved", "rejected"],
        },
        limit: { type: "number" },
        offset: { type: "number" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "approve_attendee",
    description: "Approve a pending attendee registration and issue their QR pass.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        attendeeId: { type: "string" },
      },
      required: ["eventId", "attendeeId"],
    },
  },
  {
    name: "reject_attendee",
    description: "Reject a pending attendee registration.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        attendeeId: { type: "string" },
        reason: { type: "string", description: "Optional rejection reason" },
      },
      required: ["eventId", "attendeeId"],
    },
  },
  {
    name: "get_registrations",
    description: "Get registration form submissions with custom field answers.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        limit: { type: "number" },
        offset: { type: "number" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "get_event_analytics",
    description:
      "Live check-in analytics: total registered, checked-in, check-in rate, arrival curve.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "verify_checkin",
    description: "Verify and check in an attendee by their QR pass token.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        token: { type: "string", description: "QR pass token to verify" },
      },
      required: ["eventId", "token"],
    },
  },
  {
    name: "lookup_pass",
    description: "Look up an attendee pass by name, email, or ticket ID.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        query: { type: "string", description: "Name, email, or ticket ID" },
      },
      required: ["eventId", "query"],
    },
  },
  {
    name: "issue_pass",
    description: "Manually issue or re-issue a QR pass to an approved attendee.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        attendeeId: { type: "string" },
      },
      required: ["eventId", "attendeeId"],
    },
  },
  {
    name: "get_scanner_stats",
    description: "Real-time scanner stats: scans per gate, velocity, peak arrival times.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
      },
      required: ["eventId"],
    },
  },
] as const;

type ToolName = (typeof TOOLS)[number]["name"];

async function callTool(
  name: ToolName,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "list_events": {
      const p = new URLSearchParams();
      if (args.status) p.set("status", String(args.status));
      if (args.limit) p.set("limit", String(args.limit));
      if (args.offset) p.set("offset", String(args.offset));
      return urpass("GET", `/events?${p}`);
    }
    case "get_event":
      return urpass("GET", `/events/${args.eventId}`);
    case "create_event":
      return urpass("POST", "/events", args);
    case "update_event": {
      const { eventId, ...body } = args;
      return urpass("PATCH", `/events/${eventId}`, body);
    }
    case "publish_event":
      return urpass("POST", `/events/${args.eventId}/publish`, {});
    case "get_event_readiness":
      return urpass("GET", `/events/${args.eventId}/readiness`);
    case "list_ticket_tiers":
      return urpass("GET", `/events/${args.eventId}/ticket-types`);
    case "create_ticket_tier": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/ticket-types`, body);
    }
    case "list_attendees": {
      const { eventId, ...rest } = args;
      const p = new URLSearchParams();
      if (rest.status) p.set("status", String(rest.status));
      if (rest.limit) p.set("limit", String(rest.limit));
      if (rest.offset) p.set("offset", String(rest.offset));
      return urpass("GET", `/events/${eventId}/attendees?${p}`);
    }
    case "approve_attendee":
      return urpass("POST", `/events/${args.eventId}/attendees/${args.attendeeId}/approve`, {});
    case "reject_attendee":
      return urpass("POST", `/events/${args.eventId}/attendees/${args.attendeeId}/reject`, {
        reason: args.reason,
      });
    case "get_registrations": {
      const p = new URLSearchParams();
      p.set("eventId", String(args.eventId));
      if (args.limit) p.set("limit", String(args.limit));
      if (args.offset) p.set("offset", String(args.offset));
      return urpass("GET", `/registrations?${p}`);
    }
    case "get_event_analytics":
      return urpass("GET", `/events/${args.eventId}/check-in`);
    case "verify_checkin":
      return urpass("POST", `/events/${args.eventId}/check-in`, { token: args.token });
    case "lookup_pass":
      return urpass(
        "GET",
        `/passes/verify?eventId=${args.eventId}&query=${encodeURIComponent(String(args.query))}`
      );
    case "issue_pass":
      return urpass("POST", "/passes/issue", {
        eventId: args.eventId,
        attendeeId: args.attendeeId,
      });
    case "get_scanner_stats":
      return urpass("GET", `/events/${args.eventId}/check-in?stats=true`);
    default:
      throw new Error(`Unknown tool: ${String(name)}`);
  }
}

const server = new Server(
  { name: "urpass-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    const result = await callTool(
      name as ToolName,
      args as Record<string, unknown>
    );
    return {
      content: [
        {
          type: "text" as const,
          text:
            typeof result === "string"
              ? result
              : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
