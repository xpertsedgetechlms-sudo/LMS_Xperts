CREATE TABLE institute_settings (
 setting_key VARCHAR(60) PRIMARY KEY, setting_value VARCHAR(12000) NOT NULL
);
INSERT INTO institute_settings(setting_key,setting_value) VALUES
 ('name','XpertsEdge Technologies'),('email','xpertsedgetechlms@gmail.com'),('phone','+91 88707 83300'),('address','');
CREATE TABLE institute_announcements (
 id UUID PRIMARY KEY, course_id VARCHAR(60) REFERENCES courses(id), title VARCHAR(150) NOT NULL,
 body VARCHAR(4000) NOT NULL, created_by UUID NOT NULL REFERENCES app_users(id), created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE TABLE read_notifications (
 user_id UUID NOT NULL REFERENCES app_users(id), notification_id VARCHAR(100) NOT NULL,
 read_at TIMESTAMP WITH TIME ZONE NOT NULL, PRIMARY KEY(user_id,notification_id)
);
