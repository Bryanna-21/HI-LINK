import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Report, ReportStatus } from '../src/models/campus';
import { getActiveUserId } from '../src/storage/accountScope';
import { getComments } from '../src/storage/comments';
import {
  getReportsForReview,
  removeReportedContent,
  REPORT_REASONS,
  setReportStatus,
} from '../src/storage/moderation';
import { getPosts } from '../src/storage/posts';
import { getUsers } from '../src/storage/users';
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
} from '../src/components/ui';

const STATUSES: ReportStatus[] = ['pending', 'reviewing', 'resolved', 'dismissed'];

export default function ModerationScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data, loading, error, reload } = useLoad(async () => {
    const [userId, reports, users, posts, comments] = await Promise.all([
      getActiveUserId(),
      getReportsForReview(),
      getUsers(),
      getPosts(),
      getComments(),
    ]);

    return { userId, reports, users, posts, comments };
  });

  function preview(report: Report): string {
    if (!data) return '';

    if (report.targetType === 'post' || report.targetType === 'media') {
      const post = data.posts.find((item) => item.id === report.targetId);

      return post ? post.text || `[${post.type} post]` : 'This post has been removed.';
    }

    if (report.targetType === 'comment') {
      return data.comments.find((item) => item.id === report.targetId)?.text ?? 'This comment has been removed.';
    }

    if (report.targetType === 'account') {
      const user = data.users.find((item) => item.id === report.targetId);

      return user ? `${user.name} (@${user.username})` : 'Unknown account';
    }

    return report.targetType === 'community' ? 'Community report' : 'Message report';
  }

  async function act(task: () => Promise<void>) {
    try {
      await task();
      await reload();
    } catch (caught) {
      Alert.alert('Could not update report', caught instanceof Error ? caught.message : 'Try again.');
    }
  }

  const rows = (data?.reports ?? []).filter((report) => filter === 'all' || report.status === filter);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Reports" subtitle="Only reports in your scope are shown" />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
          {STATUSES.map((status) => (
            <Chip key={status} label={status} selected={filter === status} onPress={() => setFilter(status)} />
          ))}
        </ScrollView>

        {loading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState message={error ?? 'Could not load reports.'} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title="No reports"
            body="You only see reports for communities you administer, your school (if you are its administrator), or the whole system (system staff)."
          />
        ) : (
          rows.map((report) => {
            const reporter = data.users.find((user) => user.id === report.reporterId);
            const removable = report.targetType === 'post' || report.targetType === 'media' || report.targetType === 'comment';
            const closed = report.status === 'resolved' || report.status === 'dismissed';

            return (
              <Card key={report.id}>
                <View style={styles.top}>
                  <Text style={styles.title}>
                    {report.targetType} · {REPORT_REASONS.find((item) => item.value === report.reason)?.label}
                  </Text>
                  <Badge
                    label={report.status}
                    tone={report.status === 'pending' ? 'orange' : report.status === 'resolved' ? 'accent' : 'blue'}
                  />
                </View>
                <Text style={styles.preview}>{preview(report)}</Text>
                {report.description ? <Text style={styles.meta}>“{report.description}”</Text> : null}
                <Text style={styles.meta}>
                  Reported by {reporter?.name ?? 'a student'} · {new Date(report.createdAt).toLocaleString()}
                </Text>
                {report.resolutionNote ? <Text style={styles.meta}>Note: {report.resolutionNote}</Text> : null}

                {!closed ? (
                  <>
                    <Field
                      label="Note to record (optional)"
                      value={notes[report.id] ?? ''}
                      onChangeText={(value) => setNotes((current) => ({ ...current, [report.id]: value }))}
                    />
                    <View style={styles.actions}>
                      {report.status === 'pending' ? (
                        <Button
                          label="Start review"
                          variant="secondary"
                          onPress={() => act(() => setReportStatus(data.userId as string, report.id, 'reviewing'))}
                        />
                      ) : null}
                      {removable ? (
                        <Button
                          label="Remove content"
                          variant="danger"
                          onPress={() =>
                            Alert.alert('Remove content', 'The content, and its comments and reactions, will be deleted.', [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: () => act(() => removeReportedContent(data.userId as string, report.id, notes[report.id])),
                              },
                            ])
                          }
                        />
                      ) : null}
                      <Button
                        label="Resolve"
                        onPress={() => act(() => setReportStatus(data.userId as string, report.id, 'resolved', notes[report.id]))}
                      />
                      <Button
                        label="Dismiss"
                        variant="secondary"
                        onPress={() => act(() => setReportStatus(data.userId as string, report.id, 'dismissed', notes[report.id]))}
                      />
                    </View>
                  </>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 90 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '800', textTransform: 'capitalize' },
    preview: { color: colors.textSecondary, marginTop: 10, lineHeight: 20 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 6 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  });
