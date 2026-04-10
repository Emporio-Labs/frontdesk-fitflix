CREATE TABLE IF NOT EXISTS membership_plans (
  plan_id UUID PRIMARY KEY,
  gym_id VARCHAR(64) NOT NULL,
  plan_name VARCHAR(120) NOT NULL,
  duration_months INTEGER NOT NULL CHECK (duration_months > 0),
  total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  currency VARCHAR(8) NOT NULL DEFAULT 'USD',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  benefits JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_plans_gym_id ON membership_plans(gym_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_status ON membership_plans(status);
