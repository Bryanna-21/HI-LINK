import { Text, View } from 'react-native';
import { router } from 'expo-router';

import { getCommunityEvents } from '../../storage/events';
import { useLoad } from '../../hooks/useLoad';
import { useTheme } from '../../theme/ThemeProvider';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '../ui';
import type { TabProps } from './types';

export function EventsTab({ community, isAdmin }: TabProps) {
  const { colors } = useTheme();
  const { data, loading, error, reload } = useLoad(() => getCommunityEvents(community.id), [community.id]);

  return (
    <View>
      {isAdmin ? (
        <View style={{ marginBottom: 12 }}>
          <Button
            label="Add event"
            icon="calendar-outline"
            onPress={() => router.push({ pathname: '/events/create', params: { communityId: community.id } })}
          />
        </View>
      ) : null}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState icon="calendar-outline" title="No events" body="Upcoming community events will show here." />
      ) : (
        (data ?? []).map((event) => (
          <Card
            key={event.id}
            onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
            accessibilityLabel={`Open event ${event.title}`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: '800', fontSize: 15 }}>{event.title}</Text>
              {event.cancelled ? <Badge label="Cancelled" tone="danger" /> : null}
            </View>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>
              {new Date(event.startsAt).toLocaleString()}
              {event.location ? ` · ${event.location}` : ''}
            </Text>
          </Card>
        ))
      )}
    </View>
  );
}
