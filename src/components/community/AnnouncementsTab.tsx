import { Alert, Text, View } from 'react-native';
import { useState } from 'react';

import {
  deleteAnnouncement,
  getCommunityAnnouncements,
  publishAnnouncement,
} from '../../storage/announcements';
import { useLoad } from '../../hooks/useLoad';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Button, Card, Chip, EmptyState, ErrorState, Field, LoadingState } from '../ui';
import type { AnnouncementPriority } from '../../models/campus';
import type { TabProps } from './types';

export function AnnouncementsTab({ community, userId, isAdmin }: TabProps) {
  const { colors } = useTheme();
  const { data, loading, error, reload } = useLoad(
    () => getCommunityAnnouncements(community.id),
    [community.id],
  );
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);

    try {
      await publishAnnouncement(userId, {
        title,
        body,
        priority,
        audience: { kind: 'community', communityId: community.id },
      });
      setTitle('');
      setBody('');
      setPriority('normal');
      setComposing(false);
      await reload();
    } catch (caught) {
      Alert.alert('Could not publish', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      {isAdmin ? (
        composing ? (
          <Card>
            <Field label="Title" value={title} onChangeText={setTitle} />
            <Field label="Message" value={body} onChangeText={setBody} multiline />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {(['normal', 'important', 'urgent'] as AnnouncementPriority[]).map((item) => (
                <Chip key={item} label={item} selected={priority === item} onPress={() => setPriority(item)} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button label="Cancel" variant="secondary" onPress={() => setComposing(false)} />
              <Button label="Publish" onPress={publish} loading={busy} disabled={!title.trim() || !body.trim()} />
            </View>
          </Card>
        ) : (
          <View style={{ marginBottom: 12 }}>
            <Button label="New announcement" icon="megaphone-outline" onPress={() => setComposing(true)} />
          </View>
        )
      ) : null}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="megaphone-outline" title="No announcements" body="Admins post important updates here." />
      ) : (
        (data ?? []).map((item) => (
          <Card key={item.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: '800', fontSize: 15 }}>{item.title}</Text>
              {item.priority !== 'normal' ? (
                <Badge label={item.priority} tone={item.priority === 'urgent' ? 'danger' : 'orange'} />
              ) : null}
            </View>
            <Text style={{ color: colors.textSecondary, marginTop: 6, lineHeight: 20 }}>{item.body}</Text>
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 8 }}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
            {isAdmin ? (
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
                          await deleteAnnouncement(userId, item.id);
                          await reload();
                        },
                      },
                    ])
                  }
                />
              </View>
            ) : null}
          </Card>
        ))
      )}
    </View>
  );
}
