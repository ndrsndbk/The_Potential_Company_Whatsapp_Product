# Authentication API

Backend authentication endpoints for wa-flow-builder using Supabase Auth REST API.

## Endpoints

### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe" // optional
}
```

**Response (201):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Errors:**
- 400: Email/password missing or invalid
- 500: Server error

---

### POST /api/auth/login
Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "refresh_token_here",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Errors:**
- 400: Email/password missing
- 401: Invalid credentials
- 500: Server error

---

### GET /api/auth/me
Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "full_name": "John Doe",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-01-01T00:00:00Z"
  }
}
```

**Errors:**
- 401: Missing or invalid token
- 500: Server error

---

### POST /api/auth/logout
Logout and invalidate the current session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

**Errors:**
- 401: Missing or invalid token

---

## Protected Routes

All routes under `/api/*` require authentication EXCEPT:
- `/api/auth/login`
- `/api/auth/register`
- `/webhook/*`

Protected routes must include the `Authorization` header with a valid Bearer token.

## Middleware

The `functions/_middleware.js` file handles:
1. CORS (preflight and response headers)
2. JWT token verification for protected routes
3. User context injection (accessible via `context.user` in route handlers)

## Database Schema

### Required Tables

**auth.users** (managed by Supabase Auth)
- Standard Supabase auth schema

**public.users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Environment Variables

Required in Cloudflare Pages:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (for server-side operations)

## Usage Example

```javascript
// Register
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    full_name: 'John Doe'
  })
});

// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const { access_token } = await loginResponse.json();

// Use token for protected routes
const flowsResponse = await fetch('/api/flows', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

// Get current user
const meResponse = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

// Logout
await fetch('/api/auth/logout', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});
```

## Notes

- No npm dependencies required - uses Supabase REST API directly via fetch
- JWT tokens are verified on every protected route request
- User context is available in route handlers via `context.user`
- Tokens expire based on Supabase Auth configuration (default: 1 hour)
- Use refresh tokens to obtain new access tokens when expired
