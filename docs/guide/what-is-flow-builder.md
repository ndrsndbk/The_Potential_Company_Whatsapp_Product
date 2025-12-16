# What is Flow Builder?

WhatsApp Flow Builder is a visual platform for creating automated WhatsApp conversations. It combines a React-based drag-and-drop editor with a serverless backend to execute flows when users message your WhatsApp Business number.

## Key Concepts

### Flows

A **flow** is a complete conversation automation. Each flow has:

- **Name** - Descriptive identifier
- **Trigger** - What starts the flow (keyword, regex, or default)
- **Nodes** - The building blocks connected together
- **Variables** - Data storage during execution

### Nodes

Nodes are the building blocks of flows. They represent actions like:

- Sending messages (text, images, videos, buttons, lists)
- Waiting for user replies
- Making decisions based on conditions
- Calling external APIs
- Setting variables

### Triggers

Triggers determine when a flow starts:

| Type | Description | Example |
|------|-------------|---------|
| `keyword` | Exact text match | "MENU", "HELP" |
| `regex` | Pattern match | `/^order\s+\d+$/i` |
| `default` | Fallback when no other flow matches | Any message |

### Variables

Variables store data during flow execution:

- **System Variables** - Auto-populated (`customer_name`, `customer_phone`)
- **User Variables** - Set by nodes or user input
- **Variable Syntax** - Use <code v-pre>{{variable_name}}</code> in messages

## How It Works

```
User sends         Flow engine         Execute nodes
"HELLO" ──────▶   finds matching  ──▶  in sequence
                  trigger
                       │
                       ▼
                  Store state in
                  conversation_state
                  table
```

1. User sends a message to your WhatsApp Business number
2. Webhook receives the message via WhatsApp Cloud API
3. Flow engine checks triggers to find matching flow
4. Nodes execute in sequence, sending messages and processing logic
5. State is saved to database between interactions
6. Flow continues when user replies

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + TypeScript + Vite |
| Flow Editor | React Flow (@xyflow/react) |
| Styling | Tailwind CSS |
| Backend | Cloudflare Pages Functions |
| Database | Supabase (PostgreSQL) |
| Messaging | WhatsApp Cloud API |

## Features

### Visual Editor
- Drag-and-drop node placement
- Connection lines between nodes
- Real-time validation
- Node property configuration panel

### Message Types
- Plain text with variable substitution
- Images, videos, audio, documents
- Interactive buttons (up to 3)
- List menus (up to 10 sections)
- Location sharing
- Contact cards

### Logic & Control
- Conditional branching
- Loops with counters
- Random choice (A/B testing)
- Delays and timing
- API integrations

### Multi-Tenancy
- Organization-based data isolation
- Role-based access (Super Admin, Org Admin, User)
- Multiple WhatsApp configurations per org
