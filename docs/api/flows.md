# Flows API

Manage conversation flows programmatically.

## List Flows

### Request

```bash
GET /api/flows
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `is_active` | boolean | Filter by active status |
| `is_published` | boolean | Filter by published status |

### Response

```json
{
  "flows": [
    {
      "id": "flow-uuid-1",
      "name": "Welcome Flow",
      "trigger_type": "keyword",
      "trigger_value": "HELLO",
      "is_active": true,
      "is_published": true,
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T12:30:00Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 20
}
```

## Get Flow

### Request

```bash
GET /api/flows/:id
Authorization: Bearer <token>
```

### Response

```json
{
  "flow": {
    "id": "flow-uuid",
    "name": "Welcome Flow",
    "trigger_type": "keyword",
    "trigger_value": "HELLO",
    "trigger_values": ["HELLO", "HI", "START"],
    "nodes": [
      {
        "id": "node-1",
        "type": "trigger",
        "position": { "x": 100, "y": 100 },
        "data": {}
      },
      {
        "id": "node-2",
        "type": "send_text",
        "position": { "x": 100, "y": 250 },
        "data": {
          "text": "Welcome!"
        }
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "source": "node-1",
        "target": "node-2"
      }
    ],
    "is_active": true,
    "is_published": true,
    "whatsapp_config_id": "config-uuid",
    "organization_id": "org-uuid",
    "created_by": "user-uuid",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T12:30:00Z"
  }
}
```

## Create Flow

### Request

```bash
POST /api/flows
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Flow",
  "trigger_type": "keyword",
  "trigger_value": "START"
}
```

### Response

```json
{
  "flow": {
    "id": "new-flow-uuid",
    "name": "New Flow",
    "trigger_type": "keyword",
    "trigger_value": "START",
    "nodes": [],
    "edges": [],
    "is_active": false,
    "is_published": false,
    "created_at": "2024-01-15T14:00:00Z"
  }
}
```

## Update Flow

### Request

```bash
PUT /api/flows/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Flow Name",
  "trigger_value": "HELLO",
  "nodes": [...],
  "edges": [...],
  "is_active": true
}
```

### Updatable Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Flow name |
| `trigger_type` | string | keyword, regex, default |
| `trigger_value` | string | Trigger text/pattern |
| `trigger_values` | string[] | Multiple triggers |
| `nodes` | array | Node definitions |
| `edges` | array | Connections |
| `is_active` | boolean | Active status |
| `is_published` | boolean | Published status |
| `whatsapp_config_id` | string | WhatsApp config |

### Response

```json
{
  "flow": {
    "id": "flow-uuid",
    "name": "Updated Flow Name",
    "updated_at": "2024-01-15T15:00:00Z",
    ...
  }
}
```

## Delete Flow

### Request

```bash
DELETE /api/flows/:id
Authorization: Bearer <token>
```

### Response

```json
{
  "message": "Flow deleted successfully"
}
```

## Publish Flow

Publishing makes a flow available to receive messages.

### Request

```bash
PUT /api/flows/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "is_published": true
}
```

## Node Structure

Each node in the `nodes` array:

```json
{
  "id": "unique-node-id",
  "type": "send_text",
  "position": {
    "x": 100,
    "y": 200
  },
  "data": {
    "text": "Hello {{customer_name}}!",
    "delay": 0
  }
}
```

### Node Types

- `trigger`
- `send_text`
- `send_image`
- `send_video`
- `send_audio`
- `send_document`
- `send_buttons`
- `send_list`
- `send_location`
- `send_contact`
- `send_sticker`
- `send_stamp_card`
- `wait_for_reply`
- `condition`
- `set_variable`
- `loop`
- `random_choice`
- `get_customer_name`
- `get_customer_phone`
- `get_customer_country`
- `get_message_timestamp`
- `format_phone`
- `date_time`
- `math_operation`
- `text_operation`
- `mark_as_read`
- `api_call`
- `delay`
- `end`

## Edge Structure

Each edge in the `edges` array:

```json
{
  "id": "unique-edge-id",
  "source": "source-node-id",
  "target": "target-node-id",
  "sourceHandle": "output",
  "targetHandle": "input"
}
```

For condition nodes:
- `sourceHandle`: `"yes"` or `"no"`

## Errors

| Status | Error |
|--------|-------|
| 400 | Invalid flow data |
| 401 | Unauthorized |
| 403 | Not allowed to access this flow |
| 404 | Flow not found |
| 409 | Trigger conflict (duplicate) |
