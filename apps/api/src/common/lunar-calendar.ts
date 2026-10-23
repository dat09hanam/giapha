/**
 * The Vietnamese lunar calendar (âm lịch), computed for UTC+7 with Hồ Ngọc Đức's astronomical
 * algorithm: months start on the new moon day, month 11 holds the winter solstice, and a 13-month
 * year repeats the first month without a major solar term. Valid roughly for 1800–2199.
 */

const TIME_ZONE = 7;
const SYNODIC_MONTH = 29.530588853;
const REFERENCE_NEW_MOON = 2415021.076998695;

export type SolarDay = { year: number; month: number; day: number };
export type LunarDay = { year: number; month: number; day: number; leap: boolean };

/** Julian day number of a Gregorian date. */
function julianDay({ year, month, day }: SolarDay): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function fromJulianDay(jd: number): SolarDay {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

/** Julian day (fractional, UTC) of the k-th new moon after 1900-01-01. */
function newMoon(k: number): number {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const dr = Math.PI / 180;
  let jd = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3;
  jd += 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);
  const m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  const mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
  let c1 = (0.1734 - 0.000393 * t) * Math.sin(m * dr) + 0.0021 * Math.sin(2 * dr * m);
  c1 = c1 - 0.4068 * Math.sin(mpr * dr) + 0.0161 * Math.sin(dr * 2 * mpr);
  c1 = c1 - 0.0004 * Math.sin(dr * 3 * mpr);
  c1 = c1 + 0.0104 * Math.sin(dr * 2 * f) - 0.0051 * Math.sin(dr * (m + mpr));
  c1 = c1 - 0.0074 * Math.sin(dr * (m - mpr)) + 0.0004 * Math.sin(dr * (2 * f + m));
  c1 = c1 - 0.0004 * Math.sin(dr * (2 * f - m)) - 0.0006 * Math.sin(dr * (2 * f + mpr));
  c1 = c1 + 0.001 * Math.sin(dr * (2 * f - mpr)) + 0.0005 * Math.sin(dr * (2 * mpr + m));
  const deltaT =
    t < -11
      ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
      : -0.000278 + 0.000265 * t + 0.000262 * t2;
  return jd + c1 - deltaT;
}

/** The sun's longitude at local midnight, as one of 12 sectors (0 = vernal equinox). */
function sunSector(dayNumber: number): number {
  const t = (dayNumber - 0.5 - TIME_ZONE / 24 - 2451545) / 36525;
  const t2 = t * t;
  const dr = Math.PI / 180;
  const m = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
  const l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
  let dl = (1.9146 - 0.004817 * t - 0.000014 * t2) * Math.sin(dr * m);
  dl += (0.019993 - 0.000101 * t) * Math.sin(dr * 2 * m) + 0.00029 * Math.sin(dr * 3 * m);
  let l = (l0 + dl) * dr;
  l -= Math.PI * 2 * Math.floor(l / (Math.PI * 2));
  return Math.floor((l / Math.PI) * 6);
}

function newMoonDay(k: number): number {
  return Math.floor(newMoon(k) + 0.5 + TIME_ZONE / 24);
}

/** Julian day the 11th lunar month (holding the winter solstice) of a solar year starts. */
function month11Start(year: number): number {
  const k = Math.floor((julianDay({ year, month: 12, day: 31 }) - 2415021) / SYNODIC_MONTH);
  const start = newMoonDay(k);
  return sunSector(start) >= 9 ? newMoonDay(k - 1) : start;
}

/** In a 13-month year, how many months after month 11 the leap month comes. */
function leapMonthOffset(month11: number): number {
  const k = Math.floor((month11 - REFERENCE_NEW_MOON) / SYNODIC_MONTH + 0.5);
  let index = 1;
  let sector = sunSector(newMoonDay(k + index));
  let last: number;
  do {
    last = sector;
    index += 1;
    sector = sunSector(newMoonDay(k + index));
  } while (sector !== last && index < 14);
  return index - 1;
}

export function toLunar(solar: SolarDay): LunarDay {
  const dayNumber = julianDay(solar);
  const k = Math.floor((dayNumber - REFERENCE_NEW_MOON) / SYNODIC_MONTH);
  let monthStart = newMoonDay(k + 1);
  if (monthStart > dayNumber) monthStart = newMoonDay(k);
  let a11 = month11Start(solar.year);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = solar.year;
    a11 = month11Start(solar.year - 1);
  } else {
    lunarYear = solar.year + 1;
    b11 = month11Start(solar.year + 1);
  }
  const diff = Math.floor((monthStart - a11) / 29);
  let leap = false;
  let month = diff + 11;
  if (b11 - a11 > 365) {
    const leapDiff = leapMonthOffset(a11);
    if (diff >= leapDiff) {
      month = diff + 10;
      leap = diff === leapDiff;
    }
  }
  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) lunarYear -= 1;
  return { year: lunarYear, month, day: dayNumber - monthStart + 1, leap };
}

/**
 * The solar date of a non-leap lunar day. A day past the month's end (the 30th of a 29-day month)
 * falls on its last day, as families keep the anniversary then.
 */
export function lunarToSolar(year: number, month: number, day: number): SolarDay {
  const [a11, b11] =
    month < 11
      ? [month11Start(year - 1), month11Start(year)]
      : [month11Start(year), month11Start(year + 1)];
  const k = Math.floor(0.5 + (a11 - REFERENCE_NEW_MOON) / SYNODIC_MONTH);
  let offset = month - 11;
  if (offset < 0) offset += 12;
  if (b11 - a11 > 365 && offset >= leapMonthOffset(a11)) offset += 1;
  const start = newMoonDay(k + offset);
  const length = newMoonDay(k + offset + 1) - start;
  return fromJulianDay(start + Math.min(day, length) - 1);
}

/** First days of the lunar months that touch a solar year, for drawing lunar days on a calendar. */
export function lunarMonthStarts(solarYear: number): Array<SolarDay & { lunar: LunarDay }> {
  const first = julianDay({ year: solarYear, month: 1, day: 1 });
  const last = julianDay({ year: solarYear, month: 12, day: 31 });
  const starts: Array<SolarDay & { lunar: LunarDay }> = [];
  for (let k = Math.floor((first - REFERENCE_NEW_MOON) / SYNODIC_MONTH) - 1; ; k += 1) {
    const start = newMoonDay(k);
    if (start > last) break;
    const next = newMoonDay(k + 1);
    if (next <= first) continue;
    const solar = fromJulianDay(start);
    starts.push({ ...solar, lunar: toLunar(solar) });
  }
  return starts;
}

export function isoDay({ year, month, day }: SolarDay): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Whole days from one solar date to another. */
export function daysBetween(from: SolarDay, to: SolarDay): number {
  return julianDay(to) - julianDay(from);
}

/** The hour of the day (0–23) in Việt Nam. */
export function hourInVietnam(now: Date = new Date()): number {
  return new Date(now.getTime() + TIME_ZONE * 3_600_000).getUTCHours();
}

/** Milliseconds until the next time the clock in Việt Nam shows `hour`:00. */
export function msUntilVietnamHour(hour: number, now: Date = new Date()): number {
  const local = new Date(now.getTime() + TIME_ZONE * 3_600_000);
  let target =
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour) -
    TIME_ZONE * 3_600_000;
  if (target <= now.getTime()) target += 86_400_000;
  return target - now.getTime();
}

/** Today's date in Việt Nam (UTC+7). */
export function todayInVietnam(now: Date = new Date()): SolarDay {
  const local = new Date(now.getTime() + TIME_ZONE * 3_600_000);
  return { year: local.getUTCFullYear(), month: local.getUTCMonth() + 1, day: local.getUTCDate() };
}
