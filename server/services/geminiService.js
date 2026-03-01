const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Safely parse JSON even if Claude wraps it in markdown ────
const safeParseJSON = (text) => {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
};

// ── Build deal context string for AI prompts ─────────────────
const buildDealContext = (deal) => {
  const meetings = (deal.meetings || []).map((m, i) =>
    `Meeting ${i + 1} (${new Date(m.CREATED_AT).toLocaleDateString()}): ${m.GEMINI_SUMMARY || 'No summary'}`
  ).join('\n');

  const notes = (deal.notes || []).map((n, i) =>
    `Note ${i + 1} (${new Date(n.CREATED_AT).toLocaleDateString()}): ${n.CONTENT}`
  ).join('\n');

  const followUps = (deal.followUps || []).map((f, i) =>
    `Follow-up ${i + 1}: Subject: ${f.EMAIL_SUBJECT || ''}`
  ).join('\n');

  return `
CLIENT: ${deal.CLIENT_NAME} at ${deal.CLIENT_COMPANY || 'Unknown Company'}
EMAIL: ${deal.CLIENT_EMAIL || 'N/A'}
INDUSTRY: ${deal.INDUSTRY || 'N/A'}
DEAL VALUE: $${deal.DEAL_VALUE || 0}
STAGE: ${deal.STAGE || 'unknown'}
OUTCOME: ${deal.OUTCOME || 'active'}
HEALTH SCORE: ${deal.HEALTH_SCORE || 0}/100

MEETING SUMMARIES:
${meetings || 'No meetings yet'}

SALES NOTES:
${notes || 'No notes yet'}

FOLLOW-UP EMAILS SENT:
${followUps || 'None yet'}
`.trim();
};

// ── Analyze text transcript ──────────────────────────────────
const analyzeTranscript = async (transcript) => {
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a sales intelligence assistant. Analyze this sales call transcript and return ONLY a JSON object with no markdown, no backticks, just raw JSON.

Transcript:
${transcript}

Return this exact structure:
{
  "summary": "2-3 sentence summary of the call",
  "sentimentScore": 0.6,
  "objections": ["objection 1", "objection 2"],
  "commitmentSignals": ["signal 1", "signal 2"],
  "actionItems": ["action 1", "action 2"],
  "nextBestAction": "single most important next step"
}`
    }]
  });
  return safeParseJSON(response.content[0].text);
};

// ── Analyze image (screenshot of email/chat) ────────────────
const analyzeImage = async (base64Image, mediaType = 'image/png') => {
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
        {
          type: 'text',
          text: `You are a sales intelligence assistant. Analyze this sales conversation screenshot and return ONLY a JSON object with no markdown, no backticks, just raw JSON.

Return this exact structure:
{
  "summary": "2-3 sentence summary",
  "sentimentScore": 0.6,
  "objections": ["objection 1"],
  "commitmentSignals": ["signal 1"],
  "actionItems": ["action 1"],
  "nextBestAction": "most important next step"
}`
        }
      ]
    }]
  });
  return safeParseJSON(response.content[0].text);
};

// ── Ask Claude anything about a specific deal ────────────────
const askAboutDeal = async (question, deal, conversationHistory = []) => {
  const context = buildDealContext(deal);
  const systemPrompt = `You are an expert sales intelligence assistant with full access to data about a specific customer deal. Answer questions accurately using only the data provided. Be concise, direct, and actionable. If information is not available in the data, say so honestly.

DEAL DATA:
${context}`;

  const messages = [
    ...conversationHistory,
    { role: 'user', content: question }
  ];

  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 512,
    system: systemPrompt,
    messages,
  });
  return response.content[0].text.trim();
};

// ── Generate insights from all deal data ─────────────────────
const generateInsights = async (deal) => {
  const context = buildDealContext(deal);
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a senior sales coach analyzing a deal. Study all the data below and return ONLY a JSON object with no markdown, no backticks, just raw JSON.

DEAL DATA:
${context}

Return this exact structure:
{
  "dealSummary": "1 sentence overall assessment of where this deal stands",
  "winProbability": 65,
  "insights": [
    { "type": "risk", "title": "Short title", "body": "1-2 sentence insight" },
    { "type": "opportunity", "title": "Short title", "body": "1-2 sentence insight" },
    { "type": "action", "title": "Short title", "body": "1-2 sentence insight" }
  ],
  "recommendedNextStep": "Single most important thing the sales rep should do right now"
}

Rules:
- insights array must have 3-5 items
- type must be one of: risk, opportunity, action, warning
- winProbability is a number 0-100
- base everything strictly on the provided data`
    }]
  });
  return safeParseJSON(response.content[0].text);
};

// ── Generate follow-up email ─────────────────────────────────
const generateFollowUp = async ({ clientName, clientCompany, healthScore, objections, commitmentSignals, nextBestAction }) => {
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `You are a sales assistant. Write a follow-up email and return ONLY a JSON object with no markdown, no backticks, just raw JSON.

Client: ${clientName} at ${clientCompany}
Deal Health Score: ${healthScore}/100
Objections raised: ${objections?.join(', ') || 'none'}
Commitment signals: ${commitmentSignals?.join(', ') || 'none'}
Next best action: ${nextBestAction}

Return this exact structure:
{
  "subject": "email subject line",
  "body": "full email body under 200 words, warm professional tone"
}`
    }]
  });
  return safeParseJSON(response.content[0].text);
};

// ── Explain health score in plain English ────────────────────
const explainHealthScore = async (scoreBreakdown) => {
  const response = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Explain this deal health score in 2-3 plain sentences a sales rep would understand. Be direct and actionable.

Score breakdown: ${JSON.stringify(scoreBreakdown)}

Return only the explanation text, no JSON.`
    }]
  });
  return response.content[0].text.trim();
};

module.exports = {
  analyzeTranscript,
  analyzeImage,
  askAboutDeal,
  generateInsights,
  generateFollowUp,
  explainHealthScore
};
