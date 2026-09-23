import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import {
  ThemeColors,
  useTheme,
} from '../../src/theme/ThemeProvider';
import {
  Conversation,
  Message,
} from '../../src/models/chat';
import {
  addMessage,
  getConversation,
  getConversationMessages,
  markConversationRead,
} from '../../src/storage/chats';
import { getIdentity } from '../../src/storage/identity';

export default function ChatScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const conversationId = Array.isArray(id)
    ? id[0]
    : id;

  const [conversation, setConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [identityId, setIdentityId] =
    useState<string | null>(null);

  const loadChat = useCallback(
    async () => {
      if (!conversationId) {
        setLoading(false);
        return;
      }

      try {
        const result =
          await getConversation(
            conversationId,
          );

        if (!result) {
          router.back();
          return;
        }

        const chatMessages =
          await getConversationMessages(
            conversationId,
          );

        setConversation(result);
        setMessages(chatMessages);

        await markConversationRead(
          conversationId,
        );
      } catch (error) {
        console.error(
          'Load chat failed:',
          error,
        );
      } finally {
        setLoading(false);
      }
    },
    [conversationId],
  );

  useEffect(() => {
    loadChat();
  }, [loadChat]);

  useEffect(() => {
    let mounted = true;

    getIdentity().then((identity) => {
      if (mounted) {
        setIdentityId(identity?.id ?? null);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const otherParticipant =
    useMemo(() => {
      if (!conversation) {
        return null;
      }

      return (
        conversation.participants[1] ??
        conversation.participants[0] ??
        null
      );
    }, [conversation]);

  async function sendMessage() {
    const text = input.trim();

    if (
      !text ||
      !conversation ||
      sending
    ) {
      return;
    }

    const identity =
      await getIdentity();

    if (!identity) {
      return;
    }

    setSending(true);

    try {
      const now =
        new Date().toISOString();

      const message: Message = {
        id: `message-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        conversationId:
          conversation.id,
        senderId: identity.id,
        senderName: identity.name,
        senderUsername:
          identity.username,
        type: 'text',
        text,
        createdAt: now,
      };

      await addMessage(message);

      setMessages((current) => [
        ...current,
        message,
      ]);

      setInput('');

      setConversation((current) =>
        current
          ? {
              ...current,
              lastMessage: message,
              updatedAt: now,
            }
          : current,
      );
    } catch (error) {
      console.error(
        'Send message failed:',
        error,
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />
      </View>
    );
  }

  if (!conversation) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {(
              otherParticipant?.name ||
              conversation.title ||
              'C'
            )
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerInfo}>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {otherParticipant?.name ||
              conversation.title ||
              'Conversation'}
          </Text>

          {otherParticipant?.username ? (
            <Text
              style={styles.headerSubtitle}
              numberOfLines={1}
            >
              @{otherParticipant.username}
            </Text>
          ) : null}
        </View>

        <Pressable
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Chat options"
        >
          <Ionicons
            name="ellipsis-vertical"
            size={22}
            color={colors.text}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.messages}
        contentContainerStyle={
          styles.messagesContent
        }
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="chatbubble-outline"
                size={30}
                color={colors.accent}
              />
            </View>

            <Text style={styles.emptyTitle}>
              Start the conversation
            </Text>

            <Text style={styles.emptyBody}>
              Send a message to get things
              started.
            </Text>
          </View>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              own={
                identityId !== null &&
                message.senderId === identityId
              }
            />
          ))
        )}
      </ScrollView>

      <View style={styles.composer}>
        <Pressable
          style={styles.attachButton}
          accessibilityRole="button"
          accessibilityLabel="Attach"
        >
          <Ionicons
            name="add"
            size={25}
            color={colors.accent}
          />
        </Pressable>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Message"
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
          maxLength={4000}
        />

        <Pressable
          style={[
            styles.sendButton,
            (!input.trim() || sending) &&
              styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!input.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          <Ionicons
            name="send"
            size={19}
            color={colors.background}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({
  message,
  own,
}: {
  message: Message;
  own: boolean;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View
      style={[
        styles.messageRow,
        own
          ? styles.messageRowOwn
          : styles.messageRowOther,
      ]}
    >
      <View
        style={[
          styles.bubble,
          own
            ? styles.bubbleOwn
            : styles.bubbleOther,
        ]}
      >
        {message.text ? (
          <Text
            style={[
              styles.messageText,
              own &&
                styles.messageTextOwn,
            ]}
          >
            {message.text}
          </Text>
        ) : null}

        <Text
          style={[
            styles.messageTime,
            own &&
              styles.messageTimeOwn,
          ]}
        >
          {formatTime(message.createdAt)}
        </Text>
      </View>
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

  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerAvatarText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },

  headerInfo: {
    flex: 1,
    marginHorizontal: 10,
  },

  headerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  headerSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },

  messages: {
    flex: 1,
  },

  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 18,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },

  messageRow: {
    flexDirection: 'row',
    marginVertical: 3,
  },

  messageRowOwn: {
    justifyContent: 'flex-end',
  },

  messageRowOther: {
    justifyContent: 'flex-start',
  },

  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 18,
  },

  bubbleOwn: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 5,
  },

  bubbleOther: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 5,
  },

  messageText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },

  messageTextOwn: {
    color: colors.background,
  },

  messageTime: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right',
  },

  messageTimeOwn: {
    color: colors.accentDark,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
  },

  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 6,
  },

  composer: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: 7,
  },

  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 21,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
  },

  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButtonDisabled: {
    opacity: 0.35,
  },
  });
}
