import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import type { Community, CommunityKind } from '../../src/models/campus';
import { getActiveUserId } from '../../src/storage/accountScope';
import {
  COMMUNITY_KINDS,
  getAllMemberships,
  getCommunities,
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

interface Row {
  community: Community;
  memberCount: number;
  mine: boolean;
}

async function loadRows(): Promise<Row[]> {
  const [userId, communities, memberships] = await Promise.all([
    getActiveUserId(),
    getCommunities(),
    getAllMemberships(),
  ]);

  return communities.map((community) => {
    const members = memberships.filter(
      (item) => item.communityId === community.id && item.state === 'active',
    );

    return {
      community,
      memberCount: members.length,
      mine: members.some((item) => item.userId === userId),
    };
  });
}

export default function CommunitiesScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { data, loading, error, reload } = useLoad(loadRows);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<CommunityKind | 'all'>('all');
  const [tab, setTab] = useState<'discover' | 'mine'>('discover');

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return (data ?? []).filter(
      (row) =>
        (tab === 'mine' ? row.mine : true) &&
        (kind === 'all' || row.community.kind === kind) &&
        (!normalized ||
          row.community.name.toLowerCase().includes(normalized) ||
          row.community.description.toLowerCase().includes(normalized)),
    );
  }, [data, query, kind, tab]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Communities"
        right={<Button label="Create" icon="add" onPress={() => router.push('/communities/create')} />}
      />

      <View style={styles.controls}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search communities"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            accessibilityLabel="Search communities"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.tabs}>
          <Chip label="Discover" selected={tab === 'discover'} onPress={() => setTab('discover')} />
          <Chip label="My communities" selected={tab === 'mine'} onPress={() => setTab('mine')} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="All" selected={kind === 'all'} onPress={() => setKind('all')} />
          {COMMUNITY_KINDS.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={kind === item.value}
              onPress={() => setKind(item.value)}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.pad}>
          <LoadingState />
        </View>
      ) : error ? (
        <View style={styles.pad}>
          <ErrorState message={error} onRetry={reload} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.community.id}
          contentContainerStyle={styles.pad}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={tab === 'mine' ? 'You have not joined any communities' : 'No communities found'}
              body={
                query || kind !== 'all'
                  ? 'Try a different search or filter.'
                  : 'Start the first one for your class, club or study group.'
              }
              action={<Button label="Create a community" onPress={() => router.push('/communities/create')} />}
            />
          }
          renderItem={({ item }) => (
            <Card
              onPress={() => router.push({ pathname: '/communities/[id]', params: { id: item.community.id } })}
              accessibilityLabel={`Open ${item.community.name}`}
            >
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.community.name}
                </Text>
                {item.mine ? <Badge label="Joined" /> : null}
                {item.community.privacy !== 'open' ? (
                  <Badge label={item.community.privacy === 'request' ? 'Approval' : 'Invite only'} tone="blue" />
                ) : null}
              </View>

              <Text style={styles.desc} numberOfLines={2}>
                {item.community.description || 'No description yet.'}
              </Text>

              <Text style={styles.meta}>
                {COMMUNITY_KINDS.find((entry) => entry.value === item.community.kind)?.label} · {item.memberCount}{' '}
                {item.memberCount === 1 ? 'member' : 'members'}
              </Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    controls: { paddingHorizontal: 16, paddingTop: 12 },
    pad: { padding: 16, paddingBottom: 60 },
    search: {
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      gap: 8,
      marginBottom: 10,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: 14 },
    tabs: { flexDirection: 'row' },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
    desc: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 8 },
  });
