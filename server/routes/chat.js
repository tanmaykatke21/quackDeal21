const express = require('express');
const router = express.Router();
const snowflake = require('../services/snowflakeService');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const safeParseJSON = (text) => {
  const cleaned = text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
};

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { question, conversationHistory = [] } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: 'question is required' });

    const deals = await snowflake.getDeals('test_user');

    if (!deals || deals.length === 0) {
      return res.json({
        structured: {
          headline: 'No deals yet',
          summary: "You don't have any deals yet. Create your first deal by clicking New Analysis.",
          cards: [],
          action: null
        }
      });
    }

    const dealsSummary = deals.map(d =>
      `- ${d.CLIENT_NAME} at ${d.CLIENT_COMPANY || 'N/A'} | Industry: ${d.INDUSTRY || 'N/A'} | Value: $${d.DEAL_VALUE || 0} | Stage: ${d.STAGE} | Health: ${d.HEALTH_SCORE || 0}/100 | Outcome: ${d.OUTCOME}`
    ).join('\n');

    // Match specific client from question
    const questionLower = question.toLowerCase();
    let enrichedContext = '';
    const matchedDeal = deals.find(d => {
      const name = (d.CLIENT_NAME || '').toLowerCase();
      const company = (d.CLIENT_COMPANY || '').toLowerCase();
      return questionLower.includes(name) || questionLower.includes(company) ||
        name.split(' ').some(p => p.length > 2 && questionLower.includes(p)) ||
        company.split(' ').some(p => p.length > 2 && questionLower.includes(p));
    });

    if (matchedDeal) {
      try {
        const [meetings, notes, followUps] = await Promise.all([
          snowflake.getMeetingsByDeal(matchedDeal.DEAL_ID),
          snowflake.getNotesByDeal(matchedDeal.DEAL_ID),
          snowflake.getFollowUpsByDeal(matchedDeal.DEAL_ID),
        ]);
        enrichedContext = `

DETAILED DATA FOR ${matchedDeal.CLIENT_NAME?.toUpperCase()}:
Meetings: ${meetings.map((m, i) => `Meeting ${i+1}: ${m.GEMINI_SUMMARY || 'No summary'}`).join(' | ') || 'None'}
Notes: ${notes.map(n => n.CONTENT).join(' | ') || 'None'}
Follow-ups sent: ${followUps.length}`;
      } catch (err) {
        console.warn('Enrich error:', err.message);
      }
    }

    const systemPrompt = `You are a sales intelligence assistant. You have CRM data for all deals. 
    
ALL DEALS:
${dealsSummary}
${enrichedContext}

CRITICAL: You MUST return ONLY a raw JSON object. No markdown, no backticks, no explanation text outside JSON.

Return this exact structure:
{
  "headline": "Short title summarizing the answer (max 8 words)",
  "summary": "1-2 sentence plain English overview a non-technical person can understand",
  "cards": [
    {
      "type": "info|warning|success|danger",
      "title": "Card title",
      "value": "Main value or metric (optional, e.g. '$45,000' or '72/100')",
      "detail": "1 sentence explanation"
    }
  ],
  "action": "Single most important next step the sales rep should take, or null if not applicable"
}

Rules:
- cards array: 1 to 5 cards max, each about a specific deal or insight
- type "danger" = urgent problem, "warning" = needs attention, "success" = good news, "info" = neutral info
- value field: use for scores, dollar amounts, counts — leave empty string if not applicable
- Everything must be written for a non-technical sales person
- Base everything strictly on the provided CRM data`;

    const messages = [
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: question }
    ];

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 800,
      system: systemPrompt,
      messages,
    });

    const structured = safeParseJSON(response.content[0].text);
    res.json({ structured });

  } catch (err) {
    console.error('Global chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;