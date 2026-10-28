CREATE TABLE fee_invoices (
 id UUID PRIMARY KEY, student_id UUID NOT NULL REFERENCES app_users(id), course_id VARCHAR(60) NOT NULL REFERENCES courses(id),
 total NUMERIC(12,2) NOT NULL CHECK(total>=0), due_on DATE, created_at TIMESTAMP WITH TIME ZONE NOT NULL,
 UNIQUE(student_id,course_id)
);
CREATE TABLE fee_receipts (
 id UUID PRIMARY KEY, invoice_id UUID NOT NULL REFERENCES fee_invoices(id), amount NUMERIC(12,2) NOT NULL CHECK(amount>0),
 reference VARCHAR(120) NOT NULL UNIQUE, method VARCHAR(20) NOT NULL CHECK(method IN ('CASH','BANK','UPI','CARD')),
 recorded_by UUID NOT NULL REFERENCES app_users(id), recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
 voided BOOLEAN NOT NULL DEFAULT FALSE, void_reason VARCHAR(1000), voided_by UUID REFERENCES app_users(id), voided_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX receipts_invoice_idx ON fee_receipts(invoice_id);
