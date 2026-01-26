-- =====================================================
-- STAMP CARD SAAS - DATABASE SCHEMA EXTENSION
-- Self-service loyalty program for WhatsApp Flow Builder
-- Run this AFTER the main supabase-schema.sql
-- =====================================================

-- ===========================================
-- TABLE: stamp_card_templates (MUST BE CREATED FIRST)
-- Store stamp card visual templates
-- ===========================================
CREATE TABLE IF NOT EXISTS stamp_card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  title VARCHAR(200) DEFAULT 'LOYALTY CARD',
  subtitle VARCHAR(200),
  total_stamps INTEGER NOT NULL DEFAULT 10,
  stamp_icon VARCHAR(50) DEFAULT 'cup',
  background_color VARCHAR(7) DEFAULT '#000000',
  accent_color VARCHAR(7) DEFAULT '#ccff00',
  logo_url TEXT,
  reward_text VARCHAR(200),
  font_family VARCHAR(100) DEFAULT 'Arial',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stamp_templates_org ON stamp_card_templates(organization_id);

-- ===========================================
-- TABLE: stamp_programs
-- Business loyalty program configuration
-- ===========================================
CREATE TABLE IF NOT EXISTS stamp_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Business Info
  business_name TEXT NOT NULL,
  owner_wa_number TEXT NOT NULL,           -- Where verification messages go

  -- Branding
  brand_color_primary TEXT DEFAULT '#6366f1',
  brand_color_secondary TEXT DEFAULT '#ffffff',
  logo_url TEXT,

  -- Stamp Configuration
  stamp_type TEXT NOT NULL DEFAULT 'visit', -- 'coffee', 'visit', 'meal', 'purchase', 'custom'
  stamp_type_label TEXT,                    -- Custom label if stamp_type='custom'
  stamps_required INTEGER NOT NULL DEFAULT 10 CHECK (stamps_required >= 1 AND stamps_required <= 20),
  reward_description TEXT NOT NULL,

  -- Trigger Configuration
  trigger_keyword TEXT UNIQUE NOT NULL,     -- What customers message (e.g., "Costa Sandton")

  -- Settings
  stamp_cooldown_minutes INTEGER DEFAULT 60, -- Prevent spam stamps
  verification_timeout_minutes INTEGER DEFAULT 10,
  auto_expire_days INTEGER DEFAULT 365,      -- Cards expire after X days of inactivity

  -- Tier & Status
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  is_active BOOLEAN DEFAULT true,

  -- Dashboard Access
  dashboard_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,

  -- Linked Flow (auto-generated during onboarding)
  flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
  stamp_template_id UUID REFERENCES stamp_card_templates(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stamp_programs_org ON stamp_programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_stamp_programs_trigger ON stamp_programs(trigger_keyword);
CREATE INDEX IF NOT EXISTS idx_stamp_programs_dashboard ON stamp_programs(dashboard_token);
CREATE INDEX IF NOT EXISTS idx_stamp_programs_owner ON stamp_programs(owner_wa_number);
CREATE INDEX IF NOT EXISTS idx_stamp_programs_active ON stamp_programs(is_active) WHERE is_active = true;

-- ===========================================
-- TABLE: stamp_customers
-- Customers enrolled in a stamp program
-- ===========================================
CREATE TABLE IF NOT EXISTS stamp_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES stamp_programs(id) ON DELETE CASCADE,

  -- Customer Info
  wa_number TEXT NOT NULL,
  wa_name TEXT,

  -- Stamp Progress (current card)
  current_stamps INTEGER DEFAULT 0,

  -- Lifetime Stats
  total_stamps_earned INTEGER DEFAULT 0,
  total_cards_completed INTEGER DEFAULT 0,
  total_rewards_redeemed INTEGER DEFAULT 0,

  -- Activity Tracking
  first_stamp_at TIMESTAMPTZ,
  last_stamp_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(program_id, wa_number)
);

CREATE INDEX IF NOT EXISTS idx_stamp_customers_program ON stamp_customers(program_id);
CREATE INDEX IF NOT EXISTS idx_stamp_customers_phone ON stamp_customers(wa_number);
CREATE INDEX IF NOT EXISTS idx_stamp_customers_last_activity ON stamp_customers(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_stamp_customers_stamps ON stamp_customers(current_stamps);

-- ===========================================
-- TABLE: stamp_events
-- Audit trail of all stamp-related events
-- ===========================================
CREATE TABLE IF NOT EXISTS stamp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES stamp_programs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES stamp_customers(id) ON DELETE CASCADE,

  -- Event Details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'stamp_requested',
    'stamp_approved',
    'stamp_denied',
    'stamp_expired',
    'card_completed',
    'reward_redeemed',
    'card_reset'
  )),

  -- Context
  stamps_before INTEGER,
  stamps_after INTEGER,
  verified_by TEXT,                -- WA number of verifier (for approved/denied)
  verification_id UUID,            -- Links to stamp_verifications

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stamp_events_program ON stamp_events(program_id);
CREATE INDEX IF NOT EXISTS idx_stamp_events_customer ON stamp_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_stamp_events_type ON stamp_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stamp_events_created ON stamp_events(created_at DESC);

-- ===========================================
-- TABLE: stamp_verifications
-- Pending stamp verification requests
-- ===========================================
CREATE TABLE IF NOT EXISTS stamp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES stamp_programs(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES stamp_customers(id) ON DELETE CASCADE,

  -- Request Details
  customer_wa_number TEXT NOT NULL,
  customer_wa_name TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),

  -- Response Tracking
  responded_by TEXT,               -- WA number of responder
  responded_at TIMESTAMPTZ,

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stamp_verifications_program ON stamp_verifications(program_id);
CREATE INDEX IF NOT EXISTS idx_stamp_verifications_status ON stamp_verifications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_stamp_verifications_expires ON stamp_verifications(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_stamp_verifications_customer_wa ON stamp_verifications(customer_wa_number);

-- ===========================================
-- TABLE: stamp_rewards
-- Track reward codes and redemptions
-- ===========================================
CREATE TABLE IF NOT EXISTS stamp_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES stamp_programs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES stamp_customers(id) ON DELETE CASCADE,

  -- Reward Details
  reward_code TEXT UNIQUE NOT NULL,
  reward_description TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),

  -- Redemption
  redeemed_at TIMESTAMPTZ,
  redeemed_by TEXT,                -- Staff member who processed it

  -- Validity
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stamp_rewards_program ON stamp_rewards(program_id);
CREATE INDEX IF NOT EXISTS idx_stamp_rewards_customer ON stamp_rewards(customer_id);
CREATE INDEX IF NOT EXISTS idx_stamp_rewards_code ON stamp_rewards(reward_code);
CREATE INDEX IF NOT EXISTS idx_stamp_rewards_status ON stamp_rewards(status);

-- ===========================================
-- TABLE: stamp_program_onboarding
-- Track onboarding progress for incomplete setups
-- ===========================================
CREATE TABLE IF NOT EXISTS stamp_program_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_number TEXT NOT NULL,

  -- Progress
  current_step TEXT DEFAULT 'business_name',
  collected_data JSONB DEFAULT '{}',

  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stamp_onboarding_phone ON stamp_program_onboarding(wa_number);
CREATE INDEX IF NOT EXISTS idx_stamp_onboarding_status ON stamp_program_onboarding(status);

-- ===========================================
-- VIEWS: Analytics for Dashboard
-- ===========================================

-- Program Overview Stats
CREATE OR REPLACE VIEW stamp_program_stats AS
SELECT
  sp.id AS program_id,
  sp.business_name,
  sp.tier,
  sp.is_active,
  sp.created_at AS program_created_at,
  COUNT(DISTINCT sc.id) AS total_customers,
  COUNT(DISTINCT sc.id) FILTER (WHERE sc.last_activity_at > now() - interval '30 days') AS active_customers_30d,
  COUNT(DISTINCT sc.id) FILTER (WHERE sc.last_activity_at > now() - interval '7 days') AS active_customers_7d,
  COALESCE(SUM(sc.total_stamps_earned), 0) AS total_stamps_issued,
  COALESCE(SUM(sc.total_cards_completed), 0) AS total_cards_completed,
  COALESCE(SUM(sc.total_rewards_redeemed), 0) AS total_rewards_redeemed,
  COUNT(DISTINCT sc.id) FILTER (WHERE sc.current_stamps >= sp.stamps_required - 2 AND sc.current_stamps < sp.stamps_required) AS almost_complete_cards
FROM stamp_programs sp
LEFT JOIN stamp_customers sc ON sc.program_id = sp.id
GROUP BY sp.id, sp.business_name, sp.tier, sp.is_active, sp.created_at, sp.stamps_required;

-- Customer Segments View
CREATE OR REPLACE VIEW stamp_customer_segments AS
SELECT
  sc.id,
  sc.program_id,
  sc.wa_number,
  sc.wa_name,
  sc.current_stamps,
  sc.total_stamps_earned,
  sc.total_cards_completed,
  sc.total_rewards_redeemed,
  sc.first_stamp_at,
  sc.last_stamp_at,
  sc.last_activity_at,
  sc.created_at,
  sc.updated_at,
  sp.stamps_required,
  sp.business_name,
  CASE
    WHEN sc.first_stamp_at > now() - interval '7 days' THEN 'new'
    WHEN sc.current_stamps >= sp.stamps_required THEN 'reward_ready'
    WHEN sc.current_stamps >= sp.stamps_required - 2 THEN 'almost_there'
    WHEN sc.total_stamps_earned >= 5 THEN 'regular'
    WHEN sc.last_activity_at < now() - interval '30 days' THEN 'lapsed'
    ELSE 'active'
  END AS segment
FROM stamp_customers sc
JOIN stamp_programs sp ON sp.id = sc.program_id;

-- Daily Stats View (for charts)
CREATE OR REPLACE VIEW stamp_daily_stats AS
SELECT
  DATE(se.created_at) AS date,
  se.program_id,
  COUNT(*) FILTER (WHERE se.event_type = 'stamp_approved') AS stamps_approved,
  COUNT(*) FILTER (WHERE se.event_type = 'stamp_denied') AS stamps_denied,
  COUNT(*) FILTER (WHERE se.event_type = 'card_completed') AS cards_completed,
  COUNT(*) FILTER (WHERE se.event_type = 'reward_redeemed') AS rewards_redeemed
FROM stamp_events se
WHERE se.created_at > now() - interval '30 days'
GROUP BY DATE(se.created_at), se.program_id
ORDER BY date DESC;

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE stamp_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_program_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_card_templates ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for webhook/backend)
CREATE POLICY "Service role full access to stamp_programs"
  ON stamp_programs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to stamp_customers"
  ON stamp_customers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to stamp_events"
  ON stamp_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to stamp_verifications"
  ON stamp_verifications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to stamp_rewards"
  ON stamp_rewards FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to stamp_program_onboarding"
  ON stamp_program_onboarding FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to stamp_card_templates"
  ON stamp_card_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Users can view their organization's stamp programs
CREATE POLICY "Users can view org stamp programs"
  ON stamp_programs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Users can manage their organization's stamp programs
CREATE POLICY "Users can manage org stamp programs"
  ON stamp_programs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Users can view customers in their programs
CREATE POLICY "Users can view program customers"
  ON stamp_customers FOR SELECT
  USING (
    program_id IN (
      SELECT id FROM stamp_programs
      WHERE organization_id IN (
        SELECT organization_id FROM users
        WHERE users.id = auth.uid()
      )
    )
  );

-- Users can view events in their programs
CREATE POLICY "Users can view program events"
  ON stamp_events FOR SELECT
  USING (
    program_id IN (
      SELECT id FROM stamp_programs
      WHERE organization_id IN (
        SELECT organization_id FROM users
        WHERE users.id = auth.uid()
      )
    )
  );

-- Users can view verifications in their programs
CREATE POLICY "Users can view program verifications"
  ON stamp_verifications FOR SELECT
  USING (
    program_id IN (
      SELECT id FROM stamp_programs
      WHERE organization_id IN (
        SELECT organization_id FROM users
        WHERE users.id = auth.uid()
      )
    )
  );

-- Users can view rewards in their programs
CREATE POLICY "Users can view program rewards"
  ON stamp_rewards FOR SELECT
  USING (
    program_id IN (
      SELECT id FROM stamp_programs
      WHERE organization_id IN (
        SELECT organization_id FROM users
        WHERE users.id = auth.uid()
      )
    )
  );

-- Users can manage their org's stamp templates
CREATE POLICY "Users can view org stamp templates"
  ON stamp_card_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE users.id = auth.uid()
    )
    OR organization_id IS NULL  -- Global templates
  );

CREATE POLICY "Users can manage org stamp templates"
  ON stamp_card_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE users.id = auth.uid()
    )
  );

-- ===========================================
-- FUNCTIONS: Helper functions for stamp logic
-- ===========================================

-- Generate unique reward code
CREATE OR REPLACE FUNCTION generate_reward_code(program_prefix TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN UPPER(SUBSTRING(program_prefix FROM 1 FOR 3)) || '-' ||
         UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- Get or create customer
CREATE OR REPLACE FUNCTION get_or_create_stamp_customer(
  p_program_id UUID,
  p_wa_number TEXT,
  p_wa_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Try to find existing customer
  SELECT id INTO v_customer_id
  FROM stamp_customers
  WHERE program_id = p_program_id AND wa_number = p_wa_number;

  -- Create if not exists
  IF v_customer_id IS NULL THEN
    INSERT INTO stamp_customers (program_id, wa_number, wa_name)
    VALUES (p_program_id, p_wa_number, p_wa_name)
    RETURNING id INTO v_customer_id;
  ELSE
    -- Update name if provided and different
    IF p_wa_name IS NOT NULL THEN
      UPDATE stamp_customers
      SET wa_name = p_wa_name, updated_at = now()
      WHERE id = v_customer_id AND (wa_name IS NULL OR wa_name != p_wa_name);
    END IF;
  END IF;

  RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Award stamp to customer (handles card completion)
CREATE OR REPLACE FUNCTION award_stamp(
  p_program_id UUID,
  p_customer_wa_number TEXT,
  p_customer_wa_name TEXT DEFAULT NULL,
  p_verification_id UUID DEFAULT NULL
)
RETURNS TABLE (
  customer_id UUID,
  new_stamp_count INTEGER,
  card_completed BOOLEAN,
  reward_code TEXT,
  total_stamps INTEGER
) AS $$
DECLARE
  v_customer_id UUID;
  v_program RECORD;
  v_current_stamps INTEGER;
  v_new_stamps INTEGER;
  v_card_completed BOOLEAN := false;
  v_reward_code TEXT := NULL;
  v_total_stamps INTEGER;
BEGIN
  -- Get program details
  SELECT * INTO v_program FROM stamp_programs WHERE id = p_program_id;

  IF v_program IS NULL THEN
    RAISE EXCEPTION 'Program not found: %', p_program_id;
  END IF;

  -- Get or create customer
  v_customer_id := get_or_create_stamp_customer(p_program_id, p_customer_wa_number, p_customer_wa_name);

  -- Get current stamps
  SELECT current_stamps, total_stamps_earned INTO v_current_stamps, v_total_stamps
  FROM stamp_customers WHERE id = v_customer_id;

  -- Calculate new stamp count
  v_new_stamps := v_current_stamps + 1;
  v_total_stamps := v_total_stamps + 1;

  -- Check if card is complete
  IF v_new_stamps >= v_program.stamps_required THEN
    v_card_completed := true;
    v_new_stamps := 0;  -- Reset for new card

    -- Generate reward code
    v_reward_code := generate_reward_code(v_program.business_name);

    -- Create reward record
    INSERT INTO stamp_rewards (program_id, customer_id, reward_code, reward_description, valid_until)
    VALUES (
      p_program_id,
      v_customer_id,
      v_reward_code,
      v_program.reward_description,
      now() + interval '30 days'
    );

    -- Update customer stats for card completion
    UPDATE stamp_customers SET
      current_stamps = v_new_stamps,
      total_stamps_earned = v_total_stamps,
      total_cards_completed = total_cards_completed + 1,
      last_stamp_at = now(),
      last_activity_at = now(),
      first_stamp_at = COALESCE(first_stamp_at, now()),
      updated_at = now()
    WHERE id = v_customer_id;

    -- Log card completion event
    INSERT INTO stamp_events (program_id, customer_id, event_type, stamps_before, stamps_after, verification_id)
    VALUES (p_program_id, v_customer_id, 'card_completed', v_current_stamps, v_new_stamps, p_verification_id);
  ELSE
    -- Just add stamp
    UPDATE stamp_customers SET
      current_stamps = v_new_stamps,
      total_stamps_earned = v_total_stamps,
      last_stamp_at = now(),
      last_activity_at = now(),
      first_stamp_at = COALESCE(first_stamp_at, now()),
      updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  -- Log stamp approved event
  INSERT INTO stamp_events (program_id, customer_id, event_type, stamps_before, stamps_after, verification_id)
  VALUES (p_program_id, v_customer_id, 'stamp_approved', v_current_stamps, v_new_stamps, p_verification_id);

  RETURN QUERY SELECT v_customer_id, v_new_stamps, v_card_completed, v_reward_code, v_program.stamps_required;
END;
$$ LANGUAGE plpgsql;

-- Create verification request
CREATE OR REPLACE FUNCTION create_stamp_verification(
  p_program_id UUID,
  p_customer_wa_number TEXT,
  p_customer_wa_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  verification_id UUID,
  customer_id UUID,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_customer_id UUID;
  v_verification_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_program RECORD;
BEGIN
  -- Get program
  SELECT * INTO v_program FROM stamp_programs WHERE id = p_program_id;

  IF v_program IS NULL THEN
    RAISE EXCEPTION 'Program not found: %', p_program_id;
  END IF;

  -- Get or create customer
  v_customer_id := get_or_create_stamp_customer(p_program_id, p_customer_wa_number, p_customer_wa_name);

  -- Calculate expiry
  v_expires_at := now() + (v_program.verification_timeout_minutes || ' minutes')::interval;

  -- Create verification
  INSERT INTO stamp_verifications (program_id, customer_id, customer_wa_number, customer_wa_name, expires_at)
  VALUES (p_program_id, v_customer_id, p_customer_wa_number, p_customer_wa_name, v_expires_at)
  RETURNING id INTO v_verification_id;

  -- Log stamp requested event
  INSERT INTO stamp_events (program_id, customer_id, event_type, verification_id)
  VALUES (p_program_id, v_customer_id, 'stamp_requested', v_verification_id);

  RETURN QUERY SELECT v_verification_id, v_customer_id, v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- Expire old verifications (run periodically)
CREATE OR REPLACE FUNCTION expire_old_verifications()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE stamp_verifications
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- TRIGGER: Auto-update updated_at
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stamp_programs_updated_at
  BEFORE UPDATE ON stamp_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stamp_customers_updated_at
  BEFORE UPDATE ON stamp_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stamp_card_templates_updated_at
  BEFORE UPDATE ON stamp_card_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- SEED DATA: Default Free Tier Organization
-- ===========================================

-- Create a default organization for free tier users
INSERT INTO organizations (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Stamp Card Free Tier', 'stamp-free-tier', true)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================
-- Check tables were created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'stamp_%';

-- Check functions were created
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%stamp%';

-- ===========================================
-- SUCCESS! Stamp Card SaaS tables are ready.
-- ===========================================
