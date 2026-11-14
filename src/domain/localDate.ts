export function localDateInputValue(date = new Date()): string {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

export function utcDateInputValue(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function shiftUtcDate(dateValue: string, dayOffset: number): string {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

export function utcWeekInputValues(dateValue: string): string[] {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => shiftUtcDate(date.toISOString().slice(0, 10), index));
}

export function formatLocalDate(dateValue: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }): string {
  return new Intl.DateTimeFormat('es', options).format(new Date(`${dateValue}T12:00:00`));
}
