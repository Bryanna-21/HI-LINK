import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import type { RsvpStatus } from '../../src/models/campus';
import { getActiveUserId } from '../../src/storage/accountScope';
import { getCommunity } from '../../src/storage/communities';
import {
  cancelEvent,
  EVENT_CATEGORIES,
  getEvent,
  getEventAttendeeCount,
  getMyRsvp,
  setRsvp,
} from '../../src/storage/events';
import { canManageCommunity } from '../../src/storage/communities';
import { can } from '../../src/storage/roles';
import { getUsers } from '../../src/storage/users';
import { useLoad } from '../../src/hooks/useLoad';
import { formatEventRange } from '../../src/utils/datetime';
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
  SectionTitle,
} from '../../src/components/ui';

const REMINDERS: { label: string; minutes?: number }[] = [
  { label: 'No reminder' },
  { label: '30 min before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
];

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { data, loading, error, reload } = useLoad(async () => {
    const [userId, event] = await Promise.all([getActiveUserId(), getEvent(id)]);

    if (!event || !userId) {
      return null;
    }

    const [rsvp, going, organizer, community] = await Promise.all([
      getMyRsvp(event.id),
      getEventAttendeeCount(event.id),
      getUsers().then((users) => users.find((user) => user.id === event.organizerId)),
      event.communityId ? getCommunity(event.communityId) : Promise.resolve(null),
    ]);

    const canCancel =
      event.organizerId === userId ||
      (event.communityId
        ? await canManageCommunity(event.communityId, userId)
        : await can(userId, 'event.create', { institutionId: event.institutionId }));

    return { userId, event, rsvp, going, organizer, community, canCancel };
  }, [id]);

  async function answer(status: RsvpStatus, reminderMinutes?: number) {
    if (!data) {
      return;
    }

    try {
      await setRsvp(data.userId, data.event.id, status, reminderMinutes);
      await reload();
    } catch (caught) {
      Alert.alert('Could not update RSVP', caught instanceof Error ? caught.message : 'Try again.');
    }
  }

  function cancel() {
    if (!data) {
      return;
    }

    Alert.alert('Cancel event', 'Everyone who RSVPed will be notified.', [
      { text: 'Keep event', style: 'cancel' },
      {
        text: 'Cancel event',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelEvent(data.userId, data.event.id);
            await reload();
          } catch (caught) {
            Alert.alert('Could not cancel', caught instanceof Error ? caught.message : 'Try again.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Event" />

      <ScrollView contentContainerStyle={styles.pad}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <EmptyState icon="calendar-outline" title="Event unavailable" body="It may have been removed." />
        ) : (
          <>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.title}>{data.event.title}</Text>
                {data.event.cancelled ? <Badge label="Cancelled" tone="danger" /> : null}
              </View>
              <Text style={styles.when}>{formatEventRange(data.event.startsAt, data.event.endsAt)}</Text>
              {data.event.location ? <Text style={styles.meta}>📍 {data.event.location}</Text> : null}
              <Text style={styles.meta}>
                {EVENT_CATEGORIES.find((item) => item.value === data.event.category)?.label} · Organised by{' '}
                {data.organizer?.name ?? 'a Hi-Link member'}
              </Text>
              {data.community ? (
                <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                  <Button
                    label={data.community.name}
                    variant="secondary"
                    icon="people-outline"
                    onPress={() =>
                      router.push({ pathname: '/communities/[id]', params: { id: data.community?.id ?? '' } })
                    }
                  />
                </View>
              ) : null}
              {data.event.description ? <Text style={styles.body}>{data.event.description}</Text> : null}
              <Text style={styles.meta}>{data.going} going</Text>
            </Card>

            {!data.event.cancelled ? (
              <>
                <SectionTitle>Your RSVP</SectionTitle>
                <View style={styles.wrap}>
                  {(
                    [
                      ['going', 'Going'],
                      ['interested', 'Interested'],
                      ['not_going', "Can't go"],
                    ] as [RsvpStatus, string][]
                  ).map(([status, label]) => (
                    <Chip
                      key={status}
                      label={label}
                      selected={data.rsvp?.status === status}
                      onPress={() => answer(status, data.rsvp?.reminderMinutes)}
                    />
                  ))}
                </View>

                {data.rsvp && data.rsvp.status !== 'not_going' ? (
                  <>
                    <SectionTitle>Reminder</SectionTitle>
                    <View style={styles.wrap}>
                      {REMINDERS.map((item) => (
                        <Chip
                          key={item.label}
                          label={item.label}
                          selected={data.rsvp?.reminderMinutes === item.minutes}
                          onPress={() => answer(data.rsvp?.status ?? 'going', item.minutes)}
                        />
                      ))}
                    </View>
                    <Text style={styles.meta}>Reminders appear in Notifications when you open Hi-Link.</Text>
                  </>
                ) : null}
              </>
            ) : null}

            {data.canCancel && !data.event.cancelled ? (
              <View style={{ marginTop: 20 }}>
                <Button label="Cancel event" variant="danger" onPress={cancel} />
              </View>
            ) : null}
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
    title: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '900' },
    when: { color: colors.accent, fontWeight: '700', marginTop: 8 },
    meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
    body: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 12 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  });
