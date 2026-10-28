import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import type { EventCategory } from '../../src/models/campus';
import { getIdentity } from '../../src/storage/identity';
import { createEvent, EVENT_CATEGORIES } from '../../src/storage/events';
import { parseLocalDateTime, toDateInput } from '../../src/utils/datetime';
import { ThemeColors, useTheme } from '../../src/theme/ThemeProvider';
import { Button, Chip, Field, ScreenHeader, SectionTitle } from '../../src/components/ui';

export default function CreateEventScreen() {
  const { communityId } = useLocalSearchParams<{ communityId?: string }>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toDateInput(new Date()));
  const [start, setStart] = useState('15:00');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<EventCategory>('social');
  const [busy, setBusy] = useState(false);

  async function save() {
    const user = await getIdentity();

    if (!user) {
      Alert.alert('Sign in required', 'Complete your profile first.');
      return;
    }

    const startsAt = parseLocalDateTime(date, start);
    const endsAt = end.trim() ? parseLocalDateTime(date, end) : null;

    if (!startsAt) {
      Alert.alert('Check the date', 'Use a real date like 2026-11-20 and a 24-hour time like 15:00.');
      return;
    }

    if (end.trim() && !endsAt) {
      Alert.alert('Check the end time', 'Use a 24-hour time like 17:30.');
      return;
    }

    setBusy(true);

    try {
      const event = await createEvent(user.id, {
        title,
        description,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString(),
        location,
        category,
        communityId: communityId || undefined,
        institutionId: communityId ? undefined : user.schoolId,
      });

      router.replace({ pathname: '/events/[id]', params: { id: event.id } });
    } catch (error) {
      Alert.alert('Could not add event', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="New event" />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Field label="Title" value={title} onChangeText={setTitle} />
        <Field label="Description" value={description} onChangeText={setDescription} multiline />
        <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Starts" value={start} onChangeText={setStart} placeholder="15:00" keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Ends (optional)" value={end} onChangeText={setEnd} placeholder="17:00" keyboardType="numbers-and-punctuation" />
          </View>
        </View>
        <Field label="Location" value={location} onChangeText={setLocation} />

        <SectionTitle>Category</SectionTitle>
        <View style={styles.wrap}>
          {EVENT_CATEGORIES.map((item) => (
            <Chip key={item.value} label={item.label} selected={category === item.value} onPress={() => setCategory(item.value)} />
          ))}
        </View>

        <Button label="Publish event" onPress={save} loading={busy} disabled={title.trim().length < 3} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 80 },
    row: { flexDirection: 'row', gap: 12 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  });
