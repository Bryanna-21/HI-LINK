import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearVideoHistory } from '../src/storage/videoHistory';
import { useLoad } from '../src/hooks/useLoad';
import { ThemeColors, useTheme } from '../src/theme/ThemeProvider';
import { Button, Card, ErrorState, LoadingState, ScreenHeader } from '../src/components/ui';

const PREFIX = '@hilink/';

async function measure() {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
  const pairs = await AsyncStorage.multiGet(keys);

  const rows = pairs
    .map(([key, value]) => ({ key: key.slice(PREFIX.length), bytes: value?.length ?? 0 }))
    .sort((a, b) => b.bytes - a.bytes);

  return { rows, total: rows.reduce((sum, row) => sum + row.bytes, 0) };
}

const format = (bytes: number) =>
  bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export default function StorageScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { data, loading, error, reload } = useLoad(measure);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Storage & data" />

      <ScrollView contentContainerStyle={styles.pad}>
        {loading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState message={error ?? 'Could not read storage.'} onRetry={reload} />
        ) : (
          <>
            <Card>
              <Text style={styles.big}>{format(data.total)}</Text>
              <Text style={styles.muted}>
                Hi-Link data stored on this device (all profiles). Photos, videos and documents are kept by file
                reference and are not counted here.
              </Text>
            </Card>

            <View style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
              <Button
                label="Clear my watch history"
                variant="secondary"
                onPress={() =>
                  Alert.alert('Clear watch history', 'Your recently watched list will be emptied.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: async () => {
                        await clearVideoHistory();
                        await reload();
                      },
                    },
                  ])
                }
              />
            </View>

            {data.rows.slice(0, 12).map((row) => (
              <View key={row.key} style={styles.row}>
                <Text style={styles.key} numberOfLines={1}>
                  {row.key.replace(/@.*/, '')}
                </Text>
                <Text style={styles.muted}>{format(row.bytes)}</Text>
              </View>
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
    big: { color: colors.text, fontSize: 28, fontWeight: '900' },
    muted: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    key: { color: colors.text, flex: 1, fontSize: 13 },
  });
