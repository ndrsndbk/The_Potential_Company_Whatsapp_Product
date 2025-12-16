# Architecture

This document explains the technical architecture of WhatsApp Flow Builder.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cloudflare Edge                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │    Static    │    │    Pages     │    │   Webhook    │       │
│  │   Assets     │    │  Functions   │    │   Handler    │       │
│  │  (React App) │    │    (API)     │    │              │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ Supabase │    │ WhatsApp │    │ External │
       │ Database │    │ Cloud API│    │   APIs   │
       └──────────┘    └──────────┘    └──────────┘
```

## Frontend Architecture

### React Application

The frontend is a single-page React application built with:

- **Vite** - Build tool and dev server
- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Flow** - Visual flow editor
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing

### Component Structure

```
src/
├── components/
│   ├── nodes/           # Custom React Flow nodes
│   │   ├── TriggerNode.tsx
│   │   ├── SendTextNode.tsx
│   │   ├── ConditionNode.tsx
│   │   └── ...
│   ├── properties/      # Property panel forms
│   │   ├── PropertyPanel.tsx
│   │   ├── TriggerConfigForm.tsx
│   │   └── ...
│   ├── FlowEditor.tsx   # Main editor canvas
│   └── NodePalette.tsx  # Node selection sidebar
├── contexts/
│   └── AuthContext.tsx  # Authentication state
├── lib/
│   ├── api.ts           # API client
│   └── nodeTypes.ts     # Node type definitions
└── pages/
    ├── FlowList.tsx     # Dashboard
    ├── FlowEditor.tsx   # Editor page
    └── Login.tsx        # Authentication
```

### State Management

- **React Flow** manages node/edge state in the editor
- **AuthContext** handles user authentication
- **Local state** for UI components
- **URL params** for flow ID routing

## Backend Architecture

### Cloudflare Pages Functions

The backend runs as serverless functions on Cloudflare's edge network:

```
functions/
├── api/
│   ├── flows/
│   │   ├── index.js        # GET list, POST create
│   │   └── [id].js         # GET, PUT, DELETE by ID
│   ├── whatsapp-configs/
│   │   ├── index.js
│   │   └── [id].js
│   ├── auth/
│   │   ├── login.js
│   │   ├── register.js
│   │   └── me.js
│   └── admin/
│       ├── organizations/
│       └── users/
├── webhook.js              # WhatsApp webhook handler
└── _middleware.js          # Auth middleware
```

### Request Flow

1. Request hits Cloudflare edge
2. Static assets served directly
3. API routes go through middleware
4. Middleware verifies JWT token
5. Handler processes request
6. Response returned to client

### Webhook Processing

```
WhatsApp sends        Webhook receives       Flow engine
POST /webhook  ──────▶  parses message  ──▶  executes flow
                              │
                              ▼
                       Saves state to
                       Supabase
```

## Database Schema

### Core Tables

```sql
-- Organizations (multi-tenant)
organizations
├── id (UUID)
├── name
├── slug (unique)
└── is_active

-- Users
users
├── id (UUID, refs auth.users)
├── email
├── role (super_admin, org_admin, user)
└── organization_id

-- Flows
flows
├── id (UUID)
├── name
├── trigger_type
├── trigger_value
├── nodes (JSONB)
├── edges (JSONB)
├── is_active
├── is_published
└── organization_id

-- WhatsApp Configurations
whatsapp_configs
├── id (UUID)
├── name
├── phone_number_id
├── access_token (encrypted)
└── organization_id
```

### Runtime Tables

```sql
-- Conversation State
conversation_state
├── phone_number
├── flow_id
├── current_node_id
├── variables (JSONB)
└── updated_at

-- Processed Events (idempotency)
processed_events
├── message_id (unique)
└── processed_at
```

## Flow Execution Engine

### Node Execution

Each node type has an executor function:

```javascript
const executors = {
  trigger: async (node, context) => {
    // Initialize flow, return next node
  },
  send_text: async (node, context) => {
    // Substitute variables, send via WhatsApp API
  },
  wait_for_reply: async (node, context) => {
    // Save state, wait for user message
  },
  condition: async (node, context) => {
    // Evaluate condition, return appropriate branch
  }
}
```

### Execution Context

```javascript
{
  phone_number: "1234567890",
  message: "user's message",
  variables: {
    customer_name: "John",
    customer_phone: "1234567890",
    last_reply: "user's message"
  },
  flow: { /* flow definition */ },
  whatsapp_config: { /* API credentials */ }
}
```

### State Persistence

Between user interactions, state is saved to `conversation_state`:

```javascript
{
  phone_number: "1234567890",
  flow_id: "uuid",
  current_node_id: "node-123",
  variables: { /* accumulated variables */ }
}
```

## Security

### Authentication

- Supabase Auth for user management
- JWT tokens for API authentication
- Tokens stored in localStorage
- Auto-refresh before expiration

### Authorization

- Row Level Security (RLS) in Supabase
- Organization-based data isolation
- Role checks in API handlers

### Data Protection

- WhatsApp tokens encrypted at rest
- HTTPS everywhere
- No sensitive data in logs
