// ── NOTES ────────────────────────────────────────────────────
// Add these functions to your existing snowflakeService.js

async function getNotesByDeal(dealId) {
  const sql = `
    SELECT NOTE_ID, DEAL_ID, USER_ID, CONTENT, CREATED_AT, UPDATED_AT
    FROM MEETINGMIND.APP.NOTES
    WHERE DEAL_ID = ?
    ORDER BY CREATED_AT ASC
  `;
  return await executeQuery(sql, [dealId]);
}

async function createNote({ dealId, userId, content }) {
  const noteId = require('uuid').v4();
  const sql = `
    INSERT INTO MEETINGMIND.APP.NOTES (NOTE_ID, DEAL_ID, USER_ID, CONTENT)
    VALUES (?, ?, ?, ?)
  `;
  await executeQuery(sql, [noteId, dealId, userId, content]);
  return noteId;
}

async function updateNote(noteId, content) {
  const sql = `
    UPDATE MEETINGMIND.APP.NOTES
    SET CONTENT = ?, UPDATED_AT = CURRENT_TIMESTAMP
    WHERE NOTE_ID = ?
  `;
  await executeQuery(sql, [content, noteId]);
}

async function deleteNote(noteId) {
  const sql = `DELETE FROM MEETINGMIND.APP.NOTES WHERE NOTE_ID = ?`;
  await executeQuery(sql, [noteId]);
}

module.exports = {
  // ... your existing exports
  getNotesByDeal,
  createNote,
  updateNote,
  deleteNote,
};
