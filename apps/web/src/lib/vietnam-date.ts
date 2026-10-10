export function todayInVietnam(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

export function formatDay(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : day;
}

export type CalendarDay = { year: number; month: number; day: number };

export function parseDay(value: string): CalendarDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const day = { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
  return toIsoDay(day) === value ? day : null;
}

export function toIsoDay({ year, month, day }: CalendarDay): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

export function mondayIndex(year: number, month: number, day: number): number {
  return (new Date(Date.UTC(year, month, day)).getUTCDay() + 6) % 7;
}
