import type { TimetableEntry, Weekday } from '../models/campus';
import { createScopedCollection } from './collection';
import { getActiveUserId } from './accountScope';
import { notify } from './notifications';
import { generateId, nowIso } from '../utils/ids';

const entries = createScopedCollection<TimetableEntry>('timetable');

export const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const toMinutes = (time: string): number => {
  const match = TIME_PATTERN.exec(time);

  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
};

export const isValidTime = (time: string): boolean => TIME_PATTERN.test(time);

export async function getTimetable(): Promise<TimetableEntry[]> {
  return (await entries.list()).sort(
    (a, b) => a.day - b.day || toMinutes(a.start) - toMinutes(b.start),
  );
}

export function entriesForDay(
  all: TimetableEntry[],
  day: Weekday,
): TimetableEntry[] {
  return all
    .filter((entry) => entry.day === day)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}

/** Entries that overlap `candidate` on the same day. */
export function findConflicts(
  all: TimetableEntry[],
  candidate: Pick<TimetableEntry, 'id' | 'day' | 'start' | 'end'>,
): TimetableEntry[] {
  const start = toMinutes(candidate.start);
  const end = toMinutes(candidate.end);

  return all.filter(
    (entry) =>
      entry.id !== candidate.id &&
      entry.day === candidate.day &&
      toMinutes(entry.start) < end &&
      toMinutes(entry.end) > start,
  );
}

/** Gaps between lessons on a day (empty periods), in minutes of the day. */
export function emptyPeriods(
  all: TimetableEntry[],
  day: Weekday,
  minimumMinutes = 20,
): { start: string; end: string }[] {
  const lessons = entriesForDay(all, day);
  const gaps: { start: string; end: string }[] = [];
  const format = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

  for (let index = 0; index < lessons.length - 1; index += 1) {
    const gapStart = toMinutes(lessons[index].end);
    const gapEnd = toMinutes(lessons[index + 1].start);

    if (gapEnd - gapStart >= minimumMinutes) {
      gaps.push({ start: format(gapStart), end: format(gapEnd) });
    }
  }

  return gaps;
}

export interface UpcomingClass {
  entry: TimetableEntry;
  startsAt: Date;
}

/** The next lesson at or after `now`, looking up to a week ahead. */
export function nextClass(
  all: TimetableEntry[],
  now = new Date(),
): UpcomingClass | null {
  let best: UpcomingClass | null = null;

  for (const entry of all) {
    const startMinutes = toMinutes(entry.start);

    if (Number.isNaN(startMinutes)) {
      continue;
    }

    const date = new Date(now);
    const offset = (entry.day - now.getDay() + 7) % 7;

    date.setDate(now.getDate() + offset);
    date.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

    if (date.getTime() < now.getTime()) {
      date.setDate(date.getDate() + 7);
    }

    if (!best || date.getTime() < best.startsAt.getTime()) {
      best = { entry, startsAt: date };
    }
  }

  return best;
}

export type TimetableInput = Pick<
  TimetableEntry,
  'day' | 'start' | 'end' | 'subject' | 'subjectId' | 'teacher' | 'room'
>;

export async function saveTimetableEntry(
  input: TimetableInput,
  existingId?: string,
): Promise<TimetableEntry> {
  const ownerId = await getActiveUserId();

  if (!ownerId) {
    throw new Error('Sign in to edit your timetable.');
  }

  if (!input.subject.trim()) {
    throw new Error('Choose or type a subject.');
  }

  if (!isValidTime(input.start) || !isValidTime(input.end)) {
    throw new Error('Use 24-hour times like 08:00.');
  }

  if (toMinutes(input.end) <= toMinutes(input.start)) {
    throw new Error('A lesson must end after it starts.');
  }

  const previous = existingId ? await entries.get(existingId) : null;
  const now = nowIso();

  const entry: TimetableEntry = {
    id: existingId ?? generateId('lesson'),
    ownerId,
    day: input.day,
    start: input.start,
    end: input.end,
    subject: input.subject.trim(),
    subjectId: input.subjectId,
    teacher: input.teacher?.trim() || undefined,
    room: input.room?.trim() || undefined,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };

  await entries.upsert(entry);

  return entry;
}

export async function deleteTimetableEntry(id: string): Promise<void> {
  await entries.remove(id);
}

/**
 * Creates a reminder notification for a lesson starting within
 * `leadMinutes`. Surfaces when the app is opened (no background wake-ups).
 */
export async function syncTimetableReminders(
  now = new Date(),
  leadMinutes = 30,
): Promise<void> {
  const userId = await getActiveUserId();

  if (!userId) {
    return;
  }

  const upcoming = nextClass(await entries.list(), now);

  if (!upcoming) {
    return;
  }

  const minutesAway = (upcoming.startsAt.getTime() - now.getTime()) / 60_000;

  if (minutesAway > leadMinutes) {
    return;
  }

  const { entry, startsAt } = upcoming;

  await notify({
    recipientId: userId,
    type: 'timetable',
    title: `${entry.subject} at ${entry.start}`,
    body: entry.room ? `Room: ${entry.room}` : undefined,
    entityType: 'timetable',
    entityId: entry.id,
    dedupeKey: `lesson:${entry.id}:${startsAt.toDateString()}`,
    route: { pathname: '/timetable' },
  });
}
