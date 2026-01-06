-- WhatsApp Flow Builder - Supabase Schema
-- Run this in Supabase SQL Editor to set up the database

-- WhatsApp API configurations (max 2 numbers)
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone_number_id VARCHAR(50) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    access_token TEXT NOT NULL,
    verify_token VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flow definitions
CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    whatsapp_config_id UUID REFERENCES whatsapp_configs(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'keyword',
    trigger_value VARCHAR(200),
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nodes in a flow
CREATE TABLE IF NOT EXISTS flow_nodes (
    id VARCHAR(100) PRIMARY KEY,
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    node_type VARCHAR(50) NOT NULL,
    label VARCHAR(200),
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    config JSONB NOT NULL DEFAULT '{}'
);

-- Edges connecting nodes
CREATE TABLE IF NOT EXISTS flow_edges (
    id VARCHAR(100) PRIMARY KEY,
    flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
    source_node_id VARCHAR(100) REFERENCES flow_nodes(id) ON DELETE CASCADE,
    target_node_id VARCHAR(100) REFERENCES flow_nodes(id) ON DELETE CASCADE,
    source_handle VARCHAR(50) DEFAULT 'default'
);

-- Active conversation executions
CREATE TABLE IF NOT EXISTS flow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
    customer_id VARCHAR(50) NOT NULL,
    whatsapp_config_id UUID REFERENCES whatsapp_configs(id) ON DELETE SET NULL,
    current_node_id VARCHAR(100),
    status VARCHAR(30) DEFAULT 'running',
    variables JSONB DEFAULT '{}',
    waiting_for VARCHAR(50),
    wait_timeout_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Execution logs
CREATE TABLE IF NOT EXISTS execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES flow_executions(id) ON DELETE CASCADE,
    node_id VARCHAR(100),
    action VARCHAR(50),
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotency table for processed messages
CREATE TABLE IF NOT EXISTS processed_messages (
    message_id VARCHAR(100) PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flows_config ON flows(whatsapp_config_id);
CREATE INDEX IF NOT EXISTS idx_flows_active ON flows(is_active, is_published);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow ON flow_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_edges_flow ON flow_edges(flow_id);
CREATE INDEX IF NOT EXISTS idx_executions_customer ON flow_executions(customer_id, whatsapp_config_id, status);
CREATE INDEX IF NOT EXISTS idx_executions_flow ON flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution ON execution_logs(execution_id);

-- Cleanup old processed messages (run periodically)
-- DELETE FROM processed_messages WHERE processed_at < NOW() - INTERVAL '7 days';

-- Enable RLS (Row Level Security) - adjust policies as needed
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_messages ENABLE ROW LEVEL SECURITY;

-- Service role policy (allows full access for backend)
CREATE POLICY "Service role full access" ON whatsapp_configs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON flows FOR ALL USING (true);
CREATE POLICY "Service role full access" ON flow_nodes FOR ALL USING (true);
CREATE POLICY "Service role full access" ON flow_edges FOR ALL USING (true);
CREATE POLICY "Service role full access" ON flow_executions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON execution_logs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON processed_messages FOR ALL USING (true);

-- Multi-tenant support: Organizations and Users
-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'org_admin', 'user')),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add organization_id to whatsapp_configs
ALTER TABLE whatsapp_configs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id and created_by to flows
ALTER TABLE flows ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE flows ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Indexes for organization-based access
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_org ON whatsapp_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_flows_org ON flows(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Organizations
-- Super admins can do everything
CREATE POLICY "Super admins full access to organizations"
    ON organizations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Users can view their own organization
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

-- Org admins can update their own organization
CREATE POLICY "Org admins can update own organization"
    ON organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('org_admin', 'super_admin')
        )
    );

-- RLS Policies for Users
-- Super admins can do everything
CREATE POLICY "Super admins full access to users"
    ON users FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users AS u
            WHERE u.id = auth.uid()
            AND u.role = 'super_admin'
        )
    );

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (id = auth.uid());

-- Org admins can view users in their organization
CREATE POLICY "Org admins can view org users"
    ON users FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'org_admin'
        )
    );

-- Org admins can update users in their organization
CREATE POLICY "Org admins can update org users"
    ON users FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'org_admin'
        )
    );

-- Updated RLS Policies for existing tables (organization-based access)
-- Drop existing service role policies (they still work but we add more granular ones)

-- WhatsApp Configs: Users can only access configs in their organization
CREATE POLICY "Users can view org whatsapp configs"
    ON whatsapp_configs FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Org admins can manage org whatsapp configs"
    ON whatsapp_configs FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('org_admin', 'super_admin')
        )
    );

-- Flows: Users can view flows in their organization
CREATE POLICY "Users can view org flows"
    ON flows FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

-- Users can create flows in their organization
CREATE POLICY "Users can create flows in org"
    ON flows FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

-- Users can update their own flows or org admins can update any flow in their org
CREATE POLICY "Users can update own flows"
    ON flows FOR UPDATE
    USING (
        created_by = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('org_admin', 'super_admin')
        )
    );

-- Users can delete their own flows or org admins can delete any flow in their org
CREATE POLICY "Users can delete own flows"
    ON flows FOR DELETE
    USING (
        created_by = auth.uid()
        OR organization_id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('org_admin', 'super_admin')
        )
    );

-- Flow Nodes: Inherit access from parent flow
CREATE POLICY "Users can view org flow nodes"
    ON flow_nodes FOR SELECT
    USING (
        flow_id IN (
            SELECT id FROM flows
            WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage flow nodes"
    ON flow_nodes FOR ALL
    USING (
        flow_id IN (
            SELECT id FROM flows
            WHERE created_by = auth.uid()
            OR organization_id IN (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
                AND users.role IN ('org_admin', 'super_admin')
            )
        )
    );

-- Flow Edges: Inherit access from parent flow
CREATE POLICY "Users can view org flow edges"
    ON flow_edges FOR SELECT
    USING (
        flow_id IN (
            SELECT id FROM flows
            WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage flow edges"
    ON flow_edges FOR ALL
    USING (
        flow_id IN (
            SELECT id FROM flows
            WHERE created_by = auth.uid()
            OR organization_id IN (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
                AND users.role IN ('org_admin', 'super_admin')
            )
        )
    );

-- Flow Executions: Users can view executions from their org's flows
CREATE POLICY "Users can view org flow executions"
    ON flow_executions FOR SELECT
    USING (
        flow_id IN (
            SELECT id FROM flows
            WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );

-- Execution Logs: Users can view logs from their org's executions
CREATE POLICY "Users can view org execution logs"
    ON execution_logs FOR SELECT
    USING (
        execution_id IN (
            SELECT id FROM flow_executions
            WHERE flow_id IN (
                SELECT id FROM flows
                WHERE organization_id IN (
                    SELECT organization_id FROM users
                    WHERE users.id = auth.uid()
                )
            )
        )
    );

-- ================================================================================
-- CONVERSATIONS & MESSAGES (Live Chat Feature)
-- ================================================================================

-- Conversations table - tracks each contact conversation
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    whatsapp_config_id UUID REFERENCES whatsapp_configs(id) ON DELETE CASCADE,
    contact_phone VARCHAR(50) NOT NULL,
    contact_name TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    last_message_direction VARCHAR(10), -- 'inbound' or 'outbound'
    unread_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'archived', 'closed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(whatsapp_config_id, contact_phone)
);

-- Messages table - stores all messages in conversations
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    whatsapp_message_id VARCHAR(100), -- WhatsApp's message ID
    direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
    message_type VARCHAR(30) NOT NULL DEFAULT 'text', -- 'text', 'image', 'audio', 'video', 'document', 'location', 'button', 'list'
    content TEXT, -- Text content or caption
    media_url TEXT, -- URL for media messages
    metadata JSONB DEFAULT '{}', -- Additional data (button_id, list_row_id, coordinates, etc.)
    status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messaging windows table - tracks 24-hour free messaging window
CREATE TABLE IF NOT EXISTS messaging_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_config_id UUID REFERENCES whatsapp_configs(id) ON DELETE CASCADE,
    contact_phone VARCHAR(50) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL, -- When customer last messaged (window opens)
    window_end TIMESTAMPTZ NOT NULL, -- 24 hours after window_start
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(whatsapp_config_id, contact_phone)
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_config ON conversations(whatsapp_config_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(contact_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_wa_id ON messages(whatsapp_message_id);

-- Indexes for messaging windows
CREATE INDEX IF NOT EXISTS idx_messaging_windows_config ON messaging_windows(whatsapp_config_id);
CREATE INDEX IF NOT EXISTS idx_messaging_windows_phone ON messaging_windows(contact_phone);
CREATE INDEX IF NOT EXISTS idx_messaging_windows_end ON messaging_windows(window_end);

-- Enable RLS on new tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_windows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Conversations
CREATE POLICY "Service role full access" ON conversations FOR ALL USING (true);
CREATE POLICY "Users can view org conversations"
    ON conversations FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

CREATE POLICY "Users can manage org conversations"
    ON conversations FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE users.id = auth.uid()
        )
    );

-- RLS Policies for Messages
CREATE POLICY "Service role full access" ON messages FOR ALL USING (true);
CREATE POLICY "Users can view org messages"
    ON messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM conversations
            WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage org messages"
    ON messages FOR ALL
    USING (
        conversation_id IN (
            SELECT id FROM conversations
            WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );

-- RLS Policies for Messaging Windows
CREATE POLICY "Service role full access" ON messaging_windows FOR ALL USING (true);
CREATE POLICY "Users can view org messaging windows"
    ON messaging_windows FOR SELECT
    USING (
        whatsapp_config_id IN (
            SELECT id FROM whatsapp_configs
            WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE users.id = auth.uid()
            )
        )
    );
