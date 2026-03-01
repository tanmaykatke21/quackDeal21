const express = require('express');
const router = express.Router();
const snowflake = require('../services/snowflakeService');
const { triggerAnalyticsPipeline, getJobStatus } = require('../services/databricksService');

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  try {
    const [summary, healthByIndustry, topObjections, healthTrend] = await Promise.all([
      snowflake.getAnalyticsSummary('test_user'),
      snowflake.getHealthByIndustry('test_user'),
      snowflake.getTopObjections('test_user'),
      snowflake.getHealthTrend('test_user'),
    ]);
    res.json({ summary, healthByIndustry, topObjections, healthTrend });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/analytics/pipeline — trigger Databricks job
router.post('/pipeline', async (req, res) => {
  try {
    const result = await triggerAnalyticsPipeline();
    res.json(result);
  } catch (err) {
    // Graceful fallback if Databricks not configured
    res.status(503).json({
      message: 'Databricks pipeline not configured',
      fallback: true
    });
  }
});

// GET /api/analytics/pipeline/:runId — check job status
router.get('/pipeline/:runId', async (req, res) => {
  try {
    const status = await getJobStatus(req.params.runId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;