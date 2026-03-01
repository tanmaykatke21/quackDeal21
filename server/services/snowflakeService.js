const { executeQuery } = require('../config/snowflake');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// USERS
// ============================================================
const upsertUser = async (uid, email, name) => {
  const sql = `
    MERGE INTO USERS AS target
    USING (SELECT ? AS USER_ID, ? AS EMAIL, ? AS NAME) AS source
    ON target.USER_ID = source.USER_ID
    WHEN MATCHED THEN UPDATE SET EMAIL = source.EMAIL, NAME = source.NAME
    WHEN NOT MATCHED THEN INSERT (USER_ID, EMAIL, NAME) VALUES (source.USER_ID, source.EMAIL, source.NAME)
  `;
  return executeQuery(sql, [uid, email, name || '']);
};

// ============================================================
// DEALS
// ============================================================
const getDeals = async (userId) => {
  const sql = `
    SELECT d.*,
      COUNT(m.MEETING_ID) AS MEETING_COUNT,
      MAX(m.CREATED_AT) AS LAST_MEETING
    FROM DEALS d
    LEFT JOIN MEETINGS m ON d.DEAL_ID = m.DEAL_ID
    WHERE d.USER_ID = ?
    GROUP BY d.DEAL_ID, d.USER_ID, d.CLIENT_NAME, d.CLIENT_COMPANY,
             d.CLIENT_EMAIL, d.DEAL_VALUE, d.INDUSTRY, d.STAGE,
             d.HEALTH_SCORE, d.OUTCOME, d.CREATED_AT, d.UPDATED_AT
    ORDER BY d.UPDATED_AT DESC
  `;
  return executeQuery(sql, [userId]);
};

const getDealById = async (dealId, userId) => {
  const sql = `
    SELECT d.*,
      ARRAY_AGG(OBJECT_CONSTRUCT(
        'meeting_id', m.MEETING_ID,
        'summary', m.GEMINI_SUMMARY,
        'sentiment', m.SENTIMENT_SCORE,
        'created_at', m.CREATED_AT
      )) AS MEETINGS
    FROM DEALS d
    LEFT JOIN MEETINGS m ON d.DEAL_ID = m.DEAL_ID
    WHERE d.DEAL_ID = ? AND d.USER_ID = ?
    GROUP BY d.DEAL_ID, d.USER_ID, d.CLIENT_NAME, d.CLIENT_COMPANY,
             d.CLIENT_EMAIL, d.DEAL_VALUE, d.INDUSTRY, d.STAGE,
             d.HEALTH_SCORE, d.OUTCOME, d.CREATED_AT, d.UPDATED_AT
  `;
  const rows = await executeQuery(sql, [dealId, userId]);
  return rows[0] || null;
};

const createDeal = async ({ userId, clientName, clientCompany, clientEmail, dealValue, industry, stage }) => {
  const dealId = uuidv4();
  const sql = `
    INSERT INTO DEALS (DEAL_ID, USER_ID, CLIENT_NAME, CLIENT_COMPANY, CLIENT_EMAIL, DEAL_VALUE, INDUSTRY, STAGE)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await executeQuery(sql, [dealId, userId, clientName, clientCompany || '', clientEmail || '', dealValue || 0, industry || '', stage || 'discovery']);
  return dealId;
};

const updateDealHealthScore = async (dealId, healthScore, stage) => {
  const sql = `
    UPDATE DEALS 
    SET HEALTH_SCORE = ?, STAGE = ?, UPDATED_AT = CURRENT_TIMESTAMP()
    WHERE DEAL_ID = ?
  `;
  return executeQuery(sql, [healthScore, stage, dealId]);
};

const updateDealOutcome = async (dealId, outcome) => {
  const sql = `UPDATE DEALS SET OUTCOME = ?, UPDATED_AT = CURRENT_TIMESTAMP() WHERE DEAL_ID = ?`;
  return executeQuery(sql, [outcome, dealId]);
};

// ============================================================
// MEETINGS
// ============================================================
const createMeeting = async ({ dealId, userId, transcriptText, inputType, geminiSummary, sentimentScore }) => {
  const meetingId = uuidv4();
  const sql = `
    INSERT INTO MEETINGS (MEETING_ID, DEAL_ID, USER_ID, TRANSCRIPT_TEXT, INPUT_TYPE, GEMINI_SUMMARY, SENTIMENT_SCORE)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  await executeQuery(sql, [meetingId, dealId, userId, transcriptText, inputType, geminiSummary, sentimentScore]);
  return meetingId;
};

const getMeetingsByDeal = async (dealId) => {
  const sql = `SELECT * FROM MEETINGS WHERE DEAL_ID = ? ORDER BY CREATED_AT DESC`;
  return executeQuery(sql, [dealId]);
};

// ============================================================
// DEAL HEALTH SCORES
// ============================================================
const saveDealHealthScore = async ({
  dealId, meetingId, totalScore, sentimentScore, objectionScore,
  commitmentScore, engagementScore, flaggedPhrases, commitmentSignals, recommendation
}) => {
  const scoreId = uuidv4();
  const sql = `
    INSERT INTO DEAL_HEALTH_SCORES (
      SCORE_ID, DEAL_ID, MEETING_ID, TOTAL_SCORE,
      SENTIMENT_SCORE, OBJECTION_SCORE, COMMITMENT_SCORE, ENGAGEMENT_SCORE,
      FLAGGED_PHRASES, COMMITMENT_SIGNALS, RECOMMENDATION
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, PARSE_JSON(?), PARSE_JSON(?), ?)
  `;
  await executeQuery(sql, [
    scoreId, dealId, meetingId, totalScore,
    sentimentScore, objectionScore, commitmentScore, engagementScore,
    JSON.stringify(flaggedPhrases),
    JSON.stringify(commitmentSignals),
    recommendation
  ]);
  return scoreId;
};

const getHealthHistory = async (dealId) => {
  const sql = `
    SELECT TOTAL_SCORE, SENTIMENT_SCORE, OBJECTION_SCORE,
           COMMITMENT_SCORE, ENGAGEMENT_SCORE, CREATED_AT
    FROM DEAL_HEALTH_SCORES
    WHERE DEAL_ID = ?
    ORDER BY CREATED_AT ASC
  `;
  return executeQuery(sql, [dealId]);
};

// ============================================================
// FOLLOW-UPS
// ============================================================
const saveFollowUp = async ({ dealId, meetingId, emailSubject, emailBody }) => {
  const followUpId = uuidv4();
  const sql = `
    INSERT INTO FOLLOW_UPS (FOLLOWUP_ID, DEAL_ID, MEETING_ID, EMAIL_SUBJECT, EMAIL_BODY)
    VALUES (?, ?, ?, ?, ?)
  `;
  await executeQuery(sql, [followUpId, dealId, meetingId, emailSubject, emailBody]);
  return followUpId;
};

const getFollowUpsByDeal = async (dealId) => {
  const sql = `SELECT * FROM FOLLOW_UPS WHERE DEAL_ID = ? ORDER BY CREATED_AT DESC`;
  return executeQuery(sql, [dealId]);
};

// ============================================================
// OBJECTIONS
// ============================================================
const saveObjections = async (dealId, objections, industry) => {
  if (!objections || objections.length === 0) return;
  const values = objections.map(() => '(UUID_STRING(), ?, ?, ?)').join(', ');
  const sql = `INSERT INTO OBJECTIONS (OBJECTION_ID, DEAL_ID, PHRASE, INDUSTRY) VALUES ${values}`;
  const binds = objections.flatMap(phrase => [dealId, phrase, industry || '']);
  return executeQuery(sql, binds);
};

// ============================================================
// NOTES
// ============================================================
const getNotesByDeal = async (dealId) => {
  const sql = `
    SELECT NOTE_ID, DEAL_ID, USER_ID, CONTENT, CREATED_AT, UPDATED_AT
    FROM MEETINGMIND.APP.NOTES
    WHERE DEAL_ID = ?
    ORDER BY CREATED_AT ASC
  `;
  return executeQuery(sql, [dealId]);
};

const createNote = async ({ dealId, userId, content }) => {
  const noteId = uuidv4();
  const sql = `
    INSERT INTO MEETINGMIND.APP.NOTES (NOTE_ID, DEAL_ID, USER_ID, CONTENT)
    VALUES (?, ?, ?, ?)
  `;
  await executeQuery(sql, [noteId, dealId, userId, content]);
  return noteId;
};

const updateNote = async (noteId, content) => {
  const sql = `
    UPDATE MEETINGMIND.APP.NOTES
    SET CONTENT = ?, UPDATED_AT = CURRENT_TIMESTAMP
    WHERE NOTE_ID = ?
  `;
  return executeQuery(sql, [content, noteId]);
};

const deleteNote = async (noteId) => {
  const sql = `DELETE FROM MEETINGMIND.APP.NOTES WHERE NOTE_ID = ?`;
  return executeQuery(sql, [noteId]);
};

// ============================================================
// REMINDERS
// ============================================================
const getActiveDealsForReminders = async () => {
  const sql = `
    SELECT
      d.DEAL_ID, d.USER_ID, d.CLIENT_NAME, d.CLIENT_COMPANY,
      d.HEALTH_SCORE, d.STAGE, d.DEAL_VALUE, d.OUTCOME,
      d.UPDATED_AT,
      MAX(m.CREATED_AT) AS LAST_MEETING_AT,
      DATEDIFF('day', MAX(m.CREATED_AT), CURRENT_TIMESTAMP()) AS DAYS_SINCE_MEETING,
      DATEDIFF('day', d.UPDATED_AT, CURRENT_TIMESTAMP()) AS DAYS_SINCE_UPDATE
    FROM MEETINGMIND.APP.DEALS d
    LEFT JOIN MEETINGMIND.APP.MEETINGS m ON d.DEAL_ID = m.DEAL_ID
    WHERE d.OUTCOME = 'active'
    GROUP BY d.DEAL_ID, d.USER_ID, d.CLIENT_NAME, d.CLIENT_COMPANY,
             d.HEALTH_SCORE, d.STAGE, d.DEAL_VALUE, d.OUTCOME, d.UPDATED_AT
  `;
  return executeQuery(sql, []);
};

const getHealthScoreDrops = async () => {
  const sql = `
    WITH ranked AS (
      SELECT
        DEAL_ID,
        TOTAL_SCORE,
        CREATED_AT,
        LAG(TOTAL_SCORE) OVER (PARTITION BY DEAL_ID ORDER BY CREATED_AT) AS PREV_SCORE
      FROM MEETINGMIND.APP.DEAL_HEALTH_SCORES
    )
    SELECT r.DEAL_ID, r.TOTAL_SCORE AS CURRENT_SCORE, r.PREV_SCORE,
           (r.PREV_SCORE - r.TOTAL_SCORE) AS DROP_AMOUNT,
           d.CLIENT_NAME, d.CLIENT_COMPANY, d.USER_ID, d.DEAL_VALUE
    FROM ranked r
    JOIN MEETINGMIND.APP.DEALS d ON r.DEAL_ID = d.DEAL_ID
    WHERE r.PREV_SCORE IS NOT NULL
      AND (r.PREV_SCORE - r.TOTAL_SCORE) >= 10
      AND d.OUTCOME = 'active'
      AND r.CREATED_AT >= DATEADD('day', -1, CURRENT_TIMESTAMP())
    ORDER BY DROP_AMOUNT DESC
  `;
  return executeQuery(sql, []);
};

const getDraftFollowUps = async () => {
  const sql = `
    SELECT f.FOLLOWUP_ID, f.DEAL_ID, f.EMAIL_SUBJECT, f.CREATED_AT,
           d.CLIENT_NAME, d.CLIENT_COMPANY, d.USER_ID, d.DEAL_VALUE,
           DATEDIFF('hour', f.CREATED_AT, CURRENT_TIMESTAMP()) AS HOURS_PENDING
    FROM MEETINGMIND.APP.FOLLOW_UPS f
    JOIN MEETINGMIND.APP.DEALS d ON f.DEAL_ID = d.DEAL_ID
    WHERE f.STATUS = 'draft'
      AND d.OUTCOME = 'active'
      AND DATEDIFF('hour', f.CREATED_AT, CURRENT_TIMESTAMP()) >= 48
  `;
  return executeQuery(sql, []);
};

const getExistingActiveReminders = async () => {
  const sql = `
    SELECT DEAL_ID, TYPE
    FROM MEETINGMIND.APP.REMINDERS
    WHERE IS_DISMISSED = FALSE
      AND CREATED_AT >= DATEADD('day', -1, CURRENT_TIMESTAMP())
  `;
  return executeQuery(sql, []);
};

const saveReminder = async ({ dealId, userId, type, message, priority }) => {
  const reminderId = uuidv4();
  const sql = `
    INSERT INTO MEETINGMIND.APP.REMINDERS
      (REMINDER_ID, DEAL_ID, USER_ID, TYPE, MESSAGE, PRIORITY)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await executeQuery(sql, [reminderId, dealId, userId, type, message, priority]);
  return reminderId;
};

const getReminders = async (userId) => {
  const sql = `
    SELECT r.*, d.CLIENT_NAME, d.CLIENT_COMPANY, d.HEALTH_SCORE, d.STAGE, d.DEAL_VALUE
    FROM MEETINGMIND.APP.REMINDERS r
    JOIN MEETINGMIND.APP.DEALS d ON r.DEAL_ID = d.DEAL_ID
    WHERE r.USER_ID = ?
      AND r.IS_DISMISSED = FALSE
    ORDER BY
      CASE r.PRIORITY WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
      r.CREATED_AT DESC
  `;
  return executeQuery(sql, [userId]);
};

const dismissReminder = async (reminderId) => {
  const sql = `
    UPDATE MEETINGMIND.APP.REMINDERS
    SET IS_DISMISSED = TRUE
    WHERE REMINDER_ID = ?
  `;
  return executeQuery(sql, [reminderId]);
};

const dismissAllReminders = async (userId) => {
  const sql = `
    UPDATE MEETINGMIND.APP.REMINDERS
    SET IS_DISMISSED = TRUE
    WHERE USER_ID = ? AND IS_DISMISSED = FALSE
  `;
  return executeQuery(sql, [userId]);
};

// ============================================================
// ANALYTICS QUERIES (for dashboard)
// ============================================================
const getAnalyticsSummary = async (userId) => {
  const sql = `
    SELECT
      COUNT(*)                                          AS TOTAL_DEALS,
      AVG(HEALTH_SCORE)                                 AS AVG_HEALTH,
      SUM(CASE WHEN OUTCOME = 'won' THEN 1 ELSE 0 END)  AS WON_DEALS,
      SUM(CASE WHEN OUTCOME = 'lost' THEN 1 ELSE 0 END) AS LOST_DEALS,
      SUM(CASE WHEN OUTCOME = 'active' THEN 1 ELSE 0 END) AS ACTIVE_DEALS,
      SUM(CASE WHEN OUTCOME = 'won' THEN DEAL_VALUE ELSE 0 END) AS TOTAL_REVENUE
    FROM DEALS
    WHERE USER_ID = ?
  `;
  const rows = await executeQuery(sql, [userId]);
  return rows[0];
};

const getHealthByIndustry = async (userId) => {
  const sql = `
    SELECT INDUSTRY, AVG(HEALTH_SCORE) AS AVG_HEALTH, COUNT(*) AS DEAL_COUNT
    FROM DEALS
    WHERE USER_ID = ? AND INDUSTRY != ''
    GROUP BY INDUSTRY
    ORDER BY AVG_HEALTH DESC
  `;
  return executeQuery(sql, [userId]);
};

const getTopObjections = async (userId) => {
  const sql = `
    SELECT o.PHRASE, COUNT(*) AS FREQUENCY,
      SUM(CASE WHEN d.OUTCOME = 'lost' THEN 1 ELSE 0 END) AS LOSS_CORRELATION
    FROM OBJECTIONS o
    JOIN DEALS d ON o.DEAL_ID = d.DEAL_ID
    WHERE d.USER_ID = ?
    GROUP BY o.PHRASE
    ORDER BY FREQUENCY DESC
    LIMIT 10
  `;
  return executeQuery(sql, [userId]);
};

const getHealthTrend = async (userId) => {
  const sql = `
    SELECT DATE_TRUNC('week', dhs.CREATED_AT) AS WEEK,
           AVG(dhs.TOTAL_SCORE) AS AVG_SCORE
    FROM DEAL_HEALTH_SCORES dhs
    JOIN DEALS d ON dhs.DEAL_ID = d.DEAL_ID
    WHERE d.USER_ID = ?
    GROUP BY WEEK
    ORDER BY WEEK ASC
    LIMIT 12
  `;
  return executeQuery(sql, [userId]);
};

module.exports = {
  upsertUser,
  getDeals, getDealById, createDeal, updateDealHealthScore, updateDealOutcome,
  createMeeting, getMeetingsByDeal,
  saveDealHealthScore, getHealthHistory,
  saveFollowUp, getFollowUpsByDeal,
  saveObjections,
  getNotesByDeal, createNote, updateNote, deleteNote,
  getActiveDealsForReminders, getHealthScoreDrops, getDraftFollowUps,
  getExistingActiveReminders, saveReminder,
  getReminders, dismissReminder, dismissAllReminders,
  getAnalyticsSummary, getHealthByIndustry, getTopObjections, getHealthTrend,
};
