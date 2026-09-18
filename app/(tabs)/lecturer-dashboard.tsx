import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { StatusBanner } from '../../src/components/StatusBanner';
import { useColors, Radius, Spacing } from '../../src/constants/theme';

// STATUS: SHELL — this is the first screen behind the lecturer role
// gate (see (tabs)/_layout.tsx's Tabs.Protected block). The backend
// for every item below is confirmed real (exam CRUD + grading,
// course management, announcements — see UNILINK-BACKEND's
// exam.controller.js, course.controller.js). Nothing here has been
// wired to it yet; this screen exists to prove the role-gated nav
// itself works, not to be a finished feature.

const COMING_SOON = [
  { key: 'exams', title: 'Exams', desc: 'Create, edit, publish, and grade exams for your courses.' },
  { key: 'courses', title: 'Course management', desc: 'Manage the courses you teach.' },
  { key: 'announcements', title: 'Announcements', desc: 'Post announcements to your students.' },
] as const;

export default function LecturerDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const colors = useColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        title: {
          fontSize: 24,
          fontWeight: '800',
          color: colors.text,
          padding: Spacing.md,
          paddingTop: Spacing.xl,
          paddingBottom: 0,
        },
        greeting: { fontSize: 14, color: colors.textMuted, paddingHorizontal: Spacing.md, marginTop: 4 },
        list: { padding: Spacing.md, gap: Spacing.sm },
        card: {
          backgroundColor: colors.surface,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: Spacing.lg,
        },
        cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
        cardDesc: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
      }),
    [colors]
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Lecturer
      </Text>
      <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] || 'there'} 👋</Text>

      <StatusBanner
        status="shell"
        note="Backend for exams, courses, and announcements is real and already used on web — mobile screens for each are next."
      />

      <View style={styles.list}>
        {COMING_SOON.map((item) => (
          <View key={item.key} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
