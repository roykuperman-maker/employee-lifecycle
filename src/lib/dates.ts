/**
 * All date math here operates on UTC calendar days. Dates are stored as
 * UTC-midnight timestamps (parsed from "YYYY-MM-DD" form inputs), so using
 * local-time Date methods (getDay/setFullYear/etc.) would shift the
 * effective calendar day by one on servers running behind UTC.
 */

function toUTCMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function subUTCDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy;
}

/**
 * Closest Thursday strictly before `date` (e.g. a Monday start date's prior
 * Thursday is 4 days earlier, not 7).
 */
export function thursdayBefore(date: Date): Date {
  const THURSDAY = 4;
  let d = subUTCDays(toUTCMidnight(date), 1);
  while (d.getUTCDay() !== THURSDAY) {
    d = subUTCDays(d, 1);
  }
  return d;
}

export function isToday(date: Date, today: Date): boolean {
  return toUTCMidnight(date).getTime() === toUTCMidnight(today).getTime();
}

export function addYears(date: Date, years: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCFullYear(copy.getUTCFullYear() + years);
  return copy;
}

/**
 * 0=Sunday, 3=Wednesday. Safe to compare directly against Israel weekdays
 * because the cron always fires at a fixed UTC instant that lands within the
 * same Israel calendar day (5am/8am UTC -> 8am/11am IDT).
 */
export function dayOfWeekUTC(date: Date): number {
  return date.getUTCDay();
}

export function daysBetweenUTC(from: Date, to: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((toUTCMidnight(to).getTime() - toUTCMidnight(from).getTime()) / MS_PER_DAY);
}
