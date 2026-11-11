export function localDateInputValue(date = new Date()): string {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

export function formatLocalDate(dateValue: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }): string {
  return new Intl.DateTimeFormat('es', options).format(new Date(`${dateValue}T12:00:00`));
}
