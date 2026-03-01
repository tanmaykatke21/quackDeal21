const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const snowflake = require('../services/snowflakeService');

// POST /api/auth/sync — called after Firebase login to sync user to Snowflake
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const { uid, email, name } = req.user;
    await snowflake.upsertUser(uid, email, name || email.split('@')[0]);
    res.json({ message: 'User synced', uid });
  } catch (err) {
    console.error('User sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
