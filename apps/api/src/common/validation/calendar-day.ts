import { BadRequestException } from '@nestjs/common';

/**
 * A `YYYY-MM-DD` day as a DATE column value: a real calendar day from 1900 to
 * a year ahead. Anything else is rejected with `message`.
 */
export function parseCalendarDay(value: string, message: string): Date {
  const day = new Date(`${value}T00:00:00.000Z`);
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(day.getTime()) &&
    day.toISOString().slice(0, 10) === value &&
    day.getUTCFullYear() >= 1900 &&
    day.getTime() <= Date.now() + 366 * 86_400_000;
  if (!valid) throw new BadRequestException(message);
  return day;
}

/** A DATE column value back to `YYYY-MM-DD` (it is read as midnight UTC). */
export function formatCalendarDay(day: Date): string {
  return day.toISOString().slice(0, 10);
}
