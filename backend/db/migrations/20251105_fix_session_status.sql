-- Migration: Fix class_session.session_status and session_type to accept new enum strings
-- Date: 2025-11-05
-- IMPORTANT: BACKUP your database before running these statements

-- 1) Optional: dump the current table (run from shell with mysqldump)
-- mysqldump -u <user> -p <database> class_session > class_session_backup_20251105.sql

-- 2) Convert session_status from ENUM (or too-small VARCHAR) to VARCHAR(32)
ALTER TABLE class_session
  MODIFY COLUMN session_status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS';

-- 3) Convert session_type to VARCHAR(32) as well (if necessary)
ALTER TABLE class_session
  MODIFY COLUMN session_type VARCHAR(32);

-- 4) Migrate legacy values (adjust the old strings if your DB used other names)
-- Map old 'ONGOING' or variants to 'IN_PROGRESS'
UPDATE class_session
  SET session_status = 'IN_PROGRESS'
  WHERE session_status IN ('ONGOING', 'INPROGRESS', 'IN-PROGRESS');

-- Map old 'UPCOMING' to 'SCHEDULED' (if your app uses 'SCHEDULED' as upcoming state)
UPDATE class_session
  SET session_status = 'SCHEDULED'
  WHERE session_status IN ('UPCOMING');

-- Map old 'FINISHED' to 'COMPLETED'
UPDATE class_session
  SET session_status = 'COMPLETED'
  WHERE session_status IN ('FINISHED');

-- You can add other mappings if your database contains other legacy values.

-- 5) Verify changes
SELECT session_status, COUNT(*) FROM class_session GROUP BY session_status;

-- End of migration
