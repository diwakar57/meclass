-- Add payment and billing related tables

-- Invoices for SaaS platform billing
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_number VARCHAR(255) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP,
  paid_date TIMESTAMP,
  pdf_url TEXT,
  stripe_invoice_id VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  INDEX idx_school_invoices (school_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Student payments to school
CREATE TABLE IF NOT EXISTS student_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_id UUID NOT NULL REFERENCES fee_structures(id),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid, overdue
  due_date TIMESTAMP,
  paid_date TIMESTAMP,
  payment_method VARCHAR(50), -- cash, check, online, etc.
  receipt_id VARCHAR(255),
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_school_student_payments (school_id),
  INDEX idx_student_payments (student_id),
  INDEX idx_status (status)
);

-- Fee structures defined by school
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  frequency VARCHAR(50), -- monthly, quarterly, annual, once
  applicable_grades JSONB, -- Array of grade levels
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  INDEX idx_school_fees (school_id)
);

-- API keys for school integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  masked_key VARCHAR(255),
  permissions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  last_used_at TIMESTAMP,
  rotated_at TIMESTAMP,
  revoked_at TIMESTAMP,
  INDEX idx_school_keys (school_id),
  INDEX idx_active_keys (is_active),
  UNIQUE(school_id, name)
);

-- Audit logs for payments and API key usage
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(255) NOT NULL, -- PAYMENT_RECORDED, API_KEY_CREATED, etc.
  entity_type VARCHAR(50), -- invoice, student_payment, api_key
  entity_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_school_audit (school_id),
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp)
);

-- Update schools table to add payment-related fields
ALTER TABLE schools ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS student_limit INTEGER DEFAULT 100;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'starter';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'active';

-- Create indexes on schools table
CREATE INDEX IF NOT EXISTS idx_schools_stripe (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_schools_tier (subscription_tier);

-- Add API key validation tracking table
CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_time_ms INTEGER,
  timestamp TIMESTAMP DEFAULT NOW(),
  INDEX idx_key_usage (api_key_id),
  INDEX idx_timestamp (timestamp)
);
