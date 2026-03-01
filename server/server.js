require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectSnowflake } = require('./config/snowflake');
const { startReminderJobs } = require('./jobs/reminderJob');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ── Lazy Snowflake init (serverless-safe) ───────────────────
let _snowflakeReady = false;
app.use(async (req, res, next) => {
  if (!_snowflakeReady) {
    try {
      await connectSnowflake();
      _snowflakeReady = true;
    } catch (err) {
      console.error('Snowflake init failed:', err.message);
      return res.status(503).json({ error: 'Database unavailable' });
    }
  }
  next();
});

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/deals',     require('./routes/deals'));
app.use('/api/analyze',   require('./routes/analyze'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/reminders', require('./routes/reminders'));
app.use('/api/chat',      require('./routes/chat'));

// ── Health check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'MeetingMind API', time: new Date().toISOString() });
});

// ── 404 handler ─────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ── Local dev entry ──────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectSnowflake()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`\n🚀 MeetingMind server running on http://localhost:${PORT}`);
        console.log(`📊 Snowflake connected`);
        console.log(`🤖 Gemini Pro ready`);
        console.log(`🔥 Firebase Auth active`);
        console.log(`🔔 Reminder system active\n`);
      });
      startReminderJobs();
      const { runReminderScan } = require('./services/reminderService');
      runReminderScan().catch(err => console.warn('Initial reminder scan failed:', err));
    })
    .catch(err => { console.error('Failed to start server:', err); process.exit(1); });
}

module.exports = app;
