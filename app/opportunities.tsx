import { useMemo, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Opportunity, OpportunityCategory } from '../src/models/campus';
import { getActiveUserId } from '../src/storage/accountScope';
import { getIdentity } from '../src/storage/identity';
import { getInstitutions } from '../src/storage/institutions';
import {
  createOpportunity,
  deleteOpportunity,
  expressInterest,
  getInterestsFor,
  getMyOpportunities,
  hasExpressedInterest,
  isClosed,
  OPPORTUNITY_CATEGORIES,
} from '../src/storage/opportunities';
import { getStaffScope } from '../src/storage/roles';
import { useLoad } from '../src/hooks/useLoad';
import { ThemeColors, useTheme } from '../src/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  ScreenHeader,
} from '../src/components/ui';

export default function OpportunitiesScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [category, setCategory] = useState<OpportunityCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '',
    organization: '',
    description: '',
    eligibility: '',
    deadline: '',
    location: '',
    applyUrl: '',
    remote: false,
    category: 'internship' as OpportunityCategory,
    institutionId: '' as string,
  });

  const { data, loading, error, reload } = useLoad(async () => {
    const userId = await getActiveUserId();
    const [items, scope, institutions, me] = await Promise.all([
      getMyOpportunities(),
      getStaffScope(userId),
      getInstitutions(),
      getIdentity(),
    ]);

    const interested = new Set<string>();
    const interestCounts = new Map<string, number>();

    for (const item of items) {
      if (await hasExpressedInterest(item.id)) {
        interested.add(item.id);
      }

      if (userId && item.postedBy === userId) {
        interestCounts.set(item.id, (await getInterestsFor(userId, item.id)).length);
      }
    }

    const canPost = scope.all || scope.institutionIds.length > 0;

    return { userId, items, interested, interestCounts, canPost, schoolId: me?.schoolId, institutions, scope };
  });

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return (data?.items ?? []).filter(
      (item) =>
        (category === 'all' || item.category === category) &&
        (!normalized ||
          `${item.title} ${item.organization} ${item.description}`.toLowerCase().includes(normalized)),
    );
  }, [data, category, query]);

  async function publish() {
    if (!data?.userId) {
      return;
    }

    setBusy(true);

    try {
      await createOpportunity(data.userId, {
        title: form.title,
        organization: form.organization,
        description: form.description,
        eligibility: form.eligibility,
        deadline: form.deadline.trim() || undefined,
        location: form.location.trim() || undefined,
        remote: form.remote,
        applyUrl: form.applyUrl.trim() || undefined,
        category: form.category,
        institutionId: form.institutionId || undefined,
      });
      setComposing(false);
      setForm((current) => ({ ...current, title: '', organization: '', description: '', eligibility: '', deadline: '', location: '', applyUrl: '' }));
      await reload();
    } catch (caught) {
      Alert.alert('Could not publish', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function apply(item: Opportunity) {
    if (item.applyUrl) {
      const supported = await Linking.canOpenURL(item.applyUrl);

      if (!supported) {
        Alert.alert('Cannot open link', item.applyUrl);
        return;
      }

      await Linking.openURL(item.applyUrl);

      return;
    }

    try {
      await expressInterest(item.id);
      await reload();
      Alert.alert('Interest recorded', 'The poster of this opportunity can see that you are interested.');
    } catch (caught) {
      Alert.alert('Could not apply', caught instanceof Error ? caught.message : 'Try again.');
    }
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Opportunities" />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Field label="Search" value={query} onChangeText={setQuery} placeholder="Search opportunities" autoCapitalize="none" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="All" selected={category === 'all'} onPress={() => setCategory('all')} />
          {OPPORTUNITY_CATEGORIES.map((item) => (
            <Chip key={item.value} label={item.label} selected={category === item.value} onPress={() => setCategory(item.value)} />
          ))}
        </ScrollView>

        {data?.canPost ? (
          composing ? (
            <Card>
              <Field label="Title" value={form.title} onChangeText={(v) => set('title', v)} />
              <Field label="Organization" value={form.organization} onChangeText={(v) => set('organization', v)} />
              <Field label="Description" value={form.description} onChangeText={(v) => set('description', v)} multiline />
              <Field label="Eligibility" value={form.eligibility} onChangeText={(v) => set('eligibility', v)} multiline />
              <Field label="Deadline (optional)" value={form.deadline} onChangeText={(v) => set('deadline', v)} placeholder="YYYY-MM-DD" />
              <Field label="Location (optional)" value={form.location} onChangeText={(v) => set('location', v)} />
              <Field label="Application link (optional)" value={form.applyUrl} onChangeText={(v) => set('applyUrl', v)} autoCapitalize="none" placeholder="https://" />
              <View style={styles.wrap}>
                <Chip label={form.remote ? 'Remote' : 'On site'} selected={form.remote} onPress={() => set('remote', !form.remote)} />
              </View>
              <View style={styles.wrap}>
                {OPPORTUNITY_CATEGORIES.map((item) => (
                  <Chip key={item.value} label={item.label} selected={form.category === item.value} onPress={() => set('category', item.value)} />
                ))}
              </View>
              <View style={styles.wrap}>
                <Chip label="Everyone" selected={!form.institutionId} onPress={() => set('institutionId', '')} />
                {data.institutions
                  .filter((item) => data.scope.all || data.scope.institutionIds.includes(item.id))
                  .map((item) => (
                    <Chip key={item.id} label={item.name} selected={form.institutionId === item.id} onPress={() => set('institutionId', item.id)} />
                  ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button label="Cancel" variant="secondary" onPress={() => setComposing(false)} />
                <Button label="Publish" onPress={publish} loading={busy} disabled={!form.title.trim() || !form.organization.trim()} />
              </View>
            </Card>
          ) : (
            <View style={{ marginBottom: 12 }}>
              <Button label="Post an opportunity" icon="add" onPress={() => setComposing(true)} />
            </View>
          )
        ) : null}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="briefcase-outline"
            title="No opportunities yet"
            body="Internships, scholarships, competitions and programs posted by your school and partners will appear here."
          />
        ) : (
          rows.map((item) => {
            const closed = isClosed(item);
            const interested = data?.interested.has(item.id);

            return (
              <Card key={item.id}>
                <View style={styles.top}>
                  <Text style={styles.title}>{item.title}</Text>
                  {closed ? <Badge label="Closed" tone="danger" /> : null}
                </View>
                <Text style={styles.org}>{item.organization}</Text>
                <View style={styles.badges}>
                  <Badge label={OPPORTUNITY_CATEGORIES.find((entry) => entry.value === item.category)?.label ?? item.category} tone="blue" />
                  <Badge label={item.remote ? 'Remote' : item.location ?? 'On site'} />
                  {item.deadline ? <Badge label={`Deadline ${item.deadline}`} tone="orange" /> : null}
                </View>
                <Text style={styles.body}>{item.description}</Text>
                {item.eligibility ? <Text style={styles.meta}>Eligibility: {item.eligibility}</Text> : null}

                <View style={styles.actions}>
                  {data?.userId !== item.postedBy ? (
                    <Button
                      label={item.applyUrl ? 'Apply' : interested ? 'Interest sent' : "I'm interested"}
                      onPress={() => apply(item)}
                      disabled={closed || (!item.applyUrl && interested)}
                    />
                  ) : (
                    <>
                      <Text style={styles.meta}>
                        {data?.interestCounts.get(item.id) ?? 0} interested
                      </Text>
                      <Button
                        label="Delete"
                        variant="danger"
                        onPress={() =>
                          Alert.alert('Delete opportunity', 'This cannot be undone.', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                await deleteOpportunity(item.postedBy, item.id);
                                await reload();
                              },
                            },
                          ])
                        }
                      />
                    </>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 90 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '800' },
    org: { color: colors.accent, fontWeight: '700', marginTop: 4 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    body: { color: colors.textSecondary, lineHeight: 20, marginTop: 10 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 8 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  });
