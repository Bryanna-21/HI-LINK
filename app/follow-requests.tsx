import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Avatar, Button, Card, EmptyState, ErrorState, LoadingState, ScreenHeader } from '../src/components/ui';
import { useLoad } from '../src/hooks/useLoad';
import { getActiveUserId } from '../src/storage/accountScope';
import { getPendingRequests, resolveFollowRequest } from '../src/storage/follows';
import { getProfileMap } from '../src/storage/liveProfiles';
import { useTheme } from '../src/theme/ThemeProvider';

export default function FollowRequestsScreen() {
  const { colors } = useTheme();
  const state = useLoad(async () => {
    const userId = await getActiveUserId();

    if (!userId) {
      return { userId: null, rows: [] };
    }

    const [requests, profiles] = await Promise.all([getPendingRequests(userId), getProfileMap()]);

    return {
      userId,
      rows: requests.map((record) => ({ followerId: record.followerId, user: profiles.get(record.followerId) })),
    };
  });

  async function answer(followerId: string, accept: boolean) {
    if (!state.data?.userId) {
      return;
    }

    await resolveFollowRequest(state.data.userId, followerId, accept);
    await state.reload();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Follow requests" />
      {state.loading ? (
        <LoadingState />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data && state.data.rows.length > 0 ? (
        <ScrollView contentContainerStyle={styles.content}>
          {state.data.rows.map(({ followerId, user }) => (
            <Card key={followerId}>
              <Pressable
                style={styles.row}
                onPress={() => router.push({ pathname: '/profile/[id]', params: { id: followerId } })}
                accessibilityRole="button"
                accessibilityLabel={`Open ${user?.name ?? 'profile'}`}
              >
                <Avatar uri={user?.avatarUri} name={user?.name} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{user?.name ?? 'Unknown student'}</Text>
                  {user ? <Text style={{ color: colors.muted }}>@{user.username}</Text> : null}
                </View>
              </Pressable>
              <View style={styles.actions}>
                <Button label="Accept" onPress={() => void answer(followerId, true)} />
                <Button label="Decline" variant="secondary" onPress={() => void answer(followerId, false)} />
              </View>
            </Card>
          ))}
        </ScrollView>
      ) : (
        <EmptyState icon="person-add-outline" title="No pending requests" body="When someone asks to follow your private account, it shows up here." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
