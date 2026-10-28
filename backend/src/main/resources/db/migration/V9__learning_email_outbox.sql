CREATE TABLE learning_email_state (
 event_key VARCHAR(100) PRIMARY KEY, fingerprint VARCHAR(64) NOT NULL
);
CREATE TABLE learning_email_outbox (
 id UUID PRIMARY KEY, event_key VARCHAR(100) NOT NULL,
 fingerprint VARCHAR(64) NOT NULL, kind VARCHAR(30) NOT NULL,
 course_id VARCHAR(60) NOT NULL REFERENCES courses(id),
 batch_id UUID, student_id UUID NOT NULL REFERENCES app_users(id),
 subject VARCHAR(250) NOT NULL, body VARCHAR(2000) NOT NULL,
 status VARCHAR(20) NOT NULL CHECK(status IN ('PENDING','SENDING','SENT','FAILED','SKIPPED')),
 attempts INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP WITH TIME ZONE NOT NULL,
 next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL, locked_at TIMESTAMP WITH TIME ZONE,
 sent_at TIMESTAMP WITH TIME ZONE, last_error VARCHAR(200)
);
CREATE INDEX learning_email_pending_idx ON learning_email_outbox(status,next_attempt_at);
