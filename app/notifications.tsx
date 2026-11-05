import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';

import type { HiLinkNotification, NotificationType } from '../src/models/campus';
import {
  deleteNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../src/storage/notifications';
import { useLoad } from '../src/hooks/useLoad';
import { useTheme, ThemeColors } from '../src/theme/ThemeProvider';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenHeader,
} from '../src/components/ui';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<NotificationType, IconName> = {
  message: 'chatbubble-outline',
  reaction: 'heart-outline',
  comment: 'chatbox-outline',
  follow: 'person-add-outline',
  follow_request: 'person-add-outline',
  community: 'people-outline',
  announcement: 'megaphone-outline',
  assignment: 'document-text-outline',
  assessment: 'clipboard-outline',
  timetable: 'time-outline',
  event: 'calendar-outline',
  emergency: 'warning-outline',
  admin: 'shield-checkmark-outline',
  report: 'flag-outline',
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;

  return `${Math.floor(seconds / 86400)}d`;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { data, loading, error, reload } = useLoad(getMyNotifications);

  async function open(item: HiLinkNotification) {
    await markNotificationRead(item.id);

    if (item.route) {
      router.push({ pathname: item.route.pathname, params: item.route.params } as Href);
    } else {
      await reload();
    }
  }

  async function markAll() {
    await markAllNotificationsRead();
    await reload();
  }

  async function dismiss(id: string) {
    await deleteNotification(id);
    await reload();
  }

  const unread = data?.filter((item) => !item.readAt).length ?? 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : undefined}
        right={unread > 0 ? <Button label="Read all" variant="secondary" onPress={markAll} /> : undefined}
      />

      {loading ? (
        <View style={styles.pad}>
          <LoadingState />
        </View>
      ) : error ? (
        <View style={styles.pad}>
          <ErrorState message={error} onRetry={reload} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.pad}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-outline"
              title="You're all caught up"
              body="Reactions, comments, announcements, assignments and event reminders will appear here."
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              style={[styles.row, !item.readAt && styles.rowUnread]}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.readAt ? 'Read' : 'Unread'}`}
            >
              <View style={[styles.icon, item.type === 'emergency' && { backgroundColor: colors.danger }]}>
                <Ionicons
                  name={ICONS[item.type]}
                  size={20}
                  color={item.type === 'emergency' ? colors.background : colors.accent}
                />
              </View>

              <View style={styles.text}>
                <Text style={styles.title}>{item.title}</Text>
                {item.body ? (
                  <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>

              <Pressable
                onPress={() => dismiss(item.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Dismiss notification"
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 60 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 10,
    },
    rowUnread: { borderColor: colors.accent },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: { flex: 1, minWidth: 0 },
    title: { color: colors.text, fontSize: 14, fontWeight: '800' },
    body: { color: colors.muted, fontSize: 12, marginTop: 3 },
    time: { color: colors.muted, fontSize: 11, marginTop: 4 },
  });
