/**
 * No native date-picker dependency is installed, so dates are entered as
 * "YYYY-MM-DD" and times as 24-hour "HH:MM". These helpers validate strictly
 * (including real calendar dates such as rejecting 2026-02-31).
 */

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function parseLocalDateTime(date: string, time: string): Date | null {
  const d = DATE.exec(date.trim());
  const t = TIME.exec(time.trim());

  if (!d || !t) {
    return null;
  }

  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const result = new Date(year, month - 1, day, Number(t[1]), Number(t[2]), 0, 0);

  const real =
    result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === day;

  return real ? result : null;
}

export const toDateInput = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const toTimeInput = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export function formatEventRange(startsAt: string, endsAt?: string): string {
  const start = new Date(startsAt);
  const day = start.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = (date: Date) => date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return endsAt ? `${day}, ${time(start)} – ${time(new Date(endsAt))}` : `${day}, ${time(start)}`;
}
