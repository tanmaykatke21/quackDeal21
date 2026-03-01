const express = require('express');
const router = express.Router();
const { analyzeTranscript, analyzeImage, generateFollowUp } = require('../services/geminiService');
const { calculateDealHealth } = require('../services/dealHealthService');
const {
  createMeeting,
  saveDealHealthScore,
  saveFollowUp,
  saveObjections,
  updateDealHealthScore,
} = require('../services/snowflakeService');

// POST /api/analyze
router.post('/', async (req, res) => {
  try {
    const { dealId, inputType, text, transcriptText, imageBase64, audioBase64, mediaType } = req.body;

    console.log('📥 Analyze request:', { dealId, inputType, textLength: (text || transcriptText)?.length });

    if (!dealId || !inputType) {
      return res.status(400).json({ error: 'dealId and inputType are required' });
    }

    const transcript = text || transcriptText;
    let geminiAnalysis;

    if (inputType === 'text') {
      if (!transcript) return res.status(400).json({ error: 'text is required for inputType text' });
      geminiAnalysis = await analyzeTranscript(transcript);

    } else if (inputType === 'image') {
      if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required for inputType image' });
      geminiAnalysis = await analyzeImage(imageBase64, mediaType || 'image/png');

    } else if (inputType === 'audio') {
      if (audioBase64) {
        return res.status(400).json({
          error: 'Audio file upload is not supported. Please use the live recording button instead.'
        });
      }
      if (!transcript) return res.status(400).json({ error: 'No transcript found. Please use live recording and try again.' });
      geminiAnalysis = await analyzeTranscript(transcript);

    } else {
      return res.status(400).json({ error: 'inputType must be text, image, or audio' });
    }

    // ── Calculate Deal Health Score ──────────────────────────
    const healthResult = calculateDealHealth({
      sentimentScore:   geminiAnalysis.sentimentScore || 0,
      objections:       geminiAnalysis.objections || [],
      commitmentSignals: geminiAnalysis.commitmentSignals || [],
      transcript:       transcript || ''
    });

    // ── Save meeting to Snowflake ────────────────────────────
    let meetingId;
    try {
      meetingId = await createMeeting({
        dealId,
        userId:         'test_user',
        transcriptText: transcript || '',
        inputType,
        geminiSummary:  geminiAnalysis.summary || '',
        sentimentScore: geminiAnalysis.sentimentScore || 0,
      });
    } catch (dbError) {
      console.warn('⚠️ createMeeting failed (continuing):', dbError.message);
      meetingId = `mtg_${Date.now()}`;
    }

    // ── Save health score to Snowflake ───────────────────────
    try {
      await saveDealHealthScore({
        dealId,
        meetingId,
        totalScore:       healthResult.totalScore,
        sentimentScore:   healthResult.breakdown?.sentiment || 0,
        objectionScore:   healthResult.breakdown?.objections || 0,
        commitmentScore:  healthResult.breakdown?.commitment || 0,
        engagementScore:  healthResult.breakdown?.engagement || 0,
        flaggedPhrases:   geminiAnalysis.objections || [],
        commitmentSignals: geminiAnalysis.commitmentSignals || [],
        recommendation:   geminiAnalysis.nextBestAction || '',
      });
    } catch (dbError) {
      console.warn('⚠️ saveDealHealthScore failed (continuing):', dbError.message);
    }

    // ── Save objections ──────────────────────────────────────
    try {
      if (geminiAnalysis.objections?.length > 0) {
        await saveObjections(dealId, geminiAnalysis.objections, '');
      }
    } catch (dbError) {
      console.warn('⚠️ saveObjections failed (continuing):', dbError.message);
    }

    // ── Update deal health score ─────────────────────────────
    try {
      await updateDealHealthScore(dealId, healthResult.totalScore, undefined);
    } catch (dbError) {
      console.warn('⚠️ updateDealHealthScore failed (continuing):', dbError.message);
    }

    res.json({
      meetingId,
      dealId,
      healthScore:    healthResult.totalScore,
      healthLabel:    healthResult.label,
      geminiAnalysis,
      scoreBreakdown: healthResult.breakdown
    });

  } catch (error) {
    console.error('❌ Analyze error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analyze/followup
router.post('/followup', async (req, res) => {
  try {
    const {
      dealId          = null,
      meetingId       = null,
      clientName,
      clientCompany   = '',
      healthScore,
      objections      = [],
      commitmentSignals = [],
      nextBestAction  = '',
      geminiAnalysis  = null
    } = req.body;

    if (!clientName && !geminiAnalysis) {
      return res.status(400).json({ error: 'clientName or geminiAnalysis is required' });
    }

    const resolvedObjections = objections.length > 0 ? objections : geminiAnalysis?.objections || [];
    const resolvedSignals    = commitmentSignals.length > 0 ? commitmentSignals : geminiAnalysis?.commitmentSignals || [];
    const resolvedNextAction = nextBestAction || geminiAnalysis?.nextBestAction || '';

    const followUp = await generateFollowUp({
      clientName:       clientName || 'Valued Client',
      clientCompany,
      healthScore,
      objections:       resolvedObjections,
      commitmentSignals: resolvedSignals,
      nextBestAction:   resolvedNextAction
    });

    try {
      await saveFollowUp({
        dealId:       dealId || 'unknown',
        meetingId:    meetingId || null,
        emailSubject: followUp.subject || '',
        emailBody:    followUp.body || ''
      });
    } catch (dbError) {
      console.warn('⚠️ saveFollowUp failed (continuing):', dbError.message);
    }

    res.json({
      subject: followUp.subject,
      body:    followUp.body,
      email:   { subject: followUp.subject, body: followUp.body }
    });

  } catch (error) {
    console.error('❌ Follow-up error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;