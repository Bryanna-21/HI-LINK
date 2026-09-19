import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../src/api/client';
import { StatusBanner } from '../../src/components/StatusBanner';
import { useColors, Radius, Spacing } from '../../src/constants/theme';

// STATUS: REAL — calls GET /api/emergency/my-reports on the live
// backend. Response shape is deliberately narrow: the backend's own
// toStudentView() strips internalNotes, assignedTo, priority, and
// courseId before this ever reaches the client — a student sees only
// {_id, type, message, location, status, createdAt, resolvedAt}, not
// the full EmergencyReport document. Don't add fields here expecting
// them to appear; the backend will never send them to this endpoint.

type ReportStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESPONDING' | 'ESCALATED' | 'RESOLVED' | 'DISMISSED';
type ReportType = 'medical' | 'safety' | 'abuse';

interface MyReport {
  _id: string;
  type: ReportType;
  message?: string;
  location?: string;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
}

const TYPE_LABEL: Record<ReportType, string> = {
  medical: '🏥 Medical',
  safety: '⚠️ Safety',
  abuse: '🚫 Abuse',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MyReportsScreen() {
  const colors = useColors();
  const styles = useMyReportsStyles(colors);

  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/emergency/my-reports');
      setReports(res.data?.data ?? []);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Could not load your reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload on every focus, not just on mount: a student who submits a
  // new report on the Emergency tab and then navigates here should
  // see it without a manual pull-to-refresh. useFocusEffect alone
  // covers both initial mount and refocus - no separate useEffect
  // needed (that would double-fetch on first open).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // No stored/inferred colors beyond what theme.ts already exposes
  // (primary, danger) — RESOLVED/DISMISSED get textMuted since there
  // is no dedicated "success"/neutral-closed color in this palette,
  // and inventing a one-off hex here would be its own inconsistency.
  const statusColor = (status: ReportStatus) => {
    if (status === 'ESCALATED') return colors.danger;
    if (status === 'RESOLVED' || status === 'DISMISSED') return colors.textMuted;
    return colors.primary;
  };

  const renderItem = ({ item }: { item: MyReport }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.typeLabel}>{TYPE_LABEL[item.type]}</Text>
        <View style={[styles.statusPill, { borderColor: statusColor(item.status) }]}>
          <Text style={[styles.statusPillText, { color: statusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      {!!item.message && <Text style={styles.message}>{item.message}</Text>}
      {!!item.location && <Text style={styles.meta}>📍 {item.location}</Text>}

      <Text style={styles.meta}>Submitted {formatDate(item.createdAt)}</Text>
      {item.resolvedAt && <Text style={styles.meta}>Resolved {formatDate(item.resolvedAt)}</Text>}
    </View>
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
      data={reports}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
      }
      contentContainerStyle={reports.length === 0 ? styles.emptyContainer : styles.listContent}
      ListHeaderComponent={
        <>
          <Text style={styles.title} accessibilityRole="header">
            My Reports
          </Text>
          <StatusBanner status="real" note="Your own submitted emergency reports, from the real backend." />
          {loadError && <Text style={styles.errorText}>{loadError}</Text>}
        </>
      }
      ListEmptyComponent={
        !loadError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You haven't submitted any emergency reports.</Text>
          </View>
        ) : null
      }
    />
  );
}

// Theme-aware styles rebuilt on palette change — same pattern as
// emergency.tsx / courses.tsx / community.tsx. Do not switch this to
// a module-level StyleSheet.create with a static Colors import.
function useMyReportsStyles(colors: ReturnType<typeof useColors>) {
  return useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
        listContent: { padding: Spacing.md, gap: Spacing.sm },
        emptyContainer: { flexGrow: 1, padding: Spacing.md },
        title: {
          fontSize: 20,
          fontWeight: '800',
          color: colors.text,
          marginTop: Spacing.md,
          marginBottom: Spacing.sm,
        },
        errorText: {
          color: colors.danger,
          fontSize: 13,
          marginBottom: Spacing.sm,
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: Spacing.md,
          marginBottom: Spacing.sm,
        },
        cardHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: Spacing.xs,
        },
        typeLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
        statusPill: {
          borderWidth: 1,
          borderRadius: Radius.sm,
          paddingHorizontal: Spacing.sm,
          paddingVertical: 2,
        },
        statusPillText: { fontSize: 11, fontWeight: '700' },
        message: { fontSize: 14, color: colors.text, marginTop: 4 },
        meta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
        emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl },
        emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
      }),
    [colors]
  );
}
