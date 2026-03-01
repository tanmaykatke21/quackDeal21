const snowflake = require('./snowflakeService');

// ── Priority escalation for high-value deals ─────────────────
const HIGH_VALUE_THRESHOLD = 200000;

const escalatePriority = (priority, dealValue) => {
  if (dealValue < HIGH_VALUE_THRESHOLD) return priority;
  if (priority === 'normal') return 'high';
  if (priority === 'high') return 'urgent';
  return 'urgent';
};

// ── Days-without-contact threshold by health score ───────────
const getNoActivityThreshold = (healthScore) => {
  if (healthScore >= 70) return 7;
  if (healthScore >= 40) return 5;
  return 3;
};

// ── Stage stuck threshold in days ────────────────────────────
const STAGE_THRESHOLDS = {
  closing:     5,
  negotiation: 7,
  proposal:    10,
  discovery:   14,
};

const getStagePriority = (stage) => {
  if (stage === 'closing')     return 'urgent';
  if (stage === 'negotiation') return 'high';
  return 'normal';
};

// ── Main scanner ─────────────────────────────────────────────
const runReminderScan = async () => {
  console.log('🔔 Running reminder scan...');

  try {
    // Read queries can run in parallel — only writes need to be sequential
    const [activeDeals, scoreDrops, draftFollowUps, existingReminders] = await Promise.all([
      snowflake.getActiveDealsForReminders(),
      snowflake.getHealthScoreDrops(),
      snowflake.getDraftFollowUps(),
      snowflake.getExistingActiveReminders(),
    ]);

    // Build a set of already-active reminders to avoid duplicates
    const existingSet = new Set(
      existingReminders.map(r => `${r.DEAL_ID}:${r.TYPE}`)
    );

    const remindersToCreate = [];

    // ── 1. NO ACTIVITY reminders ────────────────────────────
    for (const deal of activeDeals) {
      const threshold = getNoActivityThreshold(deal.HEALTH_SCORE || 0);
      const daysSince = deal.DAYS_SINCE_MEETING ?? deal.DAYS_SINCE_UPDATE ?? 999;

      if (daysSince >= threshold) {
        const key = `${deal.DEAL_ID}:no_activity`;
        if (!existingSet.has(key)) {
          let priority = deal.HEALTH_SCORE >= 70 ? 'normal'
                       : deal.HEALTH_SCORE >= 40 ? 'high'
                       : 'urgent';
          priority = escalatePriority(priority, deal.DEAL_VALUE || 0);

          remindersToCreate.push({
            dealId:  deal.DEAL_ID,
            userId:  deal.USER_ID,
            type:    'no_activity',
            priority,
            message: `No contact with ${deal.CLIENT_NAME} (${deal.CLIENT_COMPANY}) in ${daysSince} day${daysSince !== 1 ? 's' : ''}. Health score is ${deal.HEALTH_SCORE}/100 — don't let this go cold.`,
          });
        }
      }
    }

    // ── 2. SCORE DROP reminders ─────────────────────────────
    for (const drop of scoreDrops) {
      const key = `${drop.DEAL_ID}:score_drop`;
      if (!existingSet.has(key)) {
        let priority = drop.DROP_AMOUNT >= 20 ? 'urgent' : 'high';
        priority = escalatePriority(priority, drop.DEAL_VALUE || 0);

        remindersToCreate.push({
          dealId:  drop.DEAL_ID,
          userId:  drop.USER_ID,
          type:    'score_drop',
          priority,
          message: `Health score for ${drop.CLIENT_NAME} (${drop.CLIENT_COMPANY}) dropped ${drop.DROP_AMOUNT} points to ${drop.CURRENT_SCORE}/100. Review objections and follow up immediately.`,
        });
      }
    }

    // ── 3. DRAFT FOLLOW-UP reminders ────────────────────────
    for (const fu of draftFollowUps) {
      const key = `${fu.DEAL_ID}:draft_followup`;
      if (!existingSet.has(key)) {
        let priority = fu.HOURS_PENDING >= 72 ? 'urgent' : 'high';
        priority = escalatePriority(priority, fu.DEAL_VALUE || 0);

        remindersToCreate.push({
          dealId:  fu.DEAL_ID,
          userId:  fu.USER_ID,
          type:    'draft_followup',
          priority,
          message: `Follow-up email "${fu.EMAIL_SUBJECT}" for ${fu.CLIENT_NAME} has been sitting as a draft for ${fu.HOURS_PENDING} hours. Send it before the deal goes cold.`,
        });
      }
    }

    // ── 4. STAGE STUCK reminders ────────────────────────────
    for (const deal of activeDeals) {
      const threshold = STAGE_THRESHOLDS[deal.STAGE?.toLowerCase()] || 14;
      const daysSince = deal.DAYS_SINCE_UPDATE ?? 0;

      if (daysSince >= threshold) {
        const key = `${deal.DEAL_ID}:stage_stuck`;
        if (!existingSet.has(key)) {
          let priority = getStagePriority(deal.STAGE?.toLowerCase());
          priority = escalatePriority(priority, deal.DEAL_VALUE || 0);

          remindersToCreate.push({
            dealId:  deal.DEAL_ID,
            userId:  deal.USER_ID,
            type:    'stage_stuck',
            priority,
            message: `${deal.CLIENT_NAME} (${deal.CLIENT_COMPANY}) has been stuck in "${deal.STAGE}" for ${daysSince} days. Take action to move this deal forward.`,
          });
        }
      }
    }

    if (remindersToCreate.length === 0) {
      console.log('✅ Reminder scan complete — no new reminders needed');
      return { created: 0 };
    }

    // ── Save sequentially to avoid Snowflake table lock contention ──
    let created = 0;
    for (const reminder of remindersToCreate) {
      try {
        await snowflake.saveReminder(reminder);
        created++;
      } catch (err) {
        console.warn(`⚠️ Failed to save reminder for deal ${reminder.dealId}:`, err.message);
      }
    }

    console.log(`✅ Reminder scan complete — created ${created}/${remindersToCreate.length} reminders`);
    return { created };

  } catch (err) {
    console.error('❌ Reminder scan failed:', err);
    throw err;
  }
};

module.exports = { runReminderScan };
