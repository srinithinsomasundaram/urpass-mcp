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
  {
    name: "send_announcement",
    description: "Send a custom email announcement to attendees (approved, pending, or all).",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        subject: { type: "string" },
        message: { type: "string" },
        audience: { type: "string", enum: ["all", "approved", "pending"] },
      },
      required: ["eventId", "subject", "message"],
    },
  },
  {
    name: "set_event_branding",
    description: "Set event brand color, logo URL, and banner image URL.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        brandColor: { type: "string" },
        logoUrl: { type: "string" },
        bannerUrl: { type: "string" },
        hideBranding: { type: "boolean" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "configure_registration",
    description: "Configure registration settings: auto-approve, waitlist, capacity, open/close window.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        autoApprove: { type: "boolean" },
        waitlistEnabled: { type: "boolean" },
        attendeeLimit: { type: "number" },
        applicationEnabled: { type: "boolean" },
        registrationOpensAt: { type: "string" },
        registrationClosesAt: { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "add_registration_field",
    description: "Add a custom field to the event registration form.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        label: { type: "string" },
        type: { type: "string", enum: ["text", "textarea", "select", "checkbox", "phone", "email"] },
        required: { type: "boolean" },
        placeholder: { type: "string" },
        options: { type: "array", items: { type: "string" } },
      },
      required: ["eventId", "label", "type"],
    },
  },
  {
    name: "bulk_approve",
    description: "Bulk approve pending attendees, optionally filtered by email domain or ticket type.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        emailDomain: { type: "string" },
        ticketType: { type: "string" },
        limit: { type: "number" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "update_ticket_tier",
    description: "Update an existing ticket tier's name, price, capacity, or status.",
    inputSchema: {
      type: "object",
      properties: {
        tierId: { type: "string" },
        eventId: { type: "string" },
        name: { type: "string" },
        price: { type: "number" },
        capacity: { type: "number" },
        description: { type: "string" },
        status: { type: "string", enum: ["draft", "on_sale", "closed"] },
        maxPerPerson: { type: "number" },
      },
      required: ["tierId", "eventId"],
    },
  },
  {
    name: "add_check_in_gate",
    description: "Create a named check-in gate (e.g. Main Entrance, VIP Gate).",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        name: { type: "string" },
        zone: { type: "string" },
      },
      required: ["eventId", "name"],
    },
  },
  {
    name: "list_check_in_gates",
    description: "List all check-in gates for an event.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "close_event",
    description: "Mark an event as completed or cancelled. Requires confirm: true.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        action: { type: "string", enum: ["complete", "cancel"] },
        reason: { type: "string" },
        confirm: { type: "boolean" },
      },
      required: ["eventId", "action"],
    },
  },
  {
    name: "add_agenda_session",
    description: "Add a program session to the event agenda.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        title: { type: "string" },
        session_type: { type: "string" },
        session_date: { type: "string" },
        start_time: { type: "string" },
        end_time: { type: "string" },
        room_id: { type: "string" },
        track_id: { type: "string" },
        capacity: { type: "number" },
        registration_required: { type: "boolean" },
        description: { type: "string" },
      },
      required: ["eventId", "title", "session_date", "start_time", "end_time"],
    },
  },
  {
    name: "list_agenda",
    description: "List all program sessions in the event agenda.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        date: { type: "string" },
        roomId: { type: "string" },
        trackId: { type: "string" },
        limit: { type: "number" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "get_ticket_studio",
    description: "Get the current Ticket Studio canvas design and browse all available templates.",
    inputSchema: {
      type: "object",
      properties: { eventId: { type: "string" } },
      required: ["eventId"],
    },
  },
  {
    name: "apply_ticket_template",
    description: "Apply a Ticket Studio template to an event by template ID, with optional color and logo overrides.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        templateId: { type: "string" },
        primaryColor: { type: "string" },
        logoUrl: { type: "string" },
        publish: { type: "boolean" },
      },
      required: ["eventId", "templateId"],
    },
  },
  {
    name: "update_ticket_canvas",
    description: "Edit the Ticket Studio canvas: background, accent color swap, pattern, name, publish.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        backgroundType: { type: "string", enum: ["color", "gradient", "pattern"] },
        backgroundColor: { type: "string" },
        backgroundSecondaryColor: { type: "string" },
        backgroundGradientAngle: { type: "number" },
        backgroundPattern: { type: "string", enum: ["mesh", "dots", "radial", "stripes", "clean"] },
        swapPrimaryColor: { type: "string" },
        designName: { type: "string" },
        publish: { type: "boolean" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "publish_ticket_studio",
    description: "Validate and publish the Ticket Studio design. Requires confirm: true.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        confirm: { type: "boolean" },
      },
      required: ["eventId"],
    },
  },
  {
    name: "list_studio_elements",
    description: "List all canvas elements with their ids, positions, sizes, and style properties.",
    inputSchema: {
      type: "object",
      properties: { eventId: { type: "string" } },
      required: ["eventId"],
    },
  },
  {
    name: "update_studio_element",
    description: "Update any property of a canvas element by its id.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" }, elementId: { type: "string" },
        x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" },
        rotation: { type: "number" }, zIndex: { type: "number" }, locked: { type: "boolean" }, hidden: { type: "boolean" }, opacity: { type: "number" },
        content: { type: "string" }, fieldKey: { type: "string" }, fallbackText: { type: "string" },
        fontSize: { type: "number" }, fontWeight: { type: "number" }, color: { type: "string" }, fontFamily: { type: "string" },
        textAlign: { type: "string" }, letterSpacing: { type: "number" }, lineHeight: { type: "number" },
        textTransform: { type: "string" }, prefix: { type: "string" }, suffix: { type: "string" },
        fillColor: { type: "string" }, borderColor: { type: "string" }, borderWidth: { type: "number" }, borderRadius: { type: "number" },
        shapeType: { type: "string" }, src: { type: "string" }, objectFit: { type: "string" },
        fgColor: { type: "string" }, bgColor: { type: "string" }, cornerRadius: { type: "number" }, showScanLabel: { type: "boolean" }, scanLabelText: { type: "string" },
        dividerColor: { type: "string" }, thickness: { type: "number" }, dividerStyle: { type: "string" },
      },
      required: ["eventId", "elementId"],
    },
  },
  {
    name: "add_studio_element",
    description: "Add a new element (text, dynamic_text, shape, image, qr, divider) to the canvas.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" }, type: { type: "string" }, name: { type: "string" },
        x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" }, zIndex: { type: "number" },
        content: { type: "string" }, fieldKey: { type: "string" }, fallbackText: { type: "string" },
        fontSize: { type: "number" }, fontWeight: { type: "number" }, color: { type: "string" }, fontFamily: { type: "string" },
        textAlign: { type: "string" }, letterSpacing: { type: "number" }, textTransform: { type: "string" },
        prefix: { type: "string" }, suffix: { type: "string" },
        shapeType: { type: "string" }, fillColor: { type: "string" }, borderColor: { type: "string" }, borderWidth: { type: "number" }, borderRadius: { type: "number" }, opacity: { type: "number" },
        src: { type: "string" }, objectFit: { type: "string" },
        fgColor: { type: "string" }, bgColor: { type: "string" }, cornerRadius: { type: "number" }, showScanLabel: { type: "boolean" },
        dividerColor: { type: "string" }, thickness: { type: "number" }, dividerStyle: { type: "string" },
      },
      required: ["eventId", "type", "name", "x", "y", "width", "height"],
    },
  },
  {
    name: "remove_studio_element",
    description: "Remove a canvas element by its id.",
    inputSchema: {
      type: "object",
      properties: { eventId: { type: "string" }, elementId: { type: "string" } },
      required: ["eventId", "elementId"],
    },
  },
  {
    name: "build_custom_studio_design",
    description: "Build a complete ticket design from scratch with specified background, accent color, format, and content fields.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string" }, format: { type: "string", enum: ["digital","printable","badge"] },
        name: { type: "string" }, backgroundColor: { type: "string" }, backgroundType: { type: "string" },
        backgroundSecondaryColor: { type: "string" }, backgroundGradientAngle: { type: "number" }, backgroundPattern: { type: "string" },
        primaryColor: { type: "string" }, logoUrl: { type: "string" },
        showAttendeeName: { type: "boolean" }, showTicketCategory: { type: "boolean" }, showEventName: { type: "boolean" },
        showEventDate: { type: "boolean" }, showVenue: { type: "boolean" }, showQr: { type: "boolean" },
        publish: { type: "boolean" },
      },
      required: ["eventId", "backgroundColor", "primaryColor"],
    },
  },
  {
    name: "design_ticket",
    description: "Customise the visual design of digital ticket passes for an event. Set template, style, brand colors, QR position, custom message, and category accent colors.",
    inputSchema: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "Event UUID" },
        template: { type: "string", enum: ["minimal", "event", "dark", "modern"] },
        ticketStyle: { type: "string", enum: ["concert", "cinema", "boarding", "vip_gold", "stadium", "vintage", "cyber", "executive"] },
        primaryColor: { type: "string", description: "Primary brand color as hex (e.g. #635BFF)" },
        secondaryColor: { type: "string", description: "Secondary accent color as hex" },
        shape: { type: "string", enum: ["standard", "rounded", "compact"] },
        format: { type: "string", enum: ["mobile", "badge", "print"] },
        pattern: { type: "string", enum: ["mesh", "dots", "radial", "stripes", "clean"] },
        fontFamily: { type: "string", enum: ["sans", "mono", "serif"] },
        headerStyle: { type: "string", enum: ["gradient", "solid", "glass"] },
        badgeLabel: { type: "string", description: "Short label on badge (e.g. SPEAKER, VIP)" },
        footerNote: { type: "string", description: "Custom footer note on every pass" },
        accentGlow: { type: "boolean" },
        customMessage: { type: "string", description: "Custom message on the pass (max 160 chars)" },
        customInstruction: { type: "string", description: "Gate/entry instruction for attendees (max 160 chars)" },
        categoryColors: { type: "object", description: "Map of ticket category names to hex accent colors", additionalProperties: { type: "string" } },
        showAttendeeName: { type: "boolean" },
        showTicketType: { type: "boolean" },
        showEventDate: { type: "boolean" },
        showVenue: { type: "boolean" },
        showTicketId: { type: "boolean" },
        qrSize: { type: "string", enum: ["sm", "md", "lg"] },
        qrPosition: { type: "string", enum: ["center", "bottom"] },
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
    case "design_ticket": {
      const { eventId, ...body } = args;
      return urpass("PATCH", `/events/${eventId}/design`, body);
    }
    case "get_ticket_studio":
      return urpass("GET", `/events/${args.eventId}/studio`);
    case "apply_ticket_template": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/studio/template`, body);
    }
    case "update_ticket_canvas": {
      const { eventId, ...body } = args;
      return urpass("PATCH", `/events/${eventId}/studio/canvas`, body);
    }
    case "publish_ticket_studio": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/studio/publish`, body);
    }
    case "list_studio_elements":
      return urpass("GET", `/events/${args.eventId}/studio/elements`);
    case "update_studio_element": {
      const { eventId, elementId, ...body } = args;
      return urpass("PATCH", `/events/${eventId}/studio/elements/${elementId}`, body);
    }
    case "add_studio_element": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/studio/elements`, body);
    }
    case "remove_studio_element":
      return urpass("DELETE", `/events/${args.eventId}/studio/elements/${args.elementId}`);
    case "build_custom_studio_design": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/studio/build`, body);
    }
    case "send_announcement": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/announce`, body);
    }
    case "set_event_branding": {
      const { eventId, ...body } = args;
      return urpass("PATCH", `/events/${eventId}/branding`, body);
    }
    case "configure_registration": {
      const { eventId, ...body } = args;
      return urpass("PATCH", `/events/${eventId}/registration`, body);
    }
    case "add_registration_field": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/registration/fields`, body);
    }
    case "bulk_approve": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/attendees/bulk-approve`, body);
    }
    case "update_ticket_tier": {
      const { tierId, eventId, ...body } = args;
      return urpass("PATCH", `/events/${eventId}/ticket-types/${tierId}`, body);
    }
    case "add_check_in_gate": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/gates`, body);
    }
    case "list_check_in_gates":
      return urpass("GET", `/events/${args.eventId}/gates`);
    case "close_event": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/close`, body);
    }
    case "add_agenda_session": {
      const { eventId, ...body } = args;
      return urpass("POST", `/events/${eventId}/sessions`, body);
    }
    case "list_agenda": {
      const { eventId, date, roomId, trackId, limit } = args;
      const p = new URLSearchParams();
      if (date) p.set("date", String(date));
      if (roomId) p.set("roomId", String(roomId));
      if (trackId) p.set("trackId", String(trackId));
      if (limit) p.set("limit", String(limit));
      return urpass("GET", `/events/${eventId}/sessions?${p}`);
    }
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
