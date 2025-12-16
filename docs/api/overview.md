# API Overview

The WhatsApp Flow Builder provides a REST API for managing flows, configurations, and users.

## Base URL

```
https://your-domain.pages.dev/api
```

## Authentication

All API endpoints (except auth) require a valid JWT token.

### Getting a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

Response:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Using the Token

Include in all requests:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Endpoints

### Flows

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flows` | List all flows |
| POST | `/api/flows` | Create new flow |
| GET | `/api/flows/:id` | Get flow by ID |
| PUT | `/api/flows/:id` | Update flow |
| DELETE | `/api/flows/:id` | Delete flow |

### WhatsApp Configs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/whatsapp-configs` | List configs |
| POST | `/api/whatsapp-configs` | Create config |
| GET | `/api/whatsapp-configs/:id` | Get config |
| PUT | `/api/whatsapp-configs/:id` | Update config |
| DELETE | `/api/whatsapp-configs/:id` | Delete config |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Admin (Super Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/organizations` | List organizations |
| POST | `/api/admin/organizations` | Create organization |
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |

## Response Format

### Success

```json
{
  "data": { ... },
  "message": "Success"
}
```

### Error

```json
{
  "error": "Error message",
  "status": 400
}
```

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

## Rate Limiting

Currently no rate limiting implemented. Be reasonable with API usage.

## CORS

API allows requests from:
- Same origin
- Configured allowed origins

## Pagination

List endpoints support pagination:

```
GET /api/flows?page=1&limit=20
```

Response includes:

```json
{
  "flows": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

## Filtering

Some endpoints support filtering:

```
GET /api/flows?is_active=true
GET /api/flows?trigger_type=keyword
```

## Webhook

The webhook endpoint handles WhatsApp messages:

```
POST /webhook
GET /webhook (verification)
```

See [Webhooks](/api/webhooks) for details.
