const express = require('express');
const router = express.Router();
const snowflake = require('../services/snowflakeService');
const { askAboutDeal, generateInsights } = require('../services/geminiService');

// GET /api/deals
router.get('/', async (req, res) => {
  try {
    const deals = await snowflake.getDeals('test_user');
    res.json(deals);
  } catch (err) {
    console.error('Get deals error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deals/:id
router.get('/:id', async (req, res) => {
  try {
    const deal = await snowflake.getDealById(req.params.id, 'test_user');
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    const [meetings, healthHistory, followUps, notes] = await Promise.all([
      snowflake.getMeetingsByDeal(req.params.id),
      snowflake.getHealthHistory(req.params.id),
      snowflake.getFollowUpsByDeal(req.params.id),
      snowflake.getNotesByDeal(req.params.id),
    ]);
    res.json({ ...deal, meetings, healthHistory, followUps, notes });
  } catch (err) {
    console.error('Get deal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/deals
router.post('/', async (req, res) => {
  try {
    const { clientName, clientCompany, clientEmail, dealValue, industry, stage } = req.body;
    if (!clientName) return res.status(400).json({ error: 'clientName is required' });
    const dealId = await snowflake.createDeal({
      userId: 'test_user',
      clientName, clientCompany, clientEmail, dealValue, industry, stage,
    });
    res.status(201).json({ dealId, message: 'Deal created' });
  } catch (err) {
    console.error('Create deal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/deals/:id/outcome
router.patch('/:id/outcome', async (req, res) => {
  try {
    const { outcome } = req.body;
    if (!['won', 'lost', 'active'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be won, lost, or active' });
    }
    await snowflake.updateDealOutcome(req.params.id, outcome);
    res.json({ message: `Deal marked as ${outcome}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── NOTES ─────────────────────────────────────────────────────
router.get('/:id/notes', async (req, res) => {
  try {
    const notes = await snowflake.getNotesByDeal(req.params.id);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/notes', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Note content is required' });
    const noteId = await snowflake.createNote({ dealId: req.params.id, userId: 'test_user', content: content.trim() });
    res.status(201).json({ noteId, message: 'Note saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/notes/:noteId', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Note content is required' });
    await snowflake.updateNote(req.params.noteId, content.trim());
    res.json({ message: 'Note updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/notes/:noteId', async (req, res) => {
  try {
    await snowflake.deleteNote(req.params.noteId);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI: Ask about deal ────────────────────────────────────────
router.post('/:id/ask', async (req, res) => {
  try {
    const { question, conversationHistory = [] } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'question is required' });

    const deal = await snowflake.getDealById(req.params.id, 'test_user');
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const [meetings, notes, followUps] = await Promise.all([
      snowflake.getMeetingsByDeal(req.params.id),
      snowflake.getNotesByDeal(req.params.id),
      snowflake.getFollowUpsByDeal(req.params.id),
    ]);

    const answer = await askAboutDeal(question, { ...deal, meetings, notes, followUps }, conversationHistory);
    res.json({ answer });
  } catch (err) {
    console.error('Ask error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── AI: Generate insights ─────────────────────────────────────
router.get('/:id/insights', async (req, res) => {
  try {
    const deal = await snowflake.getDealById(req.params.id, 'test_user');
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const [meetings, notes, followUps] = await Promise.all([
      snowflake.getMeetingsByDeal(req.params.id),
      snowflake.getNotesByDeal(req.params.id),
      snowflake.getFollowUpsByDeal(req.params.id),
    ]);

    const insights = await generateInsights({ ...deal, meetings, notes, followUps });
    res.json(insights);
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
