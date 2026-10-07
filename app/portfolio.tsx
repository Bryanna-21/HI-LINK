import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button, Card, Chip, EmptyState, ErrorState, Field, LoadingState, ScreenHeader, SectionTitle } from '../src/components/ui';
import { useLoad } from '../src/hooks/useLoad';
import { getActiveUserId } from '../src/storage/accountScope';
import { getConnectionState } from '../src/storage/follows';
import { getProfileMap } from '../src/storage/liveProfiles';
import {
  addPortfolioItem,
  getPortfolio,
  PORTFOLIO_KINDS,
  PortfolioKind,
  removePortfolioItem,
} from '../src/storage/portfolio';
import { useTheme } from '../src/theme/ThemeProvider';

/** A student's portfolio. Others see it only if the profile itself is visible to them. */
export default function PortfolioScreen() {
  const { colors } = useTheme();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [kind, setKind] = useState<PortfolioKind>('project');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const state = useLoad(async () => {
    const viewerId = await getActiveUserId();
    const ownerId = userId ?? viewerId;

    if (!viewerId || !ownerId) {
      return { mine: false, allowed: false, name: '', items: [] };
    }

    const mine = ownerId === viewerId;
    const owner = (await getProfileMap()).get(ownerId);
    let allowed = mine;

    if (!mine) {
      const connection = await getConnectionState(viewerId, ownerId);

      allowed =
        Boolean(owner) &&
        connection !== 'blocked' &&
        connection !== 'unavailable' &&
        (owner?.isPrivate !== true || connection === 'following');
    }

    return {
      mine,
      allowed,
      name: owner?.name ?? 'Student',
      items: allowed ? await getPortfolio(ownerId) : [],
    };
  }, [userId]);

  async function add() {
    setBusy(true);

    try {
      await addPortfolioItem({ kind, title, description: description.trim() || undefined, dateLabel: dateLabel.trim() || undefined, url });
      setTitle('');
      setDescription('');
      setDateLabel('');
      setUrl('');
      await state.reload();
    } catch (caught) {
      Alert.alert('Could not add', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string, label: string) {
    Alert.alert('Remove item?', `Remove “${label}” from your portfolio?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removePortfolioItem(id);
          await state.reload();
        },
      },
    ]);
  }

  const data = state.data;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Portfolio" subtitle={data && !data.mine ? data.name : undefined} />
      {state.loading ? (
        <LoadingState />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : !data || !data.allowed ? (
        <EmptyState icon="lock-closed-outline" title="Portfolio unavailable" body="This portfolio is private or the account is not available to you." />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {PORTFOLIO_KINDS.map((group) => {
            const rows = data.items.filter((item) => item.kind === group.value);

            return rows.length === 0 ? null : (
              <View key={group.value}>
                <SectionTitle>{group.plural}</SectionTitle>
                {rows.map((item) => (
                  <Card key={item.id}>
                    <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                    {item.dateLabel ? <Text style={{ color: colors.muted }}>{item.dateLabel}</Text> : null}
                    {item.description ? <Text style={{ color: colors.text, marginTop: 6 }}>{item.description}</Text> : null}
                    <View style={styles.actions}>
                      {item.url ? (
                        <Button label="Open link" variant="secondary" icon="open-outline" onPress={() => void Linking.openURL(item.url as string)} />
                      ) : null}
                      {data.mine ? <Button label="Remove" variant="secondary" onPress={() => remove(item.id, item.title)} /> : null}
                    </View>
                  </Card>
                ))}
              </View>
            );
          })}

          {data.items.length === 0 ? (
            <EmptyState icon="briefcase-outline" title="Nothing here yet" body={data.mine ? 'Add projects, achievements, certificates and activities below.' : 'No portfolio items shared yet.'} />
          ) : null}

          {data.mine ? (
            <View>
              <SectionTitle>Add to portfolio</SectionTitle>
              <View style={styles.chips}>
                {PORTFOLIO_KINDS.map((option) => (
                  <Chip key={option.value} label={option.label} selected={kind === option.value} onPress={() => setKind(option.value)} />
                ))}
              </View>
              <Field label="Title" value={title} onChangeText={setTitle} />
              <Field label="When (optional)" value={dateLabel} onChangeText={setDateLabel} placeholder="March 2026" />
              <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline />
              <Field label="Link (optional)" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" />
              <Button label="Add" onPress={add} loading={busy} disabled={!title.trim()} />
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 48, gap: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
});
