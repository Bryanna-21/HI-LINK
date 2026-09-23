import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import {
  ThemeColors,
  useTheme,
} from '../../src/theme/ThemeProvider';
import {
  Conversation,
} from '../../src/models/chat';
import {
  getConversations,
} from '../../src/storage/chats';

type ChatFilter =
  | 'all'
  | 'unread'
  | 'groups'
  | 'communities'
  | 'events'
  | 'announcements'
  | 'spam';

const FILTERS: {
  key: ChatFilter;
  label: string;
}[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'groups', label: 'Groups' },
  { key: 'communities', label: 'Communities' },
  { key: 'events', label: 'Events' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'spam', label: 'Spam' },
];

export default function ChatsScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [activeFilter, setActiveFilter] =
    useState<ChatFilter>('all');

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const loadConversations = useCallback(
    async () => {
      const result =
        await getConversations();

      setConversations(result);
    },
    [],
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  const filteredConversations =
    useMemo(() => {
      switch (activeFilter) {
        case 'unread':
          return conversations.filter(
            (conversation) =>
              conversation.unreadCount > 0,
          );

        case 'groups':
          return conversations.filter(
            (conversation) =>
              conversation.type === 'group',
          );

        case 'communities':
          return conversations.filter(
            (conversation) =>
              conversation.type === 'community',
          );

        case 'events':
          return conversations.filter(
            (conversation) =>
              conversation.category === 'event',
          );

        case 'announcements':
          return conversations.filter(
            (conversation) =>
              conversation.category ===
              'announcement',
          );

        case 'spam':
          return conversations.filter(
            (conversation) =>
              conversation.category === 'spam',
          );

        case 'all':
        default:
          return conversations.filter(
            (conversation) =>
              conversation.category !== 'spam',
          );
      }
    }, [activeFilter, conversations]);

  function handleNewChat() {
    Alert.alert(
      'Start a conversation',
      'Choose what you want to create.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New chat',
          onPress: () => router.push('/new-chat'),
        },
        {
          text: 'New group',
          onPress: () => {},
        },
        {
          text: 'Find people',
          onPress: () => {},
        },
      ],
    );
  }

  function renderConversation(
    conversation: Conversation,
  ) {
    const title =
      conversation.title ||
      conversation.participants[0]?.name ||
      'Conversation';

    const preview =
      conversation.lastMessage?.text ||
      'No messages yet';

    return (
      <Pressable
        key={conversation.id}
        style={styles.conversation}
        onPress={() =>
          router.push({
            pathname: '/chat/[id]',
            params: { id: conversation.id },
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {title.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.conversationBody}>
          <View style={styles.conversationTop}>
            <Text
              style={styles.conversationTitle}
              numberOfLines={1}
            >
              {title}
            </Text>

            {conversation.lastMessage ? (
              <Text style={styles.conversationTime}>
                {formatTime(
                  conversation.lastMessage.createdAt,
                )}
              </Text>
            ) : null}
          </View>

          <View style={styles.conversationBottom}>
            <Text
              style={styles.conversationPreview}
              numberOfLines={1}
            >
              {preview}
            </Text>

            {conversation.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {conversation.unreadCount > 99
                    ? '99+'
                    : conversation.unreadCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  const emptyTitle =
    activeFilter === 'all'
      ? 'No conversations yet'
      : `No ${FILTERS.find(
          (filter) =>
            filter.key === activeFilter,
        )?.label.toLowerCase()} chats`;

  const emptyBody =
    activeFilter === 'all'
      ? 'Your chats will appear here when you connect with people.'
      : 'Conversations matching this section will appear here.';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>
            Messages with your people and school communities.
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((filter) => {
          const active =
            activeFilter === filter.key;

          return (
            <Pressable
              key={filter.key}
              onPress={() =>
                setActiveFilter(filter.key)
              }
              style={[
                styles.filter,
                active &&
                  styles.filterActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  active &&
                    styles.filterTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          filteredConversations.length === 0 &&
            styles.listEmptyContent,
        ]}
      >
        {filteredConversations.length > 0 ? (
          filteredConversations.map(
            renderConversation,
          )
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={
                  activeFilter === 'spam'
                    ? 'shield-checkmark-outline'
                    : 'chatbubbles-outline'
                }
                size={34}
                color={colors.accent}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {emptyTitle}
            </Text>

            <Text style={styles.emptyBody}>
              {emptyBody}
            </Text>
          </View>
        )}
      </ScrollView>

      <Pressable
        style={styles.addButton}
        onPress={handleNewChat}
        accessibilityRole="button"
        accessibilityLabel="Start a new chat"
      >
        <Ionicons
          name="add"
          size={30}
          color={colors.background}
        />
      </Pressable>
    </View>
  );
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },

  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  filters: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 8,
  },

  filter: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  filterText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },

  filterTextActive: {
    color: colors.background,
  },

  list: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 120,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },

  listEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  conversation: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: colors.accent,
    fontSize: 19,
    fontWeight: '900',
  },

  conversationBody: {
    flex: 1,
    marginLeft: 12,
  },

  conversationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  conversationTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },

  conversationTime: {
    color: colors.muted,
    fontSize: 11,
  },

  conversationBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 8,
  },

  conversationPreview: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
  },

  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  unreadText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '900',
  },

  empty: {
    padding: 30,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 14,
    textAlign: 'center',
  },

  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 7,
  },

  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 92,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  });
}
