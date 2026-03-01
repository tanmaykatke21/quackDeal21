const cron = require('node-cron');
const { runReminderScan } = require('../services/reminderService');

const startReminderJobs = () => {
  // ── Daily 8am scan — full reminder check ─────────────────
  // Runs every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Daily reminder scan triggered at 8am');
    try {
      await runReminderScan();
    } catch (err) {
      console.error('Daily reminder scan error:', err);
    }
  });

  // ── Hourly scan — catch draft follow-ups quickly ─────────
  // Runs every hour at :00
  cron.schedule('0 * * * *', async () => {
    console.log('⏰ Hourly draft follow-up check triggered');
    try {
      await runReminderScan();
    } catch (err) {
      console.error('Hourly reminder scan error:', err);
    }
  });

  console.log('🔔 Reminder jobs scheduled (daily 8am + hourly)');
};

module.exports = { startReminderJobs };