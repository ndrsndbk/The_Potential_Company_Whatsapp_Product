# Authentication

The API uses JWT (JSON Web Tokens) for authentication.

## Login

### Request

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

### Response

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "organization_id": "org-uuid"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Errors

| Status | Error |
|--------|-------|
| 400 | Missing email or password |
| 401 | Invalid credentials |
| 403 | Account disabled |

## Register

### Request

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "secure-password",
  "full_name": "Jane Doe"
}
```

### Response

```json
{
  "user": {
    "id": "new-user-uuid",
    "email": "newuser@example.com",
    "full_name": "Jane Doe",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Errors

| Status | Error |
|--------|-------|
| 400 | Invalid email format |
| 400 | Password too short |
| 409 | Email already registered |

## Get Current User

### Request

```bash
GET /api/auth/me
Authorization: Bearer <token>
```

### Response

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user",
    "organization": {
      "id": "org-uuid",
      "name": "Acme Corp"
    }
  }
}
```

## Logout

### Request

```bash
POST /api/auth/logout
Authorization: Bearer <token>
```

### Response

```json
{
  "message": "Logged out successfully"
}
```

## Using Tokens

Include the token in the Authorization header:

```bash
curl -X GET https://your-domain.pages.dev/api/flows \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Token Structure

JWT payload contains:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "user",
  "org": "organization-uuid",
  "iat": 1704067200,
  "exp": 1704153600
}
```

## Token Expiration

- Tokens expire after 24 hours
- Refresh by logging in again
- Frontend handles auto-refresh

## Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access to all data and admin functions |
| `org_admin` | Full access within organization |
| `user` | Access own flows and org configs |

## Security Best Practices

### Store Tokens Securely

```javascript
// Frontend - localStorage (simple but XSS vulnerable)
localStorage.setItem('token', token);

// Better - httpOnly cookie (set by server)
```

### Don't Expose Tokens

- Never log tokens
- Don't include in URLs
- Clear on logout

### Handle Expiration

```javascript
// Check before each request
if (isTokenExpired(token)) {
  await refreshToken();
}
```

## Password Requirements

- Minimum 8 characters
- Mix of letters and numbers recommended
- No maximum length enforced

## Rate Limiting

Auth endpoints have stricter limits:
- Login: 5 attempts per minute
- Register: 3 attempts per minute

After exceeding: 15-minute cooldown
