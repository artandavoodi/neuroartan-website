-- Security Infrastructure Migration
-- This migration creates the database schema for security features

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Two-factor authentication table
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('totp', 'sms', 'hardware_key', 'biometric')),
  secret TEXT, -- TOTP secret (encrypted)
  phone_number TEXT, -- for SMS 2FA
  verified BOOLEAN DEFAULT false,
  backup_codes TEXT[], -- array of recovery codes (hashed)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT false
);

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login',
    'logout',
    '2fa_enabled',
    '2fa_disabled',
    '2fa_verified',
    'session_created',
    'session_revoked',
    'all_sessions_revoked',
    'password_changed',
    'account_linked',
    'account_unlinked',
    'voice_verified',
    'liveness_check',
    'suspicious_activity',
    'failed_login_attempt',
    'account_locked'
  )),
  event_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Linked accounts table
CREATE TABLE IF NOT EXISTS linked_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'microsoft')),
  provider_user_id TEXT NOT NULL,
  email TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider, provider_user_id)
);

-- Security settings table
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  session_timeout_hours INTEGER DEFAULT 24 CHECK (session_timeout_hours BETWEEN 1 AND 720),
  inactivity_timeout_minutes INTEGER DEFAULT 30 CHECK (inactivity_timeout_minutes BETWEEN 5 AND 120),
  max_concurrent_sessions INTEGER DEFAULT 5 CHECK (max_concurrent_sessions BETWEEN 1 AND 20),
  failed_login_attempts_limit INTEGER DEFAULT 5 CHECK (failed_login_attempts_limit BETWEEN 3 AND 10),
  account_lockout_duration_minutes INTEGER DEFAULT 15 CHECK (account_lockout_duration_minutes BETWEEN 5 AND 1440),
  enable_security_alerts BOOLEAN DEFAULT true,
  alert_on_new_sign_in BOOLEAN DEFAULT true,
  alert_on_suspicious_activity BOOLEAN DEFAULT true,
  alert_on_2fa_reminder BOOLEAN DEFAULT true,
  alert_on_session_expiration BOOLEAN DEFAULT false,
  enable_ip_restrictions BOOLEAN DEFAULT false,
  trusted_ip_addresses TEXT[],
  enable_voice_liveness_check BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_user_id ON linked_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_accounts_provider ON linked_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON security_settings(user_id);

-- Enable Row Level Security
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for two_factor_auth
CREATE POLICY "Users can view own 2fa" ON two_factor_auth
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2fa" ON two_factor_auth
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2fa" ON two_factor_auth
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2fa" ON two_factor_auth
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sessions
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for security_events
CREATE POLICY "Users can view own security_events" ON security_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert security_events" ON security_events
  FOR INSERT WITH CHECK (true); -- Service role can insert

-- RLS Policies for linked_accounts
CREATE POLICY "Users can view own linked_accounts" ON linked_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own linked_accounts" ON linked_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own linked_accounts" ON linked_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own linked_accounts" ON linked_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for security_settings
CREATE POLICY "Users can view own security_settings" ON security_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own security_settings" ON security_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own security_settings" ON security_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_two_factor_auth_updated_at
  BEFORE UPDATE ON two_factor_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_linked_accounts_updated_at
  BEFORE UPDATE ON linked_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_settings_updated_at
  BEFORE UPDATE ON security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions
  WHERE expires_at < NOW()
  OR revoked = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_events (user_id, event_type, event_data, ip_address, user_agent)
  VALUES (p_user_id, p_event_type, p_event_data, p_ip_address, p_user_agent)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to initialize security settings for new users
CREATE OR REPLACE FUNCTION initialize_security_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO security_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize security settings on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_security_settings();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE two_factor_auth TO authenticated;
GRANT ALL ON TABLE sessions TO authenticated;
GRANT SELECT ON TABLE security_events TO authenticated;
GRANT ALL ON TABLE linked_accounts TO authenticated;
GRANT ALL ON TABLE security_settings TO authenticated;

GRANT EXECUTE ON FUNCTION log_security_event TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_sessions TO authenticated;
