# WhatsApp Configs API

Manage WhatsApp Business API configurations.

## Overview

Each WhatsApp config represents a phone number connected to WhatsApp Cloud API.

## List Configs

### Request

```bash
GET /api/whatsapp-configs
Authorization: Bearer <token>
```

### Response

```json
{
  "configs": [
    {
      "id": "config-uuid",
      "name": "Main Business Line",
      "phone_number_id": "123456789",
      "display_phone": "+1 234 567 8900",
      "is_active": true,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

## Get Config

### Request

```bash
GET /api/whatsapp-configs/:id
Authorization: Bearer <token>
```

### Response

```json
{
  "config": {
    "id": "config-uuid",
    "name": "Main Business Line",
    "phone_number_id": "123456789",
    "display_phone": "+1 234 567 8900",
    "webhook_verify_token": "my-verify-token",
    "is_active": true,
    "organization_id": "org-uuid",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

Note: `access_token` is never returned in API responses for security.

## Create Config

### Request

```bash
POST /api/whatsapp-configs
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Business Line",
  "phone_number_id": "987654321",
  "access_token": "EAAxxxxxxx...",
  "webhook_verify_token": "my-secret-token",
  "display_phone": "+1 555 123 4567"
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name |
| `phone_number_id` | Yes | WhatsApp Phone Number ID |
| `access_token` | Yes | WhatsApp Cloud API token |
| `webhook_verify_token` | No | Webhook verification token |
| `display_phone` | No | Human-readable phone number |

### Response

```json
{
  "config": {
    "id": "new-config-uuid",
    "name": "New Business Line",
    "phone_number_id": "987654321",
    "is_active": true,
    "created_at": "2024-01-15T14:00:00Z"
  }
}
```

## Update Config

### Request

```bash
PUT /api/whatsapp-configs/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "access_token": "new-token-if-changed",
  "is_active": true
}
```

### Response

```json
{
  "config": {
    "id": "config-uuid",
    "name": "Updated Name",
    "updated_at": "2024-01-15T15:00:00Z",
    ...
  }
}
```

## Delete Config

### Request

```bash
DELETE /api/whatsapp-configs/:id
Authorization: Bearer <token>
```

### Response

```json
{
  "message": "Config deleted successfully"
}
```

## Token Management

### Access Token

The WhatsApp Cloud API access token:
- Stored encrypted in database
- Never returned in API responses
- Required for sending messages

### Refreshing Tokens

When token expires:

1. Get new token from Meta Developer Console
2. Update config with new token:

```bash
PUT /api/whatsapp-configs/:id
{
  "access_token": "new-token"
}
```

## Associating with Flows

Link a flow to a WhatsApp config:

```bash
PUT /api/flows/:flow_id
{
  "whatsapp_config_id": "config-uuid"
}
```

Flows use their associated config to send messages.

## Multiple Configs

Organizations can have multiple WhatsApp numbers:

- Each config = one phone number
- Flows can use different configs
- Incoming messages routed by phone_number_id

## Errors

| Status | Error |
|--------|-------|
| 400 | Missing required fields |
| 401 | Unauthorized |
| 403 | Cannot access this config |
| 404 | Config not found |
| 409 | Phone number already configured |

## Security Notes

- Access tokens are sensitive - treat like passwords
- Use environment variables in development
- Rotate tokens periodically
- Monitor for unauthorized usage
