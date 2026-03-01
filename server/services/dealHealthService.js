// ============================================================
// MeetingMind — Deal Health Score Algorithm
// Pure algorithmic scoring — no AI black box
// Judges can see exactly how every point is calculated
// ============================================================

// Objection phrases that indicate deal risk
const OBJECTION_PHRASES = [
  // Budget
  'too expensive', 'over budget', 'can\'t afford', 'budget constraints',
  'need to check budget', 'budget is tight', 'cost is a concern',
  'pricing is high', 'reduce the price', 'discount',
  // Timing
  'not the right time', 'maybe next quarter', 'let\'s revisit',
  'put this on hold', 'not ready yet', 'too soon', 'come back later',
  'next year', 'after the holidays',
  // Authority
  'need approval', 'check with my boss', 'board needs to decide',
  'committee decision', 'not my call', 'need sign-off',
  'need to run this by', 'get back to you',
  // Need
  'not sure we need this', 'already have a solution',
  'happy with current', 'don\'t see the value', 'not a priority',
  'nice to have', 'not essential', 'we\'re good for now',
  // Stalling
  'send me more information', 'need to think about it',
  'i\'ll call you back', 'we\'ll be in touch', 'still evaluating',
  'comparing options', 'looking at competitors',
];

// Commitment signals — positive deal indicators
const COMMITMENT_SIGNALS = [
  // Moving forward
  'let\'s move forward', 'ready to proceed', 'where do we sign',
  'send the contract', 'let\'s do it', 'sounds good',
  // Next steps
  'next steps', 'what\'s the process', 'how do we get started',
  'timeline for implementation', 'onboarding process',
  // Positive engagement
  'exactly what we need', 'this solves our problem',
  'very interested', 'this is impressive', 'love this',
  'fits perfectly', 'great fit', 'makes sense for us',
  // Urgency
  'as soon as possible', 'need this by', 'urgent',
  'can we expedite', 'fast track',
];

// Question indicators (shows prospect engagement)
const QUESTION_PATTERNS = [
  '?', 'how does', 'what about', 'can you', 'is there',
  'do you', 'will this', 'how long', 'how much',
];

// ============================================================
// MAIN SCORING FUNCTION
// ============================================================
const calculateDealHealth = (analysisData) => {
  const {
    transcript = '',
    geminiSentimentScore = 0,
    objections = [],
    commitments = [],
  } = analysisData;

  const text = transcript.toLowerCase();

  // ── Component 1: Sentiment (0–25) ──────────────────────────
  let sentimentPoints = 12; // neutral baseline
  if (geminiSentimentScore > 0.5)       sentimentPoints = 25;
  else if (geminiSentimentScore > 0.2)  sentimentPoints = 20;
  else if (geminiSentimentScore > -0.2) sentimentPoints = 12;
  else if (geminiSentimentScore > -0.5) sentimentPoints = 5;
  else                                   sentimentPoints = 0;

  // ── Component 2: Objection Density (0–25) ──────────────────
  // Detect objections from transcript + from Gemini extraction
  const detectedObjections = detectPhrases(text, OBJECTION_PHRASES);
  const allObjections = [...new Set([...detectedObjections, ...objections])];
  let objectionPoints = 25;
  if (allObjections.length === 1)      objectionPoints = 18;
  else if (allObjections.length === 2) objectionPoints = 10;
  else if (allObjections.length >= 3)  objectionPoints = 3;

  // ── Component 3: Commitment Signals (0–25) ─────────────────
  const detectedCommitments = detectPhrases(text, COMMITMENT_SIGNALS);
  const allCommitments = [...new Set([...detectedCommitments, ...commitments])];
  let commitmentPoints = 0;
  if (allCommitments.length >= 3)      commitmentPoints = 25;
  else if (allCommitments.length === 2) commitmentPoints = 18;
  else if (allCommitments.length === 1) commitmentPoints = 10;

  // ── Component 4: Engagement Quality (0–25) ─────────────────
  let engagementPoints = 0;
  // Questions asked (shows curiosity/interest)
  const questionCount = countQuestions(text);
  if (questionCount >= 2) engagementPoints += 10;
  else if (questionCount === 1) engagementPoints += 5;
  // Response length (longer = more engaged)
  const wordCount = text.split(' ').length;
  if (wordCount > 300) engagementPoints += 8;
  else if (wordCount > 150) engagementPoints += 5;
  else if (wordCount > 50) engagementPoints += 3;
  // Specific numbers/dates mentioned (shows seriousness)
  if (/\b\d{4}\b|\bq[1-4]\b|\bjanuary|february|march|april|may|june|july|august|september|october|november|december\b/.test(text)) {
    engagementPoints += 7;
  }
  engagementPoints = Math.min(engagementPoints, 25);

  // ── Total Score ─────────────────────────────────────────────
  const totalScore = sentimentPoints + objectionPoints + commitmentPoints + engagementPoints;

  return {
    totalScore,
    breakdown: {
      sentiment:   sentimentPoints,
      objection:   objectionPoints,
      commitment:  commitmentPoints,
      engagement:  engagementPoints,
    },
    detectedObjections: allObjections,
    detectedCommitments: allCommitments,
    label:  getScoreLabel(totalScore),
    color:  getScoreColor(totalScore),
    recommendation: getRecommendation(totalScore, allObjections, allCommitments),
  };
};

// ── Helpers ───────────────────────────────────────────────────

const detectPhrases = (text, phrases) => {
  return phrases.filter(phrase => text.includes(phrase.toLowerCase()));
};

const countQuestions = (text) => {
  return (text.match(/\?/g) || []).length;
};

const getScoreLabel = (score) => {
  if (score >= 80) return 'Hot 🔥';
  if (score >= 60) return 'Warm ✅';
  if (score >= 40) return 'Lukewarm ⚠️';
  if (score >= 20) return 'Cold 🧊';
  return 'At Risk ❌';
};

const getScoreColor = (score) => {
  if (score >= 80) return '#22c55e';  // green-500
  if (score >= 60) return '#84cc16';  // lime-500
  if (score >= 40) return '#f59e0b';  // amber-500
  if (score >= 20) return '#f97316';  // orange-500
  return '#ef4444';                   // red-500
};

const getRecommendation = (score, objections, commitments) => {
  if (score >= 80) {
    return 'Deal is hot — send a closing email within 24 hours and propose a contract signing date.';
  }
  if (score >= 60) {
    return `Deal is progressing well. ${objections.length > 0 ? `Address the concern around "${objections[0]}" in your next message.` : 'Reinforce the value proposition and suggest next steps.'}`;
  }
  if (score >= 40) {
    return `Deal needs attention. Key objections detected: ${objections.slice(0, 2).join(', ') || 'general hesitation'}. Focus on demonstrating ROI and addressing these concerns directly.`;
  }
  return `Deal is at risk. Multiple objections detected. Consider scheduling a discovery call to reset the conversation and re-qualify their needs.`;
};

module.exports = { calculateDealHealth, OBJECTION_PHRASES, COMMITMENT_SIGNALS };
