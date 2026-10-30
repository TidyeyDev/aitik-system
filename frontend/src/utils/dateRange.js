// Turns "YYYY-MM-DD" inputs into ISO bounds in the viewer's timezone.
// `to` is the start of the next day, so the chosen last day is fully included.
export function dateRange(from, to) {
  const range = {};
  if (from) range.from = new Date(`${from}T00:00`).toISOString();
  if (to) {
    const end = new Date(`${to}T00:00`);
    end.setDate(end.getDate() + 1);
    range.to = end.toISOString();
  }
  return range;
}

export const isValidRange = (from, to) => !from || !to || from <= to;

// Local calendar day as "YYYY-MM-DD"
export function dayKey(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const parseDay = (key) => new Date(`${key}T00:00`);

// The key if it's a real date, otherwise null (values can come from a shared URL)
export function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return null;
  const date = parseDay(value);
  return !Number.isNaN(date.getTime()) && dayKey(date) === value ? value : null;
}
