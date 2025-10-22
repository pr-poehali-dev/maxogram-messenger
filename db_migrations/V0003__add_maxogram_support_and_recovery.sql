INSERT INTO t_p80059633_maxogram_messenger.users (username, password_hash, avatar_initials, online, email)
VALUES ('maxogram_support', '', 'MX', true, 'support@maxogram.app')
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS t_p80059633_maxogram_messenger.recovery_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p80059633_maxogram_messenger.users(id),
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '15 minutes',
    used BOOLEAN DEFAULT false
);