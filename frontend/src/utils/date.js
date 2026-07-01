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
