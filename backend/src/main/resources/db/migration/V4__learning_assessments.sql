CREATE TABLE learning_lessons (
 id UUID PRIMARY KEY, course_id VARCHAR(60) NOT NULL REFERENCES courses(id), title VARCHAR(150) NOT NULL,
 body VARCHAR(12000) NOT NULL, position_index INTEGER NOT NULL CHECK(position_index>=0),
 published BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX lessons_course_idx ON learning_lessons(course_id);
CREATE TABLE lesson_completions (
 lesson_id UUID NOT NULL REFERENCES learning_lessons(id), student_id UUID NOT NULL REFERENCES app_users(id),
 completed_at TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY(lesson_id,student_id)
);
CREATE TABLE learning_quizzes (
 id UUID PRIMARY KEY, course_id VARCHAR(60) NOT NULL REFERENCES courses(id), title VARCHAR(150) NOT NULL,
 pass_mark INTEGER NOT NULL CHECK(pass_mark BETWEEN 1 AND 100), max_attempts INTEGER NOT NULL CHECK(max_attempts BETWEEN 1 AND 10),
 published BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE quiz_questions (
 id UUID PRIMARY KEY, quiz_id UUID NOT NULL REFERENCES learning_quizzes(id), position_index INTEGER NOT NULL,
 prompt VARCHAR(2000) NOT NULL, options_json VARCHAR(6000) NOT NULL, answer_index INTEGER NOT NULL,
 UNIQUE(quiz_id,position_index)
);
CREATE TABLE quiz_attempts (
 id UUID PRIMARY KEY, quiz_id UUID NOT NULL REFERENCES learning_quizzes(id), student_id UUID NOT NULL REFERENCES app_users(id),
 answers_json VARCHAR(2000) NOT NULL, score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
 passed BOOLEAN NOT NULL, submitted_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX attempts_student_quiz_idx ON quiz_attempts(student_id,quiz_id);
CREATE TABLE completion_certificates (
 id UUID PRIMARY KEY, code VARCHAR(60) NOT NULL UNIQUE, course_id VARCHAR(60) NOT NULL REFERENCES courses(id),
 student_id UUID NOT NULL REFERENCES app_users(id), student_name VARCHAR(100) NOT NULL, course_name VARCHAR(150) NOT NULL,
 issued_by UUID NOT NULL REFERENCES app_users(id), issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
 revoked BOOLEAN NOT NULL DEFAULT FALSE, UNIQUE(student_id,course_id)
);
