-- Create webauthn_credentials table for storing biometric authentication credentials
-- This table stores Face ID, Touch ID, and other WebAuthn credentials

CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT DEFAULT 0,
  transports TEXT,
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);

-- Create index on credential_id for faster authentication
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON public.webauthn_credentials(credential_id);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_is_active ON public.webauthn_credentials(is_active);

-- Enable RLS (Row Level Security)
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own credentials
CREATE POLICY "Users can view own credentials"
  ON public.webauthn_credentials
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Users can insert their own credentials
CREATE POLICY "Users can insert own credentials"
  ON public.webauthn_credentials
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Users can update their own credentials
CREATE POLICY "Users can update own credentials"
  ON public.webauthn_credentials
  FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Users can delete their own credentials
CREATE POLICY "Users can delete own credentials"
  ON public.webauthn_credentials
  FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.users WHERE auth_id = auth.uid()
    )
  );

-- Policy: Allow anonymous authentication (needed for login flow)
-- This policy allows reading credentials during authentication without being logged in
CREATE POLICY "Allow credential verification during login"
  ON public.webauthn_credentials
  FOR SELECT
  USING (true);

-- Policy: Allow updating counter during authentication
CREATE POLICY "Allow counter update during login"
  ON public.webauthn_credentials
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.webauthn_credentials IS 'Stores WebAuthn credentials for biometric authentication (Face ID, Touch ID, fingerprint)';

-- Add comments to columns
COMMENT ON COLUMN public.webauthn_credentials.credential_id IS 'Base64-encoded credential ID from WebAuthn';
COMMENT ON COLUMN public.webauthn_credentials.public_key IS 'Base64-encoded public key for verification';
COMMENT ON COLUMN public.webauthn_credentials.counter IS 'Authentication counter to prevent replay attacks';
COMMENT ON COLUMN public.webauthn_credentials.transports IS 'Comma-separated list of supported transports (internal, usb, nfc, ble)';
COMMENT ON COLUMN public.webauthn_credentials.device_name IS 'Friendly name of the device (iPhone, Mac, etc.)';
COMMENT ON COLUMN public.webauthn_credentials.is_active IS 'Whether this credential is active';
COMMENT ON COLUMN public.webauthn_credentials.last_used_at IS 'Last time this credential was used for authentication';
