ALTER TABLE students ADD COLUMN IF NOT EXISTS address text;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'student_address_requested';
