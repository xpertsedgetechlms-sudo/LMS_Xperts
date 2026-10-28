ALTER TABLE app_users ADD COLUMN credential_version BIGINT NOT NULL DEFAULT 0;
CREATE TABLE password_reset_tokens (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL
);
