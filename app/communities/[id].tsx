import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { getActiveUserId } from '../../src/storage/accountScope';
import {
  canManageCommunity,
  getCommunity,
  getMembers,
  getMembership,
  joinCommunity,
  leaveCommunity,
} from '../../src/storage/communities';
import { useLoad } from '../../src/hooks/useLoad';
import { ThemeColors, useTheme } from '../../src/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenHeader,
} from '../../src/components/ui';
import { ReportSheet, ReportTarget } from '../../src/components/ReportSheet';
import { AnnouncementsTab } from '../../src/components/community/AnnouncementsTab';
import { EventsTab } from '../../src/components/community/EventsTab';
import { ManageTab } from '../../src/components/community/ManageTab';
import { MembersTab } from '../../src/components/community/MembersTab';
import { PollsTab } from '../../src/components/community/PollsTab';
import { PostsTab } from '../../src/components/community/PostsTab';

type TabKey = 'posts' | 'announcements' | 'polls' | 'events' | 'members' | 'manage';

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [tab, setTab] = useState<TabKey>('posts');
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const [userId, community] = await Promise.all([getActiveUserId(), getCommunity(id)]);

    if (!community || !userId) {
      return null;
    }

    const [membership, members, isAdmin] = await Promise.all([
      getMembership(community.id, userId),
      getMembers(community.id),
      canManageCommunity(community.id, userId),
    ]);

    return {
      userId,
      community,
      membership,
      memberCount: members.filter((member) => member.state === 'active').length,
      isAdmin,
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Community" />
        <View style={styles.pad}>
          <LoadingState />
        </View>
      </View>
    );
  }

  if (error || !data || data.community.archived) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Community" />
        <View style={styles.pad}>
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            <EmptyState icon="people-outline" title="Community unavailable" body="It may have been archived or removed." />
          )}
        </View>
      </View>
    );
  }

  const { community, membership, userId, isAdmin, memberCount } = data;
  const isMember = membership?.state === 'active';
  const requested = membership?.state === 'pending';
  const invited = membership?.state === 'invited';
  const banned = membership?.state === 'banned';

  async function join() {
    setBusy(true);

    try {
      const result = await joinCommunity(userId, community.id);

      if (result === 'denied') {
        Alert.alert('Invite only', 'This community is invite only. Ask an administrator to invite you.');
      }

      await reload();
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    Alert.alert('Leave community', `Leave ${community.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveCommunity(userId, community.id);
            await reload();
          } catch (caught) {
            Alert.alert('Could not leave', caught instanceof Error ? caught.message : 'Try again.');
          }
        },
      },
    ]);
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'posts', label: 'Posts' },
    { key: 'announcements', label: 'Announcements' },
    { key: 'polls', label: 'Polls' },
    { key: 'events', label: 'Events' },
    { key: 'members', label: 'Members' },
    ...(isAdmin ? [{ key: 'manage' as const, label: 'Manage' }] : []),
  ];

  const tabProps = { community, userId, isMember, isAdmin, onChanged: reload };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={community.name} subtitle={`${memberCount} ${memberCount === 1 ? 'member' : 'members'}`} />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.desc}>{community.description || 'No description yet.'}</Text>

          <View style={styles.badges}>
            <Badge label={community.kind.replace('_', ' ')} tone="blue" />
            <Badge label={community.privacy === 'open' ? 'Open' : community.privacy === 'request' ? 'Approval needed' : 'Invite only'} />
            {isAdmin ? <Badge label="You manage this" tone="orange" /> : null}
          </View>

          {community.guidelines ? (
            <View style={styles.guidelines}>
              <Text style={styles.guidelinesTitle}>Community guidelines</Text>
              <Text style={styles.desc}>{community.guidelines}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {banned ? (
              <Text style={styles.muted}>You can no longer join this community.</Text>
            ) : isMember ? (
              <Button label="Leave" variant="secondary" onPress={leave} />
            ) : requested ? (
              <Button label="Request sent" variant="secondary" disabled onPress={() => undefined} />
            ) : (
              <Button
                label={invited ? 'Accept invitation' : community.privacy === 'request' ? 'Request to join' : 'Join'}
                onPress={join}
                loading={busy}
                disabled={community.privacy === 'invite_only' && !invited}
              />
            )}

            <Button
              label="Report"
              variant="secondary"
              icon="flag-outline"
              onPress={() =>
                setReporting({
                  targetType: 'community',
                  targetId: community.id,
                  institutionId: community.institutionId,
                  communityId: community.id,
                  label: 'community',
                })
              }
            />
          </View>
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {tabs.map((item) => (
            <Chip key={item.key} label={item.label} selected={tab === item.key} onPress={() => setTab(item.key)} />
          ))}
        </ScrollView>

        {tab === 'posts' ? <PostsTab {...tabProps} /> : null}
        {tab === 'announcements' ? <AnnouncementsTab {...tabProps} /> : null}
        {tab === 'polls' ? <PollsTab {...tabProps} /> : null}
        {tab === 'events' ? <EventsTab {...tabProps} /> : null}
        {tab === 'members' ? <MembersTab {...tabProps} /> : null}
        {tab === 'manage' && isAdmin ? <ManageTab {...tabProps} /> : null}
      </ScrollView>

      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 90 },
    desc: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    muted: { color: colors.muted, fontSize: 13 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    guidelines: {
      marginTop: 14,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.cardRaised,
    },
    guidelinesTitle: { color: colors.text, fontWeight: '800', marginBottom: 4 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  });
