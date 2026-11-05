import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TimetableEntry, Weekday } from '../src/models/campus';
import { getAcademicStore } from '../src/storage/academic';
import {
  deleteTimetableEntry,
  emptyPeriods,
  entriesForDay,
  findConflicts,
  getTimetable,
  nextClass,
  saveTimetableEntry,
  WEEKDAYS,
} from '../src/storage/timetable';
import { useLoad } from '../src/hooks/useLoad';
import { ThemeColors, useTheme } from '../src/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  ScreenHeader,
  SectionTitle,
} from '../src/components/ui';

interface Draft {
  id?: string;
  day: Weekday;
  start: string;
  end: string;
  subject: string;
  teacher: string;
  room: string;
}

const blankDraft = (day: Weekday): Draft => ({ day, start: '08:00', end: '08:40', subject: '', teacher: '', room: '' });

export default function TimetableScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [day, setDay] = useState<Weekday>(new Date().getDay() as Weekday);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const [entries, academic] = await Promise.all([getTimetable(), getAcademicStore()]);

    return { entries, subjects: academic.subjects.map((subject) => subject.name) };
  });

  const entries = data?.entries ?? [];
  const upcoming = useMemo(() => nextClass(entries), [entries]);
  const dayEntries = entriesForDay(entries, day);
  const gaps = emptyPeriods(entries, day);

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();

    for (const entry of entries) {
      if (findConflicts(entries, entry).length > 0) {
        ids.add(entry.id);
      }
    }

    return ids;
  }, [entries]);

  async function save() {
    if (!draft) {
      return;
    }

    const overlaps = findConflicts(entries, { id: draft.id ?? '', day: draft.day, start: draft.start, end: draft.end });

    const commit = async () => {
      setBusy(true);

      try {
        await saveTimetableEntry(
          {
            day: draft.day,
            start: draft.start,
            end: draft.end,
            subject: draft.subject,
            teacher: draft.teacher,
            room: draft.room,
          },
          draft.id,
        );
        setDraft(null);
        await reload();
      } catch (caught) {
        Alert.alert('Could not save lesson', caught instanceof Error ? caught.message : 'Try again.');
      } finally {
        setBusy(false);
      }
    };

    if (overlaps.length > 0) {
      Alert.alert(
        'Clashes with another lesson',
        `This overlaps ${overlaps.map((entry) => `${entry.subject} (${entry.start}–${entry.end})`).join(', ')}.`,
        [
          { text: 'Edit time', style: 'cancel' },
          { text: 'Save anyway', onPress: commit },
        ],
      );

      return;
    }

    await commit();
  }

  function remove(entry: TimetableEntry) {
    Alert.alert('Delete lesson', `Remove ${entry.subject} on ${WEEKDAYS.find((d) => d.value === entry.day)?.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTimetableEntry(entry.id);
          await reload();
        },
      },
    ]);
  }

  function lessonCard(entry: TimetableEntry) {
    return (
      <Card
        key={entry.id}
        onPress={() =>
          setDraft({
            id: entry.id,
            day: entry.day,
            start: entry.start,
            end: entry.end,
            subject: entry.subject,
            teacher: entry.teacher ?? '',
            room: entry.room ?? '',
          })
        }
        accessibilityLabel={`${entry.subject}, ${entry.start} to ${entry.end}. Tap to edit`}
      >
        <View style={styles.top}>
          <Text style={styles.time}>
            {entry.start} – {entry.end}
          </Text>
          {conflictIds.has(entry.id) ? <Badge label="Clash" tone="danger" /> : null}
        </View>
        <Text style={styles.subject}>{entry.subject}</Text>
        <Text style={styles.meta}>
          {[entry.teacher, entry.room ? `Room ${entry.room}` : null].filter(Boolean).join(' · ') || 'No teacher or room set'}
        </Text>
        <Pressable onPress={() => remove(entry)} hitSlop={8} style={styles.delete} accessibilityRole="button" accessibilityLabel="Delete lesson">
          <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>Delete</Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Timetable"
        right={<Button label="Add" icon="add" onPress={() => setDraft(blankDraft(day))} />}
      />

      <ScrollView contentContainerStyle={styles.pad}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <>
            {upcoming ? (
              <Card style={{ borderColor: colors.accent }}>
                <Text style={styles.label}>Next class</Text>
                <Text style={styles.subject}>{upcoming.entry.subject}</Text>
                <Text style={styles.meta}>
                  {upcoming.startsAt.toLocaleDateString(undefined, { weekday: 'long' })} at {upcoming.entry.start}
                  {upcoming.entry.room ? ` · Room ${upcoming.entry.room}` : ''}
                </Text>
              </Card>
            ) : null}

            <View style={{ flexDirection: 'row' }}>
              <Chip label="Day" selected={view === 'day'} onPress={() => setView('day')} />
              <Chip label="Week" selected={view === 'week'} onPress={() => setView('week')} />
            </View>

            {view === 'day' ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {WEEKDAYS.map((item) => (
                    <Chip key={item.value} label={item.short} selected={day === item.value} onPress={() => setDay(item.value)} />
                  ))}
                </ScrollView>

                {dayEntries.length === 0 ? (
                  <EmptyState
                    icon="time-outline"
                    title="No lessons"
                    body="Nothing is scheduled for this day. Add your lessons to build your timetable."
                    action={<Button label="Add a lesson" onPress={() => setDraft(blankDraft(day))} />}
                  />
                ) : (
                  dayEntries.map(lessonCard)
                )}

                {gaps.length > 0 ? (
                  <>
                    <SectionTitle>Free periods</SectionTitle>
                    {gaps.map((gap) => (
                      <Text key={gap.start} style={styles.meta}>
                        {gap.start} – {gap.end}
                      </Text>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              WEEKDAYS.map((item) => {
                const lessons = entriesForDay(entries, item.value);

                return (
                  <View key={item.value}>
                    <SectionTitle>{item.label}</SectionTitle>
                    {lessons.length === 0 ? <Text style={styles.meta}>No lessons</Text> : lessons.map(lessonCard)}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={draft !== null} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>{draft?.id ? 'Edit lesson' : 'Add lesson'}</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {WEEKDAYS.map((item) => (
                  <Chip
                    key={item.value}
                    label={item.short}
                    selected={draft?.day === item.value}
                    onPress={() => setDraft((current) => (current ? { ...current, day: item.value } : current))}
                  />
                ))}
              </ScrollView>

              <Field
                label="Subject / unit"
                value={draft?.subject ?? ''}
                onChangeText={(subject) => setDraft((current) => (current ? { ...current, subject } : current))}
              />

              {(data?.subjects.length ?? 0) > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                  {data?.subjects.slice(0, 12).map((name) => (
                    <Chip
                      key={name}
                      label={name}
                      selected={draft?.subject === name}
                      onPress={() => setDraft((current) => (current ? { ...current, subject: name } : current))}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Starts"
                    value={draft?.start ?? ''}
                    onChangeText={(start) => setDraft((current) => (current ? { ...current, start } : current))}
                    placeholder="08:00"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Ends"
                    value={draft?.end ?? ''}
                    onChangeText={(end) => setDraft((current) => (current ? { ...current, end } : current))}
                    placeholder="08:40"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>

              <Field
                label="Teacher (optional)"
                value={draft?.teacher ?? ''}
                onChangeText={(teacher) => setDraft((current) => (current ? { ...current, teacher } : current))}
              />
              <Field
                label="Room (optional)"
                value={draft?.room ?? ''}
                onChangeText={(room) => setDraft((current) => (current ? { ...current, room } : current))}
              />

              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                <Button label="Cancel" variant="secondary" onPress={() => setDraft(null)} />
                <Button label="Save" onPress={save} loading={busy} disabled={!draft?.subject.trim()} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 90 },
    label: { color: colors.accent, fontSize: 12, fontWeight: '800', marginBottom: 4 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    time: { color: colors.accent, fontWeight: '800', fontSize: 13 },
    subject: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 4 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
    delete: { position: 'absolute', right: 14, bottom: 12 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      maxHeight: '85%',
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginBottom: 12 },
  });
