import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import type { AnnouncementAudience, AnnouncementPriority } from '../src/models/campus';
import { getActiveUserId } from '../src/storage/accountScope';
import {
  deleteAnnouncement,
  getMyAnnouncements,
  getReadAnnouncementIds,
  markAnnouncementRead,
  publishAnnouncement,
} from '../src/storage/announcements';
import { getInstitutions } from '../src/storage/institutions';
import { getStaffScope } from '../src/storage/roles';
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

export default function AnnouncementsScreen() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [form, setForm] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const userId = await getActiveUserId();
    const [items, read, scope, institutions, users] = await Promise.all([
      getMyAnnouncements(),
      getReadAnnouncementIds(),
      getStaffScope(userId),
      getInstitutions(),
      getUsers(),
    ]);

    const publishable = institutions.filter((item) => scope.all || scope.institutionIds.includes(item.id));

    return { userId, items, read, publishable, users };
  });

  async function open(id: string) {
    await markAnnouncementRead(id);
    await reload();
  }

  async function publish() {
    if (!data?.userId || !institutionId) {
      return;
    }

    const audience: AnnouncementAudience = form.trim()
      ? { kind: 'class', institutionId, form: form.trim() }
      : { kind: 'institution', institutionId };

    setBusy(true);

    try {
      await publishAnnouncement(data.userId, { title, body, priority, audience });
      setTitle('');
      setBody('');
      setForm('');
      setPriority('normal');
      setComposing(false);
      await reload();
    } catch (caught) {
      Alert.alert('Could not publish', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  const canPublish = (data?.publishable.length ?? 0) > 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Announcements" />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        {loading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState message={error ?? 'Could not load announcements.'} onRetry={reload} />
        ) : (
          <>
            {canPublish ? (
              composing ? (
                <Card>
                  <Field label="Title" value={title} onChangeText={setTitle} />
                  <Field label="Message" value={body} onChangeText={setBody} multiline />

                  <Text style={styles.label}>Audience</Text>
                  <View style={styles.wrap}>
                    {data.publishable.map((item) => (
                      <Chip
                        key={item.id}
                        label={item.name}
                        selected={institutionId === item.id}
                        onPress={() => setInstitutionId(item.id)}
                      />
                    ))}
                  </View>
                  <Field
                    label="Only this form/class (optional)"
                    value={form}
                    onChangeText={setForm}
                    placeholder="e.g. Form 3"
                    hint="Leave empty to send to the whole school."
                  />

                  <View style={styles.wrap}>
                    {(['normal', 'important', 'urgent'] as AnnouncementPriority[]).map((item) => (
                      <Chip key={item} label={item} selected={priority === item} onPress={() => setPriority(item)} />
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button label="Cancel" variant="secondary" onPress={() => setComposing(false)} />
                    <Button
                      label="Publish"
                      onPress={publish}
                      loading={busy}
                      disabled={!title.trim() || !body.trim() || !institutionId}
                    />
                  </View>
                </Card>
              ) : (
                <View style={{ marginBottom: 14 }}>
                  <Button label="New announcement" icon="megaphone-outline" onPress={() => setComposing(true)} />
                </View>
              )
            ) : null}

            {data.items.length === 0 ? (
              <EmptyState
                icon="megaphone-outline"
                title="No announcements"
                body="School and community announcements for you will appear here."
              />
            ) : (
              data.items.map((item) => {
                const unread = !data.read.has(item.id) && item.authorId !== data.userId;
                const author = data.users.find((user) => user.id === item.authorId);

                return (
                  <Card
                    key={item.id}
                    onPress={() => open(item.id)}
                    accessibilityLabel={`${item.title}. ${unread ? 'Unread' : 'Read'}`}
                    style={focus === item.id || unread ? { borderColor: colors.accent } : undefined}
                  >
                    <View style={styles.top}>
                      <Text style={styles.title}>{item.title}</Text>
                      {unread ? <Badge label="New" /> : null}
                      {item.priority !== 'normal' ? (
                        <Badge label={item.priority} tone={item.priority === 'urgent' ? 'danger' : 'orange'} />
                      ) : null}
                    </View>
                    <Text style={styles.body}>{item.body}</Text>
                    <Text style={styles.meta}>
                      {author?.name ?? 'Hi-Link'} · {new Date(item.createdAt).toLocaleString()} ·{' '}
                      {item.audience.kind === 'community'
                        ? 'Community'
                        : item.audience.kind === 'class'
                          ? item.audience.form
                          : 'Whole school'}
                    </Text>
                    {item.authorId === data.userId ? (
                      <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                        <Button
                          label="Delete"
                          variant="danger"
                          onPress={() =>
                            Alert.alert('Delete announcement', 'This cannot be undone.', [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: async () => {
                                  await deleteAnnouncement(data.userId as string, item.id);
                                  await reload();
                                },
                              },
                            ])
                          }
                        />
                      </View>
                    ) : null}
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 80 },
    label: { color: colors.textSecondary, fontWeight: '700', fontSize: 13, marginBottom: 8 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '800' },
    body: { color: colors.textSecondary, lineHeight: 20, marginTop: 8 },
    meta: { color: colors.muted, fontSize: 11, marginTop: 10 },
  });
