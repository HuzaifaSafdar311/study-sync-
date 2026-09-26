-- Migration: Add google_oauth_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_oauth_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_google_oauth_id ON users(google_oauth_id);
