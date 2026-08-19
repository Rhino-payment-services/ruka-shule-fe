/** Calendar helpers for due dates (local browser timezone). */

export function startOfTomorrow(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return date;
}

export function isFutureDueDate(isoDate: string): boolean {
  if (!isoDate.trim()) return true;
  const selected = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(selected.getTime())) return false;
  selected.setHours(0, 0, 0, 0);
  return selected.getTime() >= startOfTomorrow().getTime();
}

/** Backend accepts YYYY-MM-DD; send RFC3339 so older builds still parse. */
export function dueDateToApi(isoDate: string): string {
  return `${isoDate}T00:00:00Z`;
}
