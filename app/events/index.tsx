import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import type { EventCategory } from '../../src/models/campus';
import { EVENT_CATEGORIES, getMyEvents } from '../../src/storage/events';
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
} from '../../src/components/ui';

export default function EventsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { data, loading, error, reload } = useLoad(getMyEvents);
  const [category, setCategory] = useState<EventCategory | 'all'>('all');
  const [showPast, setShowPast] = useState(false);

  const rows = useMemo(() => {
    const now = Date.now();

    return (data ?? [])
      .filter((event) => (category === 'all' ? true : event.category === category))
      .filter((event) => {
        const end = new Date(event.endsAt ?? event.startsAt).getTime();

        return showPast ? end < now : end >= now;
      });
  }, [data, category, showPast]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Events"
        right={<Button label="Add" icon="add" onPress={() => router.push('/events/create')} />}
      />

      <View style={styles.controls}>
        <View style={{ flexDirection: 'row' }}>
          <Chip label="Upcoming" selected={!showPast} onPress={() => setShowPast(false)} />
          <Chip label="Past" selected={showPast} onPress={() => setShowPast(true)} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="All" selected={category === 'all'} onPress={() => setCategory('all')} />
          {EVENT_CATEGORIES.map((item) => (
            <Chip key={item.value} label={item.label} selected={category === item.value} onPress={() => setCategory(item.value)} />
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
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.pad}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={showPast ? 'No past events' : 'No upcoming events'}
              body="Events from your school and communities appear here. Teachers, school admins and community admins can add them."
            />
          }
          renderItem={({ item }) => (
            <Card
              onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.id } })}
              accessibilityLabel={`Open event ${item.title}`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.cancelled ? <Badge label="Cancelled" tone="danger" /> : null}
              </View>
              <Text style={styles.when}>{formatEventRange(item.startsAt, item.endsAt)}</Text>
              {item.location ? <Text style={styles.meta}>{item.location}</Text> : null}
              <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                <Badge label={EVENT_CATEGORIES.find((entry) => entry.value === item.category)?.label ?? 'Other'} tone="blue" />
              </View>
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
    title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
    when: { color: colors.accent, fontSize: 13, fontWeight: '700', marginTop: 6 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
  });
