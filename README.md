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

## Tools (18)

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
| `design_ticket` | Set ticket pass visual design (template, colors, style, QR, message) |

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

---

## License

MIT © [UrPass](https://urpass.space)
