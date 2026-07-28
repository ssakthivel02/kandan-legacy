export const ALLOWED_TARGETS = Object.freeze([6, 12, 27, 54, 108]);
export const HISTORY_LIMIT = 108;
export const EXPORT_SCHEMA = 'osb-mantra-practice-history-v1';

const cleanText = (value, maximum = 120) =>
  String(value ?? '').trim().slice(0, maximum);

export const normaliseTarget = value => {
  const target = Number(value);
  return ALLOWED_TARGETS.includes(target) ? target : ALLOWED_TARGETS[0];
};

export const normaliseCount = (value, target) => {
  const boundedTarget = normaliseTarget(target);
  const count = Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 0;
  return Math.max(0, Math.min(boundedTarget, count));
};

export const sanitiseSession = (value, allowedMantraIds = []) => {
  if (!value || typeof value !== 'object') return null;
  const allowed = new Set(allowedMantraIds.map(String));
  const mantraId = cleanText(value.mantraId, 80);
  if (!allowed.has(mantraId)) return null;
  const target = normaliseTarget(value.target);
  const count = normaliseCount(value.count, target);
  const rawCompletedAt = cleanText(value.completedAt, 40);
  const completedAt = rawCompletedAt && !Number.isNaN(Date.parse(rawCompletedAt))
    ? new Date(rawCompletedAt).toISOString()
    : '';
  if (count !== target || !completedAt) return null;
  return {mantraId, target, count: target, completedAt};
};

export const sanitiseHistory = (
  value,
  allowedMantraIds = [],
  maximum = HISTORY_LIMIT
) => {
  const sessions = [];
  const seen = new Set();
  for (const item of Array.isArray(value) ? value : []) {
    const session = sanitiseSession(item, allowedMantraIds);
    if (!session) continue;
    const identity = `${session.mantraId}|${session.target}|${session.completedAt}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    sessions.push(session);
  }
  return sessions
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, Math.max(1, Number(maximum) || HISTORY_LIMIT));
};

export const buildHistoryExport = (history, allowedMantraIds = []) => ({
  schema: EXPORT_SCHEMA,
  exportedAt: new Date().toISOString(),
  containsSacredText: false,
  privacy: 'Browser-local session metadata only',
  sessions: sanitiseHistory(history, allowedMantraIds)
});
