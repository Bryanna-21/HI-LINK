import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeProvider';
import { getAcademicStore } from '../src/storage/academic';
import type { AcademicStore } from '../src/models/academic';

export default function AcademicsScreen() {
  const { colors } = useTheme();
  const [store, setStore] = useState<AcademicStore | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => setStore(await getAcademicStore()), []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const refresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  const settings = store?.settings;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>HI-LINK ACADEMICS</Text>
            <Text style={[styles.title, { color: colors.text }]}>Learn. Build. Grow.</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Your local CBC/CBE-ready study space.</Text>
          </View>
          <Ionicons name="school-outline" size={34} color={colors.accent} />
        </View>

        <View style={[styles.contextCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Current learning context</Text>
          <Text style={[styles.contextText, { color: colors.muted }]}>
            {settings?.schoolName || 'School not set'}{settings?.currentForm ? ` • ${settings.currentForm}` : ''}{settings?.currentStream ? ` • ${settings.currentStream}` : ''}
          </Text>
        </View>

        <View style={styles.grid}>
          <Tile icon="book-outline" title="Subjects" value={String(store?.subjects.length ?? 0)} colors={colors} />
          <Tile icon="bulb-outline" title="Competencies" value={String(store?.competencies.length ?? 0)} colors={colors} />
          <Tile icon="document-text-outline" title="Resources" value={String(store?.resources.length ?? 0)} colors={colors} />
          <Tile icon="clipboard-outline" title="Assessments" value={String(store?.assessments.length ?? 0)} colors={colors} />
        </View>

        <Section title="CBC / CBE" subtitle="Learning outcomes, competencies, values and projects." icon="sparkles-outline" colors={colors} />
        <Section title="Study resources" subtitle="Notes, assignments, CATs, exams, past papers and revision material." icon="library-outline" colors={colors} />
        <Section title="Academic discussions" subtitle="Subject and study conversations connected to the local social layer." icon="chatbubbles-outline" colors={colors} />

        {!store || (store.subjects.length === 0 && store.resources.length === 0 && store.assessments.length === 0) ? (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="school-outline" size={30} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Your academic space is ready</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Add subjects, learning outcomes, study resources and assessments as the academic modules are built.</Text>
          </View>
        ) : null}
        <Text style={[styles.localNote, { color: colors.muted }]}>Academic data is stored locally on this device.</Text>
      </ScrollView>
    </View>
  );
}

function Tile({ icon, title, value, colors }: any) {
  return <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name={icon} size={22} color={colors.accent} /><Text style={[styles.tileValue, { color: colors.text }]}>{value}</Text><Text style={[styles.tileTitle, { color: colors.muted }]}>{title}</Text></View>;
}

function Section({ title, subtitle, icon, colors }: any) {
  return <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name={icon} size={24} color={colors.accent} /><View style={styles.sectionCopy}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{subtitle}</Text></View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, content: { padding: 20, paddingBottom: 40 }, headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 }, headerText: { flex: 1 }, eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 4 }, title: { fontSize: 28, fontWeight: '800' }, subtitle: { fontSize: 14, lineHeight: 20, marginTop: 5 }, contextCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 }, cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 }, contextText: { fontSize: 14, lineHeight: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }, tile: { width: '48%', minHeight: 105, borderWidth: 1, borderRadius: 16, padding: 14 }, tileValue: { fontSize: 25, fontWeight: '800', marginTop: 9 }, tileTitle: { fontSize: 13, marginTop: 2 }, section: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 10, gap: 13 }, sectionCopy: { flex: 1 }, sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 }, sectionSubtitle: { fontSize: 13, lineHeight: 19 }, empty: { borderWidth: 1, borderRadius: 16, padding: 22, alignItems: 'center', marginTop: 6 }, emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10, textAlign: 'center' }, emptyText: { fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' }, localNote: { textAlign: 'center', fontSize: 12, marginTop: 18 },
});
