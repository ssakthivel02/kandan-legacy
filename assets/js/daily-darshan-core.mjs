export const PERIODS = Object.freeze(['morning', 'evening']);
export const HISTORY_LIMIT = 124;
export const EXPORT_SCHEMA = 'osb-daily-darshan-history-v1';

const clean = (value, maximum = 100) =>
  String(value ?? '').trim().slice(0, maximum);

export const localDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const localDayOrdinal = (value = new Date()) => {
  const key = localDateKey(value);
  if (!key) return 0;
  const [year, month, day] = key.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
};

export const chooseDailyRecord = (records, value = new Date()) => {
  const available = Array.isArray(records)
    ? records.filter(item => item && typeof item === 'object' && item.id)
    : [];
  if (!available.length) return null;
  const index = ((localDayOrdinal(value) % available.length) + available.length) %
    available.length;
  return available[index];
};

export const normalisePeriod = value =>
  PERIODS.includes(String(value)) ? String(value) : PERIODS[0];

export const sanitiseCompletion = (value, allowedRecordIds = []) => {
  if (!value || typeof value !== 'object') return null;
  const allowed = new Set(allowedRecordIds.map(String));
  const dateKey = clean(value.dateKey, 10);
  const recordId = clean(value.recordId, 80);
  const period = normalisePeriod(value.period);
  const completedAtRaw = clean(value.completedAt, 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || !allowed.has(recordId)) {
    return null;
  }
  if (!completedAtRaw || Number.isNaN(Date.parse(completedAtRaw))) return null;
  const completedAt = new Date(completedAtRaw).toISOString();
  return {dateKey, recordId, period, completedAt};
};

export const sanitiseHistory = (
  value,
  allowedRecordIds = [],
  maximum = HISTORY_LIMIT
) => {
  const records = [];
  const seen = new Set();
  for (const item of Array.isArray(value) ? value : []) {
    const completion = sanitiseCompletion(item, allowedRecordIds);
    if (!completion) continue;
    const identity = `${completion.dateKey}|${completion.period}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    records.push(completion);
  }
  return records
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, Math.max(1, Number(maximum) || HISTORY_LIMIT));
};

export const distinctPracticeDays = history =>
  new Set((Array.isArray(history) ? history : []).map(item => item.dateKey)).size;

export const buildHistoryExport = (history, allowedRecordIds = []) => ({
  schema: EXPORT_SCHEMA,
  exportedAt: new Date().toISOString(),
  containsSacredText: false,
  containsPersonalNotes: false,
  privacy: 'Browser-local daily-practice completion metadata only',
  completions: sanitiseHistory(history, allowedRecordIds)
});

export const buildShareText = ({dateKey, period, record} = {}) => {
  if (!record?.id) return '';
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))
    ? String(dateKey)
    : '';
  const safePeriod = normalisePeriod(period);
  return [
    'Om Saravana Bhava · Daily Murugan Darshan',
    safeDate,
    `${record.templeNameEn} · ${record.themeEn}`,
    `${safePeriod === 'morning' ? 'Morning' : 'Evening'} practice`,
    'https://omsaravanabhava.org/daily.html'
  ].filter(Boolean).join('\n');
};
