import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';

import { getIdentity } from '../../src/storage/identity';
import { EMPTY_RESULTS, searchEverything, SearchResults } from '../../src/storage/search';
import { useLoad } from '../../src/hooks/useLoad';
import { formatEventRange } from '../../src/utils/datetime';
import { ThemeColors, useTheme } from '../../src/theme/ThemeProvider';
import { Avatar, EmptyState, ErrorState, LoadingState, SectionTitle } from '../../src/components/ui';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const HUBS: { title: string; body: string; icon: IconName; href: Href }[] = [
  { title: 'Communities', body: 'Clubs, classes and study groups', icon: 'people-outline', href: '/communities' },
  { title: 'Events', body: 'What is happening on campus', icon: 'calendar-outline', href: '/events' },
  { title: 'Opportunities', body: 'Internships, scholarships, programs', icon: 'briefcase-outline', href: '/opportunities' },
  { title: 'Announcements', body: 'Updates from your school', icon: 'megaphone-outline', href: '/announcements' },
  { title: 'Study & academics', body: 'Subjects, resources, assignments', icon: 'book-outline', href: '/academics' },
  { title: 'Timetable', body: 'Your lessons and free periods', icon: 'time-outline', href: '/timetable' },
  { title: 'Videos', body: 'Watch reels from students', icon: 'play-circle-outline', href: '/video-feed' },
  { title: 'Emergency', body: 'Ask your school for help', icon: 'warning-outline', href: '/emergency' },
];

const total = (results: SearchResults) =>
  Object.values(results).reduce((sum, list) => sum + list.length, 0);

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(query), 200);

    return () => clearTimeout(handle);
  }, [query]);

  const search = useLoad(() => searchEverything(debounced), [debounced]);
  const me = useLoad(getIdentity);
  const results = search.data ?? EMPTY_RESULTS;
  const searching = debounced.trim().length > 0;

  const people = useMemo(() => {
    const list = results.people;

    if (searching) {
      return list;
    }

    // Suggest classmates and schoolmates first.
    return [...list].sort((a, b) => {
      const score = (user: (typeof list)[number]) =>
        (user.schoolId && user.schoolId === me.data?.schoolId ? 2 : 0) +
        (user.form && user.form === me.data?.form ? 1 : 0);

      return score(b) - score(a);
    });
  }, [results.people, searching, me.data]);

  const go = useCallback((href: Href) => router.push(href), []);

  function Row({
    icon,
    title,
    meta,
    onPress,
    avatar,
  }: {
    icon?: IconName;
    title: string;
    meta?: string;
    onPress: () => void;
    avatar?: { uri?: string; name: string };
  }) {
    return (
      <Pressable style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
        {avatar ? (
          <Avatar uri={avatar.uri} name={avatar.name} size={44} />
        ) : (
          <View style={styles.iconBox}>
            <Ionicons name={icon ?? 'ellipse-outline'} size={20} color={colors.accent} />
          </View>
        )}
        <View style={styles.rowText}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          {meta ? (
            <Text style={styles.rowMeta} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward-outline" size={18} color={colors.muted} />
      </Pressable>
    );
  }

  const groups: { title: string; items: React.ReactNode[] }[] = [
    {
      title: 'People',
      items: people.map((user) => (
        <Row
          key={user.id}
          avatar={{ uri: user.avatarUri, name: user.name }}
          title={user.name}
          meta={`@${user.username}${user.schoolName ? ` · ${user.schoolName}` : ''}`}
          onPress={() => go({ pathname: '/profile/[id]', params: { id: user.id } })}
        />
      )),
    },
    {
      title: 'Schools',
      items: results.schools.map((school) => (
        <Row
          key={school.id}
          icon="school-outline"
          title={school.name}
          meta={school.verifiedAt ? 'Verified school' : 'Not verified'}
          onPress={() => go({ pathname: '/schools/[id]', params: { id: school.id } })}
        />
      )),
    },
    {
      title: 'Communities',
      items: results.communities.map((community) => (
        <Row
          key={community.id}
          icon="people-outline"
          title={community.name}
          meta={community.description}
          onPress={() => go({ pathname: '/communities/[id]', params: { id: community.id } })}
        />
      )),
    },
    {
      title: 'Events',
      items: results.events.map((event) => (
        <Row
          key={event.id}
          icon="calendar-outline"
          title={event.title}
          meta={formatEventRange(event.startsAt, event.endsAt)}
          onPress={() => go({ pathname: '/events/[id]', params: { id: event.id } })}
        />
      )),
    },
    {
      title: 'Opportunities',
      items: results.opportunities.map((item) => (
        <Row key={item.id} icon="briefcase-outline" title={item.title} meta={item.organization} onPress={() => go('/opportunities')} />
      )),
    },
    {
      title: 'Videos',
      items: results.videos.map((post) => (
        <Row
          key={post.id}
          icon="play-circle-outline"
          title={post.text || `Video by ${post.authorName}`}
          meta={post.authorName}
          onPress={() => go({ pathname: '/video/[id]', params: { id: post.id } })}
        />
      )),
    },
    {
      title: 'Study resources',
      items: results.resources.map((post) => (
        <Row
          key={post.id}
          icon="document-text-outline"
          title={post.attachment?.name || post.text || 'Study resource'}
          meta={[post.subject, post.authorName].filter(Boolean).join(' · ')}
          onPress={() => go({ pathname: '/comments/[postId]', params: { postId: post.id } })}
        />
      )),
    },
    {
      title: 'Discussions',
      items: results.discussions.map((post) => (
        <Row
          key={post.id}
          icon="help-circle-outline"
          title={post.text || 'Question'}
          meta={post.authorName}
          onPress={() => go({ pathname: '/comments/[postId]', params: { postId: post.id } })}
        />
      )),
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.subtitle}>Find people, schools, communities, events and opportunities.</Text>

      <View style={styles.search}>
        <Ionicons name="search-outline" size={19} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Hi-Link"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          accessibilityLabel="Search Hi-Link"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      {!searching ? (
        <>
          <SectionTitle>Explore</SectionTitle>
          <View style={styles.grid}>
            {HUBS.map((hub, index) => (
              <Pressable
                key={hub.title}
                style={styles.hub}
                onPress={() => go(hub.href)}
                accessibilityRole="button"
                accessibilityLabel={hub.title}
              >
                <View style={[styles.iconBox, index % 2 === 1 && { backgroundColor: colors.blueSoft }]}>
                  <Ionicons name={hub.icon} size={22} color={index % 2 === 1 ? colors.blue : colors.accent} />
                </View>
                <Text style={styles.hubTitle}>{hub.title}</Text>
                <Text style={styles.hubBody} numberOfLines={2}>
                  {hub.body}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {search.loading ? (
        <LoadingState label="Searching..." />
      ) : search.error ? (
        <ErrorState message={search.error} onRetry={search.reload} />
      ) : searching && total(results) === 0 ? (
        <EmptyState
          icon="search-outline"
          title="Nothing found"
          body="Try a name, username, school, subject, tag or community."
        />
      ) : (
        groups
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <View key={group.title}>
              <SectionTitle>{!searching && group.title === 'People' ? 'People you may know' : group.title}</SectionTitle>
              {group.items.slice(0, searching ? 8 : 6)}
            </View>
          ))
      )}

      {!searching && !search.loading && !search.error && people.length === 0 ? (
        <EmptyState icon="people-outline" title="No other people yet" body="Students appear here as they join Hi-Link on this device." />
      ) : null}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 110 },
    title: { color: colors.text, fontSize: 28, fontWeight: '900' },
    subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 7 },
    search: {
      minHeight: 50,
      borderRadius: 15,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginTop: 22,
      gap: 9,
    },
    searchInput: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    hub: {
      width: '48%',
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    hubTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 10 },
    hubBody: { color: colors.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
      gap: 12,
    },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
    rowMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  });
