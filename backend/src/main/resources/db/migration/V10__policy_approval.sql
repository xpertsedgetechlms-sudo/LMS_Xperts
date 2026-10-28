CREATE TABLE institute_policies (
 kind VARCHAR(20) PRIMARY KEY CHECK(kind IN ('privacy','terms','refund')),
 draft_text VARCHAR(12000) NOT NULL, published_text VARCHAR(12000),
 revision INTEGER NOT NULL DEFAULT 1,
 approved_by UUID REFERENCES app_users(id), approved_name VARCHAR(100),
 approved_at TIMESTAMP WITH TIME ZONE
);
