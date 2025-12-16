# API Call Node

Makes HTTP requests to external services and APIs.

## Overview

| Property | Value |
|----------|-------|
| Category | Actions |
| Inputs | 1 |
| Outputs | 1 |

## Configuration

### Method

HTTP method to use:

| Method | Use Case |
|--------|----------|
| GET | Fetch data |
| POST | Create/submit data |
| PUT | Update data |
| PATCH | Partial update |
| DELETE | Remove data |

### URL

The endpoint URL (supports variables):

```
https://api.example.com/users/{{customer_phone}}
```

### Headers

HTTP headers as key-value pairs:

```yaml
Content-Type: application/json
Authorization: Bearer {{api_token}}
X-Custom-Header: some-value
```

### Body (POST/PUT/PATCH)

Request body, typically JSON:

```json
{
  "name": "{{customer_name}}",
  "phone": "{{customer_phone}}",
  "message": "{{last_reply}}"
}
```

### Store Response In

Variable name to store the response:

```
api_response
```

## Examples

### GET Request

Fetch user data:

```yaml
Method: GET
URL: https://api.example.com/users/{{customer_phone}}
Headers:
  Authorization: Bearer {{api_key}}
Store In: user_data
```

### POST Request

Submit form data:

```yaml
Method: POST
URL: https://api.example.com/orders
Headers:
  Content-Type: application/json
  Authorization: Bearer {{api_key}}
Body: |
  {
    "customer": "{{customer_name}}",
    "phone": "{{customer_phone}}",
    "items": "{{selected_items}}",
    "total": {{order_total}}
  }
Store In: order_response
```

### Webhook Notification

Send data to webhook:

```yaml
Method: POST
URL: https://hooks.zapier.com/hooks/catch/123/abc
Headers:
  Content-Type: application/json
Body: |
  {
    "event": "new_lead",
    "name": "{{customer_name}}",
    "phone": "{{customer_phone}}"
  }
```

## Response Handling

### Full Response

The response is stored as JSON in the specified variable:

```json
{
  "status": 200,
  "data": {
    "id": "123",
    "name": "John",
    "email": "john@example.com"
  }
}
```

### Accessing Response Data

Use dot notation in subsequent nodes:

```
{{api_response.data.id}}
{{api_response.data.name}}
{{api_response.status}}
```

### Error Handling

Check status code:

```
Condition: {{api_response.status}} == 200
├── Yes → Success path
└── No  → Error handling path
```

## Authentication

### API Key

```yaml
Headers:
  X-API-Key: {{api_key}}
```

### Bearer Token

```yaml
Headers:
  Authorization: Bearer {{access_token}}
```

### Basic Auth

```yaml
Headers:
  Authorization: Basic {{base64_credentials}}
```

## Common Integrations

### CRM Systems

```yaml
# Create lead in CRM
POST https://api.crm.com/leads
{
  "name": "{{customer_name}}",
  "phone": "{{customer_phone}}",
  "source": "whatsapp"
}
```

### Booking Systems

```yaml
# Check availability
GET https://api.booking.com/slots?date={{selected_date}}

# Create booking
POST https://api.booking.com/appointments
{
  "customer_phone": "{{customer_phone}}",
  "slot_id": "{{selected_slot}}"
}
```

### E-commerce

```yaml
# Get product info
GET https://api.store.com/products/{{product_id}}

# Create order
POST https://api.store.com/orders
{
  "customer": "{{customer_phone}}",
  "items": [{"id": "{{product_id}}", "qty": 1}]
}
```

### Notification Services

```yaml
# Send email via SendGrid
POST https://api.sendgrid.com/v3/mail/send
Headers:
  Authorization: Bearer {{sendgrid_key}}
Body:
  {
    "to": "{{customer_email}}",
    "subject": "Order Confirmed",
    "content": "Your order #{{order_id}} is confirmed"
  }
```

## Best Practices

### Validate Before Calling

```
Condition: {{customer_email}} contains "@"
├── Yes → API Call
└── No  → Ask for valid email
```

### Handle Errors Gracefully

```
API Call → Condition (status == 200)
              ├── Yes → Continue
              └── No  → Send "Sorry, something went wrong"
```

### Don't Expose Secrets

Store API keys in:
- Environment variables (backend)
- Secure variable storage
- Never in message text

### Set Timeouts

API calls have default timeout. For slow APIs, warn users:

```
Send Text: "Looking that up for you..."
    ↓
API Call
    ↓
Send Text: "Here's what I found..."
```

## Common Issues

### Request Failed

**Causes:**
- Invalid URL
- Network error
- API down
- Authentication failed

**Debug:** Check URL, headers, and API status.

### Response Empty

**Causes:**
- API returned empty response
- Wrong variable name
- Response not JSON

### Timeout

**Causes:**
- API too slow
- Large response
- Network issues

**Fix:** Add loading message, retry logic.

## Security

### Sensitive Data

- Never log full requests/responses
- Mask tokens in debug output
- Use HTTPS only

### CORS

API Call runs server-side, so CORS doesn't apply. Any API accessible from your server works.

### Rate Limiting

Be aware of API rate limits:
- Add delays between calls if needed
- Cache responses when possible
- Handle 429 (Too Many Requests) errors
