# Webhooks

The webhook endpoint receives messages from WhatsApp Cloud API.

## Endpoint

```
POST /webhook
GET /webhook (verification only)
```

## Webhook Verification

WhatsApp verifies your webhook during setup:

### Request (from WhatsApp)

```
GET /webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```

### Response

Return the `hub.challenge` value if token matches:

```
CHALLENGE
```

### Environment Variable

Set `VERIFY_TOKEN` to match your WhatsApp configuration.

## Receiving Messages

### Request (from WhatsApp)

```bash
POST /webhook
Content-Type: application/json

{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "1234567890",
          "phone_number_id": "PHONE_NUMBER_ID"
        },
        "contacts": [{
          "profile": { "name": "John Doe" },
          "wa_id": "1234567890"
        }],
        "messages": [{
          "from": "1234567890",
          "id": "wamid.xxx",
          "timestamp": "1704067200",
          "type": "text",
          "text": { "body": "HELLO" }
        }]
      },
      "field": "messages"
    }]
  }]
}
```

### Response

Always return 200 OK quickly:

```json
{ "status": "ok" }
```

## Message Types

### Text Message

```json
{
  "type": "text",
  "text": { "body": "Hello there!" }
}
```

### Button Reply

```json
{
  "type": "interactive",
  "interactive": {
    "type": "button_reply",
    "button_reply": {
      "id": "button_id",
      "title": "Button Text"
    }
  }
}
```

### List Reply

```json
{
  "type": "interactive",
  "interactive": {
    "type": "list_reply",
    "list_reply": {
      "id": "list_item_id",
      "title": "Item Title"
    }
  }
}
```

### Image Message

```json
{
  "type": "image",
  "image": {
    "id": "MEDIA_ID",
    "mime_type": "image/jpeg"
  }
}
```

## Webhook Processing

When a message arrives:

1. **Verify Signature** - Check X-Hub-Signature-256 header
2. **Extract Message** - Parse the webhook payload
3. **Check Idempotency** - Skip if message_id already processed
4. **Find Flow** - Match trigger to active flow
5. **Execute Flow** - Run nodes starting from trigger or saved state
6. **Save State** - Store conversation state for wait nodes

## Security

### Signature Verification

WhatsApp signs webhooks with your app secret:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, appSecret) {
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');
  return `sha256=${expectedSignature}` === signature;
}
```

### Idempotency

Messages may be delivered multiple times. Track processed message IDs:

```sql
INSERT INTO processed_events (message_id, processed_at)
VALUES ('wamid.xxx', NOW())
ON CONFLICT (message_id) DO NOTHING;
```

## Webhook Fields

Subscribe to these webhook fields in Meta Developer Console:

| Field | Description |
|-------|-------------|
| `messages` | Incoming messages |
| `message_deliveries` | Delivery receipts (optional) |
| `message_reads` | Read receipts (optional) |

## Error Handling

### Always Return 200

Even on errors, return 200 to prevent WhatsApp from retrying:

```javascript
try {
  await processMessage(message);
} catch (error) {
  console.error('Processing error:', error);
  // Still return 200
}
return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
```

### Retry Logic

WhatsApp retries on non-200 responses:
- Retries for up to 7 days
- Exponential backoff

## Testing

### Local Development

Use ngrok or similar to expose local server:

```bash
ngrok http 8788
```

Configure webhook URL in Meta Developer Console to ngrok URL.

### Test Webhook

Send test payload:

```bash
curl -X POST http://localhost:8788/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "1234567890",
            "id": "test-id",
            "type": "text",
            "text": {"body": "HELLO"}
          }]
        }
      }]
    }]
  }'
```

## Troubleshooting

### Webhook Not Receiving

1. Check URL is publicly accessible
2. Verify SSL certificate is valid
3. Confirm webhook is subscribed to correct fields
4. Check Meta App is in live mode

### Messages Not Processing

1. Check trigger matches incoming message
2. Verify flow is published AND active
3. Check WhatsApp config is correct
4. Review server logs for errors
