import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { getCommunities, getAllMemberships } from '../../src/storage/communities';
import { getInstitution } from '../../src/storage/institutions';
import { getMyEvents } from '../../src/storage/events';
import { getUsers } from '../../src/storage/users';
import { useLoad } from '../../src/hooks/useLoad';
import { formatEventRange } from '../../src/utils/datetime';
import { ThemeColors, useTheme } from '../../src/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenHeader,
  SectionTitle,
} from '../../src/components/ui';

export default function SchoolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { data, loading, error, reload } = useLoad(async () => {
    const [institution, communities, memberships, events, users] = await Promise.all([
      getInstitution(id),
      getCommunities(),
      getAllMemberships(),
      getMyEvents(),
      getUsers(),
    ]);

    if (!institution) {
      return null;
    }

    return {
      institution,
      communities: communities
        .filter((item) => item.institutionId === id)
        .map((community) => ({
          community,
          members: memberships.filter((item) => item.communityId === community.id && item.state === 'active').length,
        })),
      events: events.filter((event) => event.institutionId === id && !event.cancelled && new Date(event.startsAt).getTime() >= Date.now()),
      students: users.filter((user) => user.schoolId === id),
    };
  }, [id]);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="School" />

      <ScrollView contentContainerStyle={styles.pad}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <EmptyState icon="school-outline" title="School not found" />
        ) : (
          <>
            <Card>
              <Text style={styles.title}>{data.institution.name}</Text>
              <View style={styles.badges}>
                <Badge label={data.institution.type} tone="blue" />
                {data.institution.verifiedAt ? <Badge label="Verified" /> : <Badge label="Not verified" tone="orange" />}
              </View>
              <Text style={styles.meta}>{data.students.length} Hi-Link {data.students.length === 1 ? 'student' : 'students'} on this device</Text>
            </Card>

            <SectionTitle>Communities</SectionTitle>
            {data.communities.length === 0 ? (
              <EmptyState icon="people-outline" title="No communities yet" />
            ) : (
              data.communities.map(({ community, members }) => (
                <Card
                  key={community.id}
                  onPress={() => router.push({ pathname: '/communities/[id]', params: { id: community.id } })}
                  accessibilityLabel={`Open ${community.name}`}
                >
                  <Text style={styles.name}>{community.name}</Text>
                  <Text style={styles.meta}>{members} members</Text>
                </Card>
              ))
            )}

            <SectionTitle>Upcoming events</SectionTitle>
            {data.events.length === 0 ? (
              <EmptyState icon="calendar-outline" title="No upcoming events" />
            ) : (
              data.events.map((event) => (
                <Card
                  key={event.id}
                  onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
                  accessibilityLabel={`Open ${event.title}`}
                >
                  <Text style={styles.name}>{event.title}</Text>
                  <Text style={styles.meta}>{formatEventRange(event.startsAt, event.endsAt)}</Text>
                </Card>
              ))
            )}

            <SectionTitle>Students</SectionTitle>
            {data.students.slice(0, 20).map((student) => (
              <Card
                key={student.id}
                onPress={() => router.push({ pathname: '/profile/[id]', params: { id: student.id } })}
                accessibilityLabel={`Open ${student.name}`}
              >
                <View style={styles.person}>
                  <Avatar uri={student.avatarUri} name={student.name} size={36} />
                  <Text style={styles.name}>{student.name}</Text>
                </View>
              </Card>
            ))}
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
    title: { color: colors.text, fontSize: 22, fontWeight: '900' },
    name: { color: colors.text, fontWeight: '800', fontSize: 15 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 6 },
    badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
    person: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  });
