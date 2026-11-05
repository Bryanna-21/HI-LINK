import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';

import type { AssignmentAttachment, Submission } from '../../src/models/campus';
import { getActiveUserId } from '../../src/storage/accountScope';
import {
  displayState,
  getAssignment,
  STATE_LABELS,
  getMySubmission,
  getSubmissionsForAssignment,
  isOverdue,
  returnSubmission,
  saveDraft,
  submitAssignment,
} from '../../src/storage/assignments';
import { getUsers } from '../../src/storage/users';
import { useLoad } from '../../src/hooks/useLoad';
import { ThemeColors, useTheme } from '../../src/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  ScreenHeader,
  SectionTitle,
} from '../../src/components/ui';

export default function AssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const [userId, assignment] = await Promise.all([getActiveUserId(), getAssignment(id)]);

    if (!assignment || !userId) {
      return null;
    }

    const isTeacher = assignment.teacherId === userId;
    const [mine, all, users] = await Promise.all([
      getMySubmission(assignment.id),
      isTeacher ? getSubmissionsForAssignment(userId, assignment.id) : Promise.resolve([] as Submission[]),
      getUsers(),
    ]);

    return { userId, assignment, isTeacher, mine, all, users };
  }, [id]);

  // Seed the editor once from any saved draft/submission.
  useEffect(() => {
    if (data?.mine && !loaded) {
      setText(data.mine.text ?? '');
      setAttachments(data.mine.attachments);
      setLoaded(true);
    }
  }, [data, loaded]);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      setAttachments((current) => [...current, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType }]);
    }
  }

  async function run(task: () => Promise<unknown>, success?: string) {
    setBusy(true);

    try {
      await task();
      await reload();

      if (success) {
        Alert.alert(success);
      }
    } catch (caught) {
      Alert.alert('Could not complete', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  const assignment = data?.assignment;
  const state = displayState(data?.mine ?? null);
  const editable = state === 'not_started' || state === 'in_progress';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Assignment" />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data || !assignment ? (
          <EmptyState icon="document-text-outline" title="Assignment unavailable" body="It may have been removed." />
        ) : (
          <>
            <Card>
              <Text style={styles.title}>{assignment.title}</Text>
              <Text style={styles.meta}>{assignment.subjectName}</Text>
              {assignment.dueAt ? (
                <Text style={[styles.due, isOverdue(assignment) && { color: colors.danger }]}>
                  Due {new Date(assignment.dueAt).toLocaleString()}
                  {isOverdue(assignment) ? ' (overdue)' : ''}
                </Text>
              ) : null}
              {assignment.maxScore ? <Text style={styles.meta}>Out of {assignment.maxScore}</Text> : null}
              <Text style={styles.body}>{assignment.instructions || 'No written instructions.'}</Text>

              {assignment.attachments.map((file) => (
                <Button
                  key={file.uri}
                  label={file.name ?? 'Attachment'}
                  variant="secondary"
                  icon="attach-outline"
                  onPress={() => Linking.openURL(file.uri)}
                />
              ))}
            </Card>

            {data.isTeacher ? (
              <>
                <SectionTitle>Submissions ({data.all.length})</SectionTitle>
                {data.all.length === 0 ? (
                  <EmptyState icon="people-outline" title="Nothing handed in yet" />
                ) : (
                  data.all.map((submission) => (
                    <GradeCard
                      key={submission.id}
                      submission={submission}
                      studentName={data.users.find((user) => user.id === submission.studentId)?.name ?? 'Student'}
                      maxScore={assignment.maxScore}
                      busy={busy}
                      onReturn={(feedback, score, complete) =>
                        run(() => returnSubmission(data.userId, submission.id, { feedback, score, complete }))
                      }
                    />
                  ))
                )}
              </>
            ) : (
              <>
                <View style={styles.stateRow}>
                  <Text style={styles.label}>Your status</Text>
                  <Badge
                    label={STATE_LABELS[state]}
                    tone={state === 'late' ? 'danger' : state === 'returned' || state === 'completed' ? 'blue' : 'accent'}
                  />
                </View>

                {data.mine?.feedback ? (
                  <Card style={{ borderColor: colors.blue }}>
                    <Text style={styles.label}>Teacher feedback</Text>
                    <Text style={styles.body}>{data.mine.feedback}</Text>
                    {data.mine.score !== undefined ? (
                      <Text style={styles.due}>
                        Score: {data.mine.score}
                        {assignment.maxScore ? ` / ${assignment.maxScore}` : ''}
                      </Text>
                    ) : null}
                  </Card>
                ) : null}

                {editable ? (
                  <>
                    <Field label="Your answer" value={text} onChangeText={setText} multiline />

                    {attachments.map((file, index) => (
                      <Text key={`${file.uri}-${index}`} style={styles.meta}>
                        📎 {file.name ?? 'Attachment'}
                      </Text>
                    ))}

                    <View style={styles.actions}>
                      <Button label="Attach file" variant="secondary" icon="attach-outline" onPress={pickFile} />
                      <Button
                        label="Save draft"
                        variant="secondary"
                        onPress={() => run(() => saveDraft(assignment.id, { text, attachments }), 'Draft saved on this device')}
                        loading={busy}
                      />
                      <Button
                        label="Hand in"
                        onPress={() =>
                          Alert.alert('Hand in', 'You cannot edit after handing in. Continue?', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Hand in',
                              onPress: () =>
                                run(
                                  () => submitAssignment(assignment.id, { text, attachments }),
                                  'Saved. Your work is stored on this device and queued for your teacher.',
                                ),
                            },
                          ])
                        }
                        loading={busy}
                        disabled={!text.trim() && attachments.length === 0}
                      />
                    </View>
                  </>
                ) : (
                  <Card>
                    <Text style={styles.label}>Your submission</Text>
                    <Text style={styles.body}>{data.mine?.text || 'Attachment only.'}</Text>
                    {data.mine?.attachments.map((file) => (
                      <Text key={file.uri} style={styles.meta}>
                        📎 {file.name ?? 'Attachment'}
                      </Text>
                    ))}
                    {data.mine?.submittedAt ? (
                      <Text style={styles.meta}>Handed in {new Date(data.mine.submittedAt).toLocaleString()}</Text>
                    ) : null}
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function GradeCard({
  submission,
  studentName,
  maxScore,
  busy,
  onReturn,
}: {
  submission: Submission;
  studentName: string;
  maxScore?: number;
  busy: boolean;
  onReturn: (feedback: string, score: number | undefined, complete: boolean) => void;
}) {
  const { colors } = useTheme();
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [score, setScore] = useState(submission.score !== undefined ? String(submission.score) : '');

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, color: colors.text, fontWeight: '800' }}>{studentName}</Text>
        <Badge label={STATE_LABELS[displayState(submission)]} />
      </View>
      <Text style={{ color: colors.textSecondary, marginVertical: 8 }}>{submission.text || 'Attachment only.'}</Text>
      {submission.attachments.map((file) => (
        <Text key={file.uri} style={{ color: colors.muted, fontSize: 12 }}>
          📎 {file.name ?? 'Attachment'}
        </Text>
      ))}
      <Field label="Feedback" value={feedback} onChangeText={setFeedback} multiline />
      <Field label={`Score${maxScore ? ` (out of ${maxScore})` : ''}`} value={score} onChangeText={setScore} keyboardType="numeric" />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          label="Return"
          variant="secondary"
          disabled={busy}
          onPress={() => onReturn(feedback, score.trim() ? Number(score) : undefined, false)}
        />
        <Button
          label="Mark completed"
          disabled={busy}
          onPress={() => onReturn(feedback, score.trim() ? Number(score) : undefined, true)}
        />
      </View>
    </Card>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 90 },
    title: { color: colors.text, fontSize: 20, fontWeight: '900' },
    meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
    due: { color: colors.accent, fontWeight: '700', marginTop: 8 },
    body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 10 },
    label: { color: colors.textSecondary, fontWeight: '800', fontSize: 13 },
    stateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
    actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 8 },
  });
