# Admin APIs

Administrative endpoints for managing organizations and users. **Super Admin only.**

## Authorization

All admin endpoints require `super_admin` role:

```bash
Authorization: Bearer <super_admin_token>
```

Non-super-admin requests return 403 Forbidden.

---

## Organizations

### List Organizations

```bash
GET /api/admin/organizations
```

#### Response

```json
{
  "organizations": [
    {
      "id": "org-uuid-1",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "is_active": true,
      "user_count": 5,
      "flow_count": 12,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 10
}
```

### Get Organization

```bash
GET /api/admin/organizations/:id
```

#### Response

```json
{
  "organization": {
    "id": "org-uuid",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "logo_url": "https://...",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z",
    "users": [...],
    "whatsapp_configs": [...],
    "stats": {
      "total_flows": 12,
      "active_flows": 8,
      "total_users": 5
    }
  }
}
```

### Create Organization

```bash
POST /api/admin/organizations
Content-Type: application/json

{
  "name": "New Company",
  "slug": "new-company",
  "logo_url": "https://example.com/logo.png"
}
```

#### Response

```json
{
  "organization": {
    "id": "new-org-uuid",
    "name": "New Company",
    "slug": "new-company",
    "is_active": true,
    "created_at": "2024-01-15T14:00:00Z"
  }
}
```

### Update Organization

```bash
PUT /api/admin/organizations/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "is_active": false
}
```

### Delete Organization

```bash
DELETE /api/admin/organizations/:id
```

⚠️ **Warning:** Deleting an organization removes all its data (flows, users, configs).

---

## Users

### List Users

```bash
GET /api/admin/users
```

#### Query Parameters

| Parameter | Description |
|-----------|-------------|
| `organization_id` | Filter by organization |
| `role` | Filter by role |
| `is_active` | Filter by status |

#### Response

```json
{
  "users": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "user",
      "organization": {
        "id": "org-uuid",
        "name": "Acme Corp"
      },
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 50
}
```

### Get User

```bash
GET /api/admin/users/:id
```

#### Response

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "avatar_url": "https://...",
    "role": "user",
    "organization_id": "org-uuid",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T00:00:00Z",
    "last_login": "2024-01-15T10:00:00Z"
  }
}
```

### Create User

```bash
POST /api/admin/users
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "temporary-password",
  "full_name": "Jane Doe",
  "role": "user",
  "organization_id": "org-uuid"
}
```

#### Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full system access |
| `org_admin` | Full org access |
| `user` | Standard user |

### Update User

```bash
PUT /api/admin/users/:id
Content-Type: application/json

{
  "full_name": "Jane Smith",
  "role": "org_admin",
  "is_active": true
}
```

### Delete User

```bash
DELETE /api/admin/users/:id
```

### Reset Password

```bash
POST /api/admin/users/:id/reset-password
Content-Type: application/json

{
  "new_password": "new-temporary-password"
}
```

---

## Bulk Operations

### Deactivate All Org Users

```bash
POST /api/admin/organizations/:id/deactivate-users
```

### Transfer User

Move user to different organization:

```bash
PUT /api/admin/users/:id
{
  "organization_id": "new-org-uuid"
}
```

---

## Audit Considerations

Admin actions should be logged:

- Who performed the action
- What was changed
- When it occurred
- Previous values

---

## Errors

| Status | Error |
|--------|-------|
| 400 | Invalid data |
| 401 | Not authenticated |
| 403 | Not a super admin |
| 404 | Resource not found |
| 409 | Conflict (duplicate email, slug) |
