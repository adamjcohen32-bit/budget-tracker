// All date math is pinned to Eastern time so it matches the user's clock
// regardless of the server timezone (Render runs in UTC, which rolls to the
// next day after ~8pm ET).
const TZ = 'America/New_York';

// "YYYY-MM-DD" for the given date in Eastern time
export function todayET(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// { year, month (1-based), day } in Eastern time
export function etParts(d = new Date()) {
  const [year, month, day] = todayET(d).split('-').map(Number);
  return { year, month, day };
}

// First day of the current Eastern month, "YYYY-MM-01"
export function monthStartET(d = new Date()) {
  const { year, month } = etParts(d);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

export function daysInMonthET(d = new Date()) {
  const { year, month } = etParts(d);
  return new Date(year, month, 0).getDate();
}

// "YYYY-MM" for the current Eastern month
export function monthYearET(d = new Date()) {
  const { year, month } = etParts(d);
  return `${year}-${String(month).padStart(2, '0')}`;
}
