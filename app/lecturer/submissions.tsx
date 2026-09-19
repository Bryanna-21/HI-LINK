import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api/client';
import { StatusBanner } from '../../src/components/StatusBanner';
import { useColors, Radius, Spacing } from '../../src/constants/theme';

// STATUS: REAL — GET /api/exams/submissions calls the live backend
// built two sessions ago. Flat list across every exam this lecturer
// owns, no examId filter (matches how this route is actually
// implemented server-side).

interface Submission {
  _id: string;
  student: { name: string; email: string; admissionNumber?: string } | null;
  exam: { title: string } | null;
  score: number | null;
  totalMarks: number | null;
  status: 'Pending' | 'Passed' | 'Failed';
  submittedAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function LecturerSubmissionsScreen() {
  const colors = useColors();
  const styles = useStyles(colors);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'Pending' | 'Passed' | 'Failed'>('all');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/exams/submissions');
      setSubmissions(res.data?.data ?? []);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Could not load submissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(
    () => (filter === 'all' ? submissions : submissions.filter((s) => s.status === filter)),
    [submissions, filter]
  );

  const statusColor = (status: Submission['status']) => {
    if (status === 'Passed') return colors.secondary;
    if (status === 'Failed') return colors.danger;
    return colors.primary;
  };

  const renderItem = ({ item }: { item: Submission }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/lecturer/submission/${item._id}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.studentName}>{item.student?.name || 'Unknown student'}</Text>
        <View style={[styles.statusPill, { borderColor: statusColor(item.status) }]}>
          <Text style={[styles.statusPillText, { color: statusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.examTitle}>{item.exam?.title || 'Unknown exam'}</Text>
      <Text style={styles.meta}>
        {item.score !== null ? `${item.score}/${item.totalMarks}` : 'Not graded yet'} · {formatDate(item.submittedAt)}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={filtered}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
      ListHeaderComponent={
        <>
          <Text style={styles.title} accessibilityRole="header">
            Grade Submissions
          </Text>
          <StatusBanner status="real" note="Every submission across your exams, from the live backend." />
          {loadError && <Text style={styles.errorText}>{loadError}</Text>}
          <View style={styles.filterRow}>
            {(['all', 'Pending', 'Passed', 'Failed'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      }
      ListEmptyComponent={
        !loadError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No submissions yet.</Text>
          </View>
        ) : null
      }
    />
  );
}

function useStyles(colors: ReturnType<typeof useColors>) {
  return useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
        listContent: { padding: Spacing.md, gap: Spacing.sm },
        emptyContainer: { flexGrow: 1, padding: Spacing.md },
        title: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
        errorText: { color: colors.danger, fontSize: 13, marginBottom: Spacing.sm },
        filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
        filterButton: {
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.xs,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        filterButtonActive: { borderColor: colors.primary, backgroundColor: colors.primary },
        filterButtonText: { fontSize: 12, color: colors.text },
        filterButtonTextActive: { color: colors.white, fontWeight: '700' },
        card: {
          backgroundColor: colors.surface,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: Spacing.md,
          marginBottom: Spacing.sm,
        },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        studentName: { fontSize: 15, fontWeight: '700', color: colors.text },
        statusPill: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
        statusPillText: { fontSize: 11, fontWeight: '700' },
        examTitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
        meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
        emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl },
        emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
      }),
    [colors]
  );
}
