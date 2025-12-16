# Getting Started

This guide walks you through setting up the WhatsApp Flow Builder for development and deployment.

## Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (free tier works)
- Supabase account (free tier works)
- WhatsApp Business Account with Cloud API access

## Project Structure

```
wa-flow-builder/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── nodes/          # Flow editor nodes
│   │   └── properties/     # Node configuration panels
│   ├── contexts/           # React contexts (Auth)
│   ├── lib/                # API client, utilities
│   └── pages/              # Page components
├── functions/              # Cloudflare Pages Functions
│   └── api/                # API endpoints
├── public/                 # Static assets
├── docs/                   # This documentation
└── supabase-schema.sql     # Database schema
```

## Installation

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd wa-flow-builder

# Install dependencies
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Copy your project URL and service role key from Settings > API

### 3. Configure Environment

Create a `.dev.vars` file for local development:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WHATSAPP_TOKEN=your-whatsapp-token
PHONE_NUMBER_ID=your-phone-number-id
VERIFY_TOKEN=your-webhook-verify-token
```

### 4. Run Development Server

```bash
# Start the Vite dev server (frontend only)
npm run dev

# Or run with Cloudflare Pages (full stack)
npm run pages:dev
```

The app will be available at `http://localhost:5173` (Vite) or `http://localhost:8788` (Pages).

## WhatsApp Setup

### 1. Create Meta Developer App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app with "Business" type
3. Add the "WhatsApp" product

### 2. Configure Webhook

1. In WhatsApp > Configuration, set up your webhook:
   - Callback URL: `https://your-domain.pages.dev/webhook`
   - Verify Token: Same as your `VERIFY_TOKEN` env var
2. Subscribe to these fields:
   - `messages`
   - `message_deliveries` (optional)

### 3. Get Credentials

From WhatsApp > API Setup:
- Copy the **Temporary Access Token** (or create a permanent one)
- Copy the **Phone Number ID**

## Deployment

### Deploy to Cloudflare Pages

```bash
# Build the frontend
npm run build

# Deploy (first time - will prompt for project setup)
npx wrangler pages deploy dist
```

### Set Environment Variables

In Cloudflare Dashboard > Pages > Your Project > Settings > Environment Variables:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API token |
| `PHONE_NUMBER_ID` | Your WhatsApp phone number ID |
| `VERIFY_TOKEN` | Webhook verification token |

## First Flow

Once deployed, create your first flow:

1. Log in to the Flow Builder
2. Click **New Flow**
3. Set trigger type to "keyword" and value to "HELLO"
4. Add a **Send Text** node with message: "Hi <span v-pre>{{customer_name}}</span>! Welcome!"
5. Connect the Trigger to Send Text
6. Click **Publish**
7. Send "HELLO" to your WhatsApp number

## Next Steps

- [Creating Flows](/guide/creating-flows) - Deep dive into the flow editor
- [Node Reference](/nodes/overview) - All available node types
- [Variables](/guide/variables) - Working with dynamic data
- [API Documentation](/api/overview) - Backend API reference
