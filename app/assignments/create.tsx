import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { getActiveUserId } from '../../src/storage/accountScope';
import { createAssignment } from '../../src/storage/assignments';
import { getInstitutions } from '../../src/storage/institutions';
import { getStaffScope } from '../../src/storage/roles';
import { useLoad } from '../../src/hooks/useLoad';
import { parseLocalDateTime } from '../../src/utils/datetime';
import { ThemeColors, useTheme } from '../../src/theme/ThemeProvider';
import { Button, Chip, EmptyState, Field, LoadingState, ScreenHeader, SectionTitle } from '../../src/components/ui';

export default function CreateAssignmentScreen() {
  const { communityId } = useLocalSearchParams<{ communityId?: string }>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [subject, setSubject] = useState('');
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [form, setForm] = useState('');
  const [stream, setStream] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [maxScore, setMaxScore] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading } = useLoad(async () => {
    const userId = await getActiveUserId();
    const [scope, institutions] = await Promise.all([getStaffScope(userId), getInstitutions()]);

    return {
      userId,
      institutions: institutions.filter((item) => scope.all || scope.institutionIds.includes(item.id)),
    };
  });

  async function save() {
    if (!data?.userId) {
      return;
    }

    const due = dueDate.trim() ? parseLocalDateTime(dueDate, dueTime) : null;

    if (dueDate.trim() && !due) {
      Alert.alert('Check the deadline', 'Use a real date like 2026-11-20 and a time like 23:59.');
      return;
    }

    const score = maxScore.trim() ? Number(maxScore) : undefined;

    if (score !== undefined && (Number.isNaN(score) || score <= 0)) {
      Alert.alert('Check the maximum score', 'Enter a number greater than zero.');
      return;
    }

    setBusy(true);

    try {
      const assignment = await createAssignment(data.userId, {
        title,
        instructions,
        subjectName: subject,
        institutionId: communityId ? undefined : institutionId ?? undefined,
        communityId: communityId || undefined,
        form: form.trim() || undefined,
        stream: stream.trim() || undefined,
        dueAt: due?.toISOString(),
        maxScore: score,
      });

      router.replace({ pathname: '/assignments/[id]', params: { id: assignment.id } });
    } catch (caught) {
      Alert.alert('Could not create assignment', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="New assignment" />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        {loading ? (
          <LoadingState />
        ) : !communityId && (data?.institutions.length ?? 0) === 0 ? (
          <EmptyState
            icon="lock-closed-outline"
            title="Teachers only"
            body="Only teachers and school administrators can set assignments for a class. A school admin can grant you the teacher role."
          />
        ) : (
          <>
            <Field label="Title" value={title} onChangeText={setTitle} />
            <Field label="Subject / unit" value={subject} onChangeText={setSubject} />
            <Field label="Instructions" value={instructions} onChangeText={setInstructions} multiline />

            {!communityId ? (
              <>
                <SectionTitle>Class</SectionTitle>
                <View style={styles.wrap}>
                  {data?.institutions.map((item) => (
                    <Chip key={item.id} label={item.name} selected={institutionId === item.id} onPress={() => setInstitutionId(item.id)} />
                  ))}
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Field label="Form / class" value={form} onChangeText={setForm} placeholder="Form 3" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Stream (optional)" value={stream} onChangeText={setStream} placeholder="North" />
                  </View>
                </View>
              </>
            ) : null}

            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Field label="Due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Time" value={dueTime} onChangeText={setDueTime} keyboardType="numbers-and-punctuation" />
              </View>
            </View>
            <Field label="Maximum score (optional)" value={maxScore} onChangeText={setMaxScore} keyboardType="numeric" />

            <Button
              label="Publish assignment"
              onPress={save}
              loading={busy}
              disabled={!title.trim() || !subject.trim() || (!communityId && (!institutionId || !form.trim()))}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 90 },
    row: { flexDirection: 'row', gap: 12 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  });
