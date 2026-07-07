// Pure lazy state-machine evaluation. Applies time-based transitions and returns
// { status, changed }. Caller persists if changed. No cron (Render free tier sleeps).
export function evaluateStatus(sub, cfg, now = new Date()) {
  const graceMs = (cfg.graceDays || 30) * 86400000;
  let status = sub.status;

  if (status === 'trial' && sub.trialEndsAt && now > sub.trialEndsAt) status = 'grace';
  if (status === 'active' && sub.currentPeriodEnd && now > sub.currentPeriodEnd) status = 'grace';
  if (status === 'grace') {
    const anchor = sub.currentPeriodEnd || sub.trialEndsAt;
    if (anchor && now > new Date(anchor.getTime() + graceMs)) status = 'expired';
  }

  return { status, changed: status !== sub.status };
}
