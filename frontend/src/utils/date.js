// All date math is pinned to Eastern time so it matches the user's clock
// regardless of the device or server timezone (avoids the UTC "next day"
// rollover after ~8pm ET).
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

export function daysInMonthET(d = new Date()) {
  const { year, month } = etParts(d);
  return new Date(year, month, 0).getDate();
}

export function daysLeftInMonthET(d = new Date()) {
  return daysInMonthET(d) - etParts(d).day + 1;
}

export function monthNameET(d = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'long' }).format(d);
}

// Date range + label for a month, `offset` from the current Eastern month
// (0 = this month, -1 = last month, etc.)
export function monthRangeET(offset = 0) {
  const { year, month } = etParts(); // month is 1-based
  let y = year;
  let m = month + offset;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  const pad = (n) => String(n).padStart(2, '0');
  const daysIn = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${pad(daysIn)}`,
    label: new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    year: y,
    month: m,
  };
}
