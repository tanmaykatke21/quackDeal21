-- ============================================================
-- MeetingMind — Snowflake Schema
-- Run this in your Snowflake worksheet before starting
-- ============================================================

-- 1. Create database and schema
CREATE DATABASE IF NOT EXISTS MEETINGMIND;
USE DATABASE MEETINGMIND;
CREATE SCHEMA IF NOT EXISTS APP;
USE SCHEMA APP;

-- ============================================================
-- TABLE 1: USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS USERS (
  USER_ID       VARCHAR(128) PRIMARY KEY,
  EMAIL         VARCHAR(255) NOT NULL,
  NAME          VARCHAR(255),
  COMPANY       VARCHAR(255),
  ROLE          VARCHAR(100),
  CREATED_AT    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================
-- TABLE 2: DEALS
-- ============================================================
CREATE TABLE IF NOT EXISTS DEALS (
  DEAL_ID           VARCHAR(36) DEFAULT UUID_STRING() PRIMARY KEY,
  USER_ID           VARCHAR(128) REFERENCES USERS(USER_ID),
  CLIENT_NAME       VARCHAR(255) NOT NULL,
  CLIENT_COMPANY    VARCHAR(255),
  CLIENT_EMAIL      VARCHAR(255),
  DEAL_VALUE        FLOAT,
  INDUSTRY          VARCHAR(100),
  STAGE             VARCHAR(50) DEFAULT 'discovery',
  HEALTH_SCORE      INTEGER DEFAULT 0,
  OUTCOME           VARCHAR(20) DEFAULT 'active',
  CREATED_AT        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  UPDATED_AT        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================
-- TABLE 3: MEETINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS MEETINGS (
  MEETING_ID        VARCHAR(36) DEFAULT UUID_STRING() PRIMARY KEY,
  DEAL_ID           VARCHAR(36) REFERENCES DEALS(DEAL_ID),
  USER_ID           VARCHAR(128) REFERENCES USERS(USER_ID),
  TRANSCRIPT_TEXT   TEXT,
  INPUT_TYPE        VARCHAR(20) DEFAULT 'text',
  GEMINI_SUMMARY    TEXT,
  SENTIMENT_SCORE   FLOAT DEFAULT 0,
  CREATED_AT        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================
-- TABLE 4: DEAL_HEALTH_SCORES
-- ============================================================
CREATE TABLE IF NOT EXISTS DEAL_HEALTH_SCORES (
  SCORE_ID              VARCHAR(36) DEFAULT UUID_STRING() PRIMARY KEY,
  DEAL_ID               VARCHAR(36) REFERENCES DEALS(DEAL_ID),
  MEETING_ID            VARCHAR(36) REFERENCES MEETINGS(MEETING_ID),
  TOTAL_SCORE           INTEGER DEFAULT 0,
  SENTIMENT_SCORE       INTEGER DEFAULT 0,
  OBJECTION_SCORE       INTEGER DEFAULT 0,
  COMMITMENT_SCORE      INTEGER DEFAULT 0,
  ENGAGEMENT_SCORE      INTEGER DEFAULT 0,
  FLAGGED_PHRASES       VARIANT,
  COMMITMENT_SIGNALS    VARIANT,
  RECOMMENDATION        TEXT,
  CREATED_AT            TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================
-- TABLE 5: FOLLOW_UPS
-- ============================================================
CREATE TABLE IF NOT EXISTS FOLLOW_UPS (
  FOLLOWUP_ID       VARCHAR(36) DEFAULT UUID_STRING() PRIMARY KEY,
  DEAL_ID           VARCHAR(36) REFERENCES DEALS(DEAL_ID),
  MEETING_ID        VARCHAR(36) REFERENCES MEETINGS(MEETING_ID),
  EMAIL_SUBJECT     TEXT,
  EMAIL_BODY        TEXT,
  STATUS            VARCHAR(20) DEFAULT 'draft',
  SENT_AT           TIMESTAMP_NTZ,
  CREATED_AT        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================
-- TABLE 6: OBJECTIONS (for Databricks analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS OBJECTIONS (
  OBJECTION_ID      VARCHAR(36) DEFAULT UUID_STRING() PRIMARY KEY,
  DEAL_ID           VARCHAR(36) REFERENCES DEALS(DEAL_ID),
  PHRASE            VARCHAR(500),
  CATEGORY          VARCHAR(100),
  OUTCOME           VARCHAR(20) DEFAULT 'active',
  INDUSTRY          VARCHAR(100),
  CREATED_AT        TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================
-- TABLE 7: ANALYTICS_RESULTS (written by Databricks)
-- ============================================================
CREATE TABLE IF NOT EXISTS ANALYTICS_RESULTS (
  RESULT_ID         VARCHAR(36) DEFAULT UUID_STRING() PRIMARY KEY,
  METRIC_NAME       VARCHAR(100),
  METRIC_VALUE      VARIANT,
  COMPUTED_AT       TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- ============================================================
-- SEED DATA (for demo purposes during hackathon)
-- ============================================================
INSERT INTO USERS (USER_ID, EMAIL, NAME, COMPANY, ROLE) VALUES
  ('demo_user_001', 'demo@meetingmind.ai', 'Alex Johnson', 'TechCorp', 'Sales Manager');

INSERT INTO DEALS (DEAL_ID, USER_ID, CLIENT_NAME, CLIENT_COMPANY, DEAL_VALUE, INDUSTRY, STAGE, HEALTH_SCORE, OUTCOME) VALUES
  ('deal_001', 'demo_user_001', 'Sarah Chen', 'Innovate LLC', 45000, 'Technology', 'negotiation', 72, 'active'),
  ('deal_002', 'demo_user_001', 'Marcus Rivera', 'Global Foods Co', 28000, 'Food & Beverage', 'proposal', 45, 'active'),
  ('deal_003', 'demo_user_001', 'Emily Patel', 'HealthFirst', 92000, 'Healthcare', 'closing', 88, 'active'),
  ('deal_004', 'demo_user_001', 'Tom Bradley', 'RetailX', 15000, 'Retail', 'discovery', 30, 'active'),
  ('deal_005', 'demo_user_001', 'Nina Walsh', 'FinServe Group', 67000, 'Finance', 'closing', 91, 'won');
