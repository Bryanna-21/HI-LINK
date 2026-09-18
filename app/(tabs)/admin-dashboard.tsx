import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { StatusBanner } from '../../src/components/StatusBanner';
import { useColors, Radius, Spacing } from '../../src/constants/theme';

// STATUS: SHELL — first screen behind the admin role gate (see
// (tabs)/_layout.tsx's Tabs.Protected block). Backend for every item
// below is confirmed real (admin/unit/university CRUD with full
// audit logging, plus the general user directory and dashboard
// stats added on web — see UNILINK-BACKEND's admin.controller.js).
// Nothing here is wired yet; proves the role-gated nav works, not a
// finished feature.

const COMING_SOON = [
  { key: 'users', title: 'User directory', desc: 'Browse and search every user, any role.' },
  { key: 'admins', title: 'Admin management', desc: 'Create, list, update, and remove admin accounts.' },
  { key: 'units', title: 'Units & universities', desc: 'Manage units and universities.' },
  { key: 'audit', title: 'Audit log', desc: 'Review a record of admin actions.' },
] as const;

export default function AdminDashboardScreen() {
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
        Admin
      </Text>
      <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0] || 'there'} 👋</Text>

      <StatusBanner
        status="shell"
        note="Backend for the user directory, admin/unit/university CRUD, and audit log is real and already used on web — mobile screens for each are next."
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
