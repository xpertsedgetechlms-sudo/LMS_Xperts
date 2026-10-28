CREATE TABLE teaching_batches (
 id UUID PRIMARY KEY, course_id VARCHAR(60) NOT NULL REFERENCES courses(id),
 name VARCHAR(150) NOT NULL, schedule VARCHAR(300) NOT NULL, starts_on DATE NOT NULL, ends_on DATE NOT NULL
);
CREATE TABLE batch_members (
 batch_id UUID NOT NULL REFERENCES teaching_batches(id), student_id UUID NOT NULL REFERENCES app_users(id),
 PRIMARY KEY(batch_id,student_id)
);
CREATE TABLE live_sessions (
 id UUID PRIMARY KEY, course_id VARCHAR(60) NOT NULL REFERENCES courses(id),
 batch_id UUID REFERENCES teaching_batches(id), title VARCHAR(150) NOT NULL,
 starts_at TIMESTAMP WITH TIME ZONE NOT NULL, duration_minutes INTEGER NOT NULL CHECK(duration_minutes BETWEEN 5 AND 480),
 meeting_url VARCHAR(2000) NOT NULL, status VARCHAR(20) NOT NULL CHECK(status IN ('SCHEDULED','COMPLETED','CANCELLED'))
);
CREATE TABLE class_attendance (
 session_id UUID NOT NULL REFERENCES live_sessions(id), student_id UUID NOT NULL REFERENCES app_users(id),
 status VARCHAR(20) NOT NULL CHECK(status IN ('PRESENT','ABSENT','LATE','EXCUSED')),
 PRIMARY KEY(session_id,student_id)
);
CREATE TABLE teaching_assignments (
 id UUID PRIMARY KEY, course_id VARCHAR(60) NOT NULL REFERENCES courses(id), title VARCHAR(150) NOT NULL,
 description VARCHAR(4000) NOT NULL, due_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE TABLE teaching_files (
 id UUID PRIMARY KEY, course_id VARCHAR(60) NOT NULL REFERENCES courses(id), owner_id UUID NOT NULL REFERENCES app_users(id),
 assignment_id UUID REFERENCES teaching_assignments(id), name VARCHAR(200) NOT NULL, content_type VARCHAR(100) NOT NULL,
 size_bytes BIGINT NOT NULL CHECK(size_bytes BETWEEN 1 AND 20971520), content BYTEA NOT NULL
);
CREATE TABLE teaching_resources (
 id UUID PRIMARY KEY, course_id VARCHAR(60) NOT NULL REFERENCES courses(id), title VARCHAR(150) NOT NULL,
 file_id UUID NOT NULL UNIQUE REFERENCES teaching_files(id)
);
CREATE TABLE assignment_submissions (
 id UUID PRIMARY KEY, assignment_id UUID NOT NULL REFERENCES teaching_assignments(id), student_id UUID NOT NULL REFERENCES app_users(id),
 file_id UUID NOT NULL REFERENCES teaching_files(id), note VARCHAR(4000) NOT NULL,
 submitted_at TIMESTAMP WITH TIME ZONE NOT NULL, grade INTEGER CHECK(grade BETWEEN 0 AND 100),
 feedback VARCHAR(4000), graded_by UUID REFERENCES app_users(id), graded_at TIMESTAMP WITH TIME ZONE,
 UNIQUE(assignment_id,student_id)
);
CREATE TABLE submission_grade_history (
 id UUID PRIMARY KEY, submission_id UUID NOT NULL REFERENCES assignment_submissions(id), grader_id UUID NOT NULL REFERENCES app_users(id),
 grade INTEGER NOT NULL CHECK(grade BETWEEN 0 AND 100), feedback VARCHAR(4000) NOT NULL, graded_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX batches_course_idx ON teaching_batches(course_id);
CREATE INDEX sessions_course_idx ON live_sessions(course_id);
CREATE INDEX assignments_course_idx ON teaching_assignments(course_id);
CREATE INDEX submissions_student_idx ON assignment_submissions(student_id);
