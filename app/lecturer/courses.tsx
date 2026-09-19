import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '../../src/api/client';
import { StatusBanner } from '../../src/components/StatusBanner';
import { useColors, Radius, Spacing } from '../../src/constants/theme';

// STATUS: REAL — GET /api/courses on the live backend, already
// correctly scoped server-side to { lecturerId: req.user.id } for a
// lecturer (see course.controller.js's getCourses) - no client-side
// filtering needed here.

interface Course {
  _id: string;
  title: string;
  code: string;
  description?: string;
  enrolledStudentIds: string[];
}

export default function LecturerCoursesScreen() {
  const colors = useColors();
  const styles = useStyles(colors);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get('/courses');
      setCourses(res.data?.data ?? []);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Could not load your courses.');
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

  const renderItem = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/lecturer/course/${item._id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.courseTitle}>{item.title}</Text>
        <View style={styles.codeBadge}>
          <Text style={styles.codeBadgeText}>{item.code}</Text>
        </View>
      </View>
      {!!item.description && <Text style={styles.description}>{item.description}</Text>}
      <Text style={styles.meta}>{(item.enrolledStudentIds || []).length} students enrolled</Text>
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
      data={courses}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
      }
      contentContainerStyle={courses.length === 0 ? styles.emptyContainer : styles.listContent}
      ListHeaderComponent={
        <>
          <Text style={styles.title} accessibilityRole="header">
            My Courses
          </Text>
          <StatusBanner status="real" note="Courses you teach, from the live backend." />
          {loadError && <Text style={styles.errorText}>{loadError}</Text>}
        </>
      }
      ListEmptyComponent={
        !loadError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>You don't teach any courses yet.</Text>
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
        card: {
          backgroundColor: colors.surface,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: Spacing.md,
          marginBottom: Spacing.sm,
        },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
        courseTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1, marginRight: Spacing.sm },
        codeBadge: {
          backgroundColor: colors.primary,
          borderRadius: Radius.sm,
          paddingHorizontal: Spacing.sm,
          paddingVertical: 2,
        },
        codeBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
        description: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
        meta: { fontSize: 12, color: colors.textMuted, marginTop: Spacing.xs },
        emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl },
        emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
      }),
    [colors]
  );
}
