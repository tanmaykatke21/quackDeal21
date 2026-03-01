const express = require('express');
const router = express.Router();
const snowflake = require('../services/snowflakeService');
const { runReminderScan } = require('../services/reminderService');

// GET /api/reminders — get all active reminders for user
router.get('/', async (req, res) => {
  try {
    const reminders = await snowflake.getReminders('test_user');
    res.json({ reminders, count: reminders.length });
  } catch (err) {
    console.error('Get reminders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reminders/scan — triggered by Vercel Cron every hour
router.get('/scan', async (req, res) => {
  try {
    const result = await runReminderScan();
    res.json({ message: 'Scan complete', ...result });
  } catch (err) {
    console.error('Reminder scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reminders/scan — manually trigger a scan (useful for demo)
router.post('/scan', async (req, res) => {
  try {
    const result = await runReminderScan();
    res.json({ message: 'Scan complete', ...result });
  } catch (err) {
    console.error('Reminder scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reminders/:id/dismiss — dismiss a single reminder
router.patch('/:id/dismiss', async (req, res) => {
  try {
    await snowflake.dismissReminder(req.params.id);
    res.json({ message: 'Reminder dismissed' });
  } catch (err) {
    console.error('Dismiss reminder error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reminders/dismiss-all — dismiss all reminders
router.patch('/dismiss-all/all', async (req, res) => {
  try {
    await snowflake.dismissAllReminders('test_user');
    res.json({ message: 'All reminders dismissed' });
  } catch (err) {
    console.error('Dismiss all error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;