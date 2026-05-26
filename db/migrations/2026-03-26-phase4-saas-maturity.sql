-- ============================================================================
-- Phase 4: SaaS Maturity Baseline
-- Billing lifecycle persistence + API key governance + notifications.
-- ============================================================================

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS student_limit INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);
CREATE INDEX IF NOT EXISTS idx_schools_subscription_status ON schools(subscription_status);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  school_id TEXT NOT NULL,
  invoice_number VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP,
  paid_date TIMESTAMP,
  pdf_url TEXT,
  stripe_invoice_id VARCHAR(255),
  notes TEXT,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_school ON invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  school_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  masked_key VARCHAR(255),
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  last_used_at TIMESTAMP,
  rotated_at TIMESTAMP,
  revoked_at TIMESTAMP,
  UNIQUE(school_id, name)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_school ON api_keys(school_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

CREATE TABLE IF NOT EXISTS api_key_usage (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  api_key_id TEXT NOT NULL,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_time_ms INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_timestamp ON api_key_usage(timestamp DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  school_id TEXT,
  user_id TEXT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'general',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  is_read BOOLEAN NOT NULL DEFAULT false,
  channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
  delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  email_status VARCHAR(30),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY DEFAULT md5(random()::text || clock_timestamp()::text),
  user_id TEXT NOT NULL UNIQUE,
  school_id TEXT,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  quiz_completion BOOLEAN NOT NULL DEFAULT true,
  parent_updates BOOLEAN NOT NULL DEFAULT true,
  teacher_alerts BOOLEAN NOT NULL DEFAULT true,
  payment_receipts BOOLEAN NOT NULL DEFAULT true,
  milestone_completions BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_school_id ON notification_preferences(school_id);
