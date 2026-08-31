-- ============================================================
-- attendance-app database schema
-- Run with:  mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS attendance_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE attendance_app;

CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  pin_code   CHAR(60)     NOT NULL,   -- store password_hash() output, never the raw PIN
  role       ENUM('staff','admin') NOT NULL DEFAULT 'staff',
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_logs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  clock_in_time   DATETIME     NULL,
  clock_out_time  DATETIME     NULL,
  latitude        DECIMAL(10,7) NULL,
  longitude       DECIMAL(10,7) NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  INDEX idx_user_clockin (user_id, clock_in_time)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Optional but recommended: a dedicated app DB user instead of
-- using root from db.php. Run separately, adjust the password,
-- and put the same values into your environment variables.
-- ------------------------------------------------------------
-- CREATE USER IF NOT EXISTS 'attendance_app'@'localhost' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_app.* TO 'attendance_app'@'localhost';
-- FLUSH PRIVILEGES;
