CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN','TRAINER','STUDENT')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT normalized_email CHECK (email = LOWER(TRIM(email)))
);

CREATE TABLE courses (
    id VARCHAR(60) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    price NUMERIC(12,2) CHECK (price >= 0),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    trainer_id UUID REFERENCES app_users(id),
    duration VARCHAR(100),
    level VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX courses_trainer_idx ON courses(trainer_id);

CREATE TABLE enrolments (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES app_users(id),
    course_id VARCHAR(60) NOT NULL REFERENCES courses(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE','PENDING','REVOKED')),
    expires_at DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT one_enrolment_per_course UNIQUE(student_id,course_id)
);
CREATE INDEX enrolments_course_idx ON enrolments(course_id);
