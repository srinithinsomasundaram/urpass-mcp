# urpass-mcp

Official [Model Context Protocol](https://modelcontextprotocol.io) server for [UrPass](https://urpass.space) — the event management platform for colleges, communities, and enterprises in India.

Connect Claude (or any MCP-compatible AI) to your UrPass account and manage events, registrations, QR check-in, and analytics through natural conversation.

---

## Quickstart

### Claude.ai (web)

1. Click **[Add connector](https://claude.ai/new?modal=add-custom-connector#customize/connectors)**
2. Paste the MCP URL: `https://urpass.space/api/mcp`
3. Under **OAuth client** → select **Use your own OAuth client**
4. Paste your UrPass API key as the **OAuth Client ID** (leave secret blank)
5. Click **Sign in now** and authorize

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "urpass": {
      "command": "npx",
      "args": ["-y", "urpass-mcp"],
      "env": {
        "URPASS_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Get your API key

1. Sign in at [urpass.space](https://urpass.space)
2. Go to **Dashboard → Developer Settings**
3. Click **Generate API Key**

Full guide: [urpass.space/articles/connect-urpass-claude-mcp](https://urpass.space/articles/connect-urpass-claude-mcp)

---

## Tools (38)

| Tool | Description |
|------|-------------|
| `list_events` | List events, filter by status |
| `get_event` | Full event details with live stats |
| `create_event` | Create a new event |
| `update_event` | Update event details |
| `publish_event` | Publish a draft event |
| `get_event_readiness` | Pre-flight check before publishing |
| `list_ticket_tiers` | View tiers and availability |
| `create_ticket_tier` | Add a new ticket tier |
| `list_attendees` | List attendees, filter by status |
| `approve_attendee` | Approve and issue QR pass |
| `reject_attendee` | Reject an attendee |
| `get_registrations` | View form submissions |
| `get_event_analytics` | Live check-in analytics |
| `verify_checkin` | Check in by QR token |
| `lookup_pass` | Look up a pass by name or email |
| `issue_pass` | Re-issue a QR pass |
| `get_scanner_stats` | Real-time gate scanner stats |
| `get_ticket_studio` | Get current canvas design + browse 23 available templates |
| `apply_ticket_template` | Apply a studio template by ID with color + logo override |
| `update_ticket_canvas` | Edit background, swap accent colors, set pattern, publish |
| `publish_ticket_studio` | Validate QR contrast + publish the studio design live |
| `list_studio_elements` | List all canvas elements with ids, positions, and style |
| `update_studio_element` | Patch any element property by id (color, font, pos, text…) |
| `add_studio_element` | Add new element: text, dynamic field, shape, image, QR, divider |
| `remove_studio_element` | Delete a canvas element by id |
| `build_custom_studio_design` | Build a full custom design from scratch (no template needed) |
| `design_ticket` | Set ticket pass visual design (template, colors, style, QR, message) |
| `send_announcement` | Blast a custom email to all approved / pending / all attendees |
| `set_event_branding` | Set event brand color, logo, and banner image |
| `configure_registration` | Set auto-approve, waitlist, capacity, open/close window |
| `add_registration_field` | Add a custom field to the registration form |
| `bulk_approve` | Bulk-approve pending attendees (filter by domain or tier) |
| `update_ticket_tier` | Update price, capacity, name, or status of a tier |
| `add_check_in_gate` | Create a named check-in gate (Main Entrance, VIP Gate…) |
| `list_check_in_gates` | List all check-in gates for an event |
| `close_event` | Mark event as completed or cancelled |
| `add_agenda_session` | Add a program session to the event agenda |
| `list_agenda` | List all program sessions in the agenda |

---

## Example prompts

```
Create a college fest for 500 people on January 15th at the campus auditorium.
```
```
Add Early Bird tickets at ₹299 (100 seats) and General at ₹499 (400 seats).
```
```
Show today's check-in rate for my TEDx event.
```
```
Approve all pending registrations from anna-university.ac.in.
```
```
Run a readiness check before I publish my event.
```
```
How many people checked in between 9am and 10am?
```
```
List all my draft events and tell me which ones are missing ticket tiers.
```
```
Design my TEDx event tickets with a dark VIP gold style, primary color #D4AF37, and set VIP category to gold and General to indigo.
```
```
Send an announcement to all approved attendees: "Gates open at 9 AM. Bring your QR pass."
```
```
Set auto-approve on, enable waitlist, and close registration on December 20th.
```
```
Add a required dropdown field asking attendees for their T-shirt size (S, M, L, XL, XXL).
```
```
Bulk approve all pending attendees from iit.ac.in.
```
```
Add three check-in gates: Main Entrance, VIP Lounge, and Press Entry.
```
```
Add a keynote session "AI in India" on December 15th from 10 AM to 11 AM.
```

---

## License

MIT © [UrPass](https://urpass.space)
