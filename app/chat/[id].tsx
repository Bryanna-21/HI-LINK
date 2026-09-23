import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
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
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
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
import { createOutgoingCall } from '../../src/storage/callService';

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

  const [showAttachmentMenu, setShowAttachmentMenu] =
    useState(false);

  const [isRecording, setIsRecording] =
    useState(false);

  const recorder =
    useAudioRecorder(
      RecordingPresets.HIGH_QUALITY,
    );

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

        const currentIdentity =
          await getIdentity();

        const otherParticipant =
          result.participants.find(
            (participant) =>
              participant.id !==
              currentIdentity?.id,
          ) ??
          result.participants[0];

        if (otherParticipant) {
          const { getUserById } =
            await import('../../src/storage/users');

          const latestUser =
            await getUserById(
              otherParticipant.id,
            );

          if (latestUser) {
            result.participants =
              result.participants.map(
                (participant) =>
                  participant.id ===
                  latestUser.id
                    ? {
                        ...participant,
                        name: latestUser.name,
                        username:
                          latestUser.username,
                        avatarUri:
                          latestUser.avatarUri,
                      }
                    : participant,
              );
          }
        }

        await markConversationRead(
          conversationId,
        );

        const chatMessages =
          await getConversationMessages(
            conversationId,
          );

        setConversation(result);
        setMessages(chatMessages);
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

  async function startCall(
    type: 'voice' | 'video',
  ) {
    if (!conversation || !otherParticipant) {
      return;
    }

    const identity =
      await getIdentity();

    if (!identity) {
      return;
    }

    try {
      const call =
        await createOutgoingCall({
          conversationId:
            conversation.id,
          type,
          caller: {
            id: identity.id,
            name: identity.name,
            username: identity.username,
            avatarUri: identity.avatarUri,
          },
          recipient: {
            id: otherParticipant.id,
            name: otherParticipant.name,
            username: otherParticipant.username,
            avatarUri: otherParticipant.avatarUri,
          },
        });

      router.push({
        pathname: '/call/[id]',
        params: {
          id: call.id,
        },
      });
    } catch (error) {
      console.error(
        'Start call failed:',
        error,
      );
    }
  }

  async function sendAttachment(params: {
    type: 'image' | 'video' | 'audio';
    uri: string;
    name?: string;
  }) {
    if (!conversation || sending) {
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
        type: params.type,
        attachmentUri: params.uri,
        attachmentName: params.name,
        createdAt: now,
      };

      await addMessage(message);

      setMessages((current) => [
        ...current,
        message,
      ]);

      setConversation((current) =>
        current
          ? {
              ...current,
              lastMessage: message,
              updatedAt: now,
            }
          : current,
      );

      setShowAttachmentMenu(false);
    } catch (error) {
      console.error(
        'Send attachment failed:',
        error,
      );
    } finally {
      setSending(false);
    }
  }

  async function pickPhotos() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.9,
      });

    if (
      result.canceled ||
      !result.assets[0]?.uri
    ) {
      return;
    }

    const asset = result.assets[0];

    await sendAttachment({
      type: 'image',
      uri: asset.uri,
      name:
        asset.fileName ??
        `photo-${Date.now()}.jpg`,
    });
  }

  async function takePhoto() {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

    if (
      result.canceled ||
      !result.assets[0]?.uri
    ) {
      return;
    }

    const asset = result.assets[0];

    await sendAttachment({
      type: 'image',
      uri: asset.uri,
      name:
        asset.fileName ??
        `photo-${Date.now()}.jpg`,
    });
  }

  async function pickVideo() {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
      });

    if (
      result.canceled ||
      !result.assets[0]?.uri
    ) {
      return;
    }

    const asset = result.assets[0];

    await sendAttachment({
      type: 'video',
      uri: asset.uri,
      name:
        asset.fileName ??
        `video-${Date.now()}.mp4`,
    });
  }

  async function pickAudio() {
    const result =
      await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

    if (
      result.canceled ||
      !result.assets[0]?.uri
    ) {
      return;
    }

    const asset = result.assets[0];

    await sendAttachment({
      type: 'audio',
      uri: asset.uri,
      name: asset.name,
    });
  }

  async function startRecording() {
    if (isRecording || sending) {
      return;
    }

    try {
      const permission =
        await AudioModule.requestRecordingPermissionsAsync();

      if (!permission.granted) {
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();

      setIsRecording(true);
      setShowAttachmentMenu(false);
    } catch (error) {
      console.error(
        'Start recording failed:',
        error,
      );
      setIsRecording(false);
    }
  }

  async function stopRecording() {
    if (!isRecording) {
      return;
    }

    try {
      await recorder.stop();

      const uri = recorder.uri;

      setIsRecording(false);

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (!uri) {
        return;
      }

      await sendAttachment({
        type: 'audio',
        uri,
        name: `voice-${Date.now()}.m4a`,
      });
    } catch (error) {
      console.error(
        'Stop recording failed:',
        error,
      );
      setIsRecording(false);
    }
  }

  async function handleVoiceButton() {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }

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
      behavior="padding"
      keyboardVerticalOffset={0}
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
          {otherParticipant?.avatarUri ? (
            <Image
              source={{
                uri: otherParticipant.avatarUri,
              }}
              style={styles.headerAvatarImage}
            />
          ) : (
            <Text style={styles.headerAvatarText}>
              {(
                otherParticipant?.name ||
                conversation.title ||
                'C'
              )
                .charAt(0)
                .toUpperCase()}
            </Text>
          )}
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
          onPress={() => startCall('voice')}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Start voice call"
        >
          <Ionicons
            name="call-outline"
            size={21}
            color={colors.text}
          />
        </Pressable>

        <Pressable
          onPress={() => startCall('video')}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Start video call"
        >
          <Ionicons
            name="videocam-outline"
            size={22}
            color={colors.text}
          />
        </Pressable>

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

      {showAttachmentMenu ? (
        <View style={styles.attachmentMenu}>
          <Pressable
            onPress={takePhoto}
            style={styles.attachmentOption}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            <View
              style={[
                styles.attachmentIcon,
                {
                  backgroundColor:
                    colors.accentSoft,
                },
              ]}
            >
              <Ionicons
                name="camera"
                size={21}
                color={colors.accent}
              />
            </View>
            <Text style={styles.attachmentLabel}>
              Camera
            </Text>
          </Pressable>

          <Pressable
            onPress={pickPhotos}
            style={styles.attachmentOption}
            accessibilityRole="button"
            accessibilityLabel="Choose photo"
          >
            <View
              style={[
                styles.attachmentIcon,
                {
                  backgroundColor:
                    colors.blueSoft,
                },
              ]}
            >
              <Ionicons
                name="images"
                size={21}
                color={colors.blue}
              />
            </View>
            <Text style={styles.attachmentLabel}>
              Photos
            </Text>
          </Pressable>

          <Pressable
            onPress={pickVideo}
            style={styles.attachmentOption}
            accessibilityRole="button"
            accessibilityLabel="Choose video"
          >
            <View
              style={[
                styles.attachmentIcon,
                {
                  backgroundColor:
                    colors.orange + '22',
                },
              ]}
            >
              <Ionicons
                name="videocam"
                size={21}
                color={colors.orange}
              />
            </View>
            <Text style={styles.attachmentLabel}>
              Video
            </Text>
          </Pressable>

          <Pressable
            onPress={pickAudio}
            style={styles.attachmentOption}
            accessibilityRole="button"
            accessibilityLabel="Choose audio"
          >
            <View
              style={[
                styles.attachmentIcon,
                {
                  backgroundColor:
                    colors.accentSoft,
                },
              ]}
            >
              <Ionicons
                name="musical-notes"
                size={21}
                color={colors.accent}
              />
            </View>
            <Text style={styles.attachmentLabel}>
              Audio
            </Text>
          </Pressable>

          <Pressable
            onPress={handleVoiceButton}
            style={styles.attachmentOption}
            accessibilityRole="button"
            accessibilityLabel={
              isRecording
                ? 'Stop voice recording'
                : 'Record voice message'
            }
          >
            <View
              style={[
                styles.attachmentIcon,
                {
                  backgroundColor:
                    isRecording
                      ? colors.danger + '22'
                      : colors.blueSoft,
                },
              ]}
            >
              <Ionicons
                name={
                  isRecording
                    ? 'stop'
                    : 'mic'
                }
                size={21}
                color={
                  isRecording
                    ? colors.danger
                    : colors.blue
                }
              />
            </View>
            <Text style={styles.attachmentLabel}>
              {isRecording
                ? 'Stop'
                : 'Voice'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.composer}>
        <Pressable
          onPress={() =>
            setShowAttachmentMenu(
              (current) => !current,
            )
          }
          style={styles.attachButton}
          accessibilityRole="button"
          accessibilityLabel={
            showAttachmentMenu
              ? 'Close attachments'
              : 'Attach media'
          }
        >
          <Ionicons
            name={
              showAttachmentMenu
                ? 'close'
                : 'add'
            }
            size={25}
            color={colors.accent}
          />
        </Pressable>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={
            isRecording
              ? 'Recording voice message…'
              : 'Message'
          }
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
          maxLength={4000}
          editable={!isRecording}
        />

        {input.trim() && !isRecording ? (
          <Pressable
            style={[
              styles.sendButton,
              sending &&
                styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons
              name="send"
              size={19}
              color={colors.background}
            />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleVoiceButton}
            style={[
              styles.voiceButton,
              isRecording &&
                styles.voiceButtonRecording,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isRecording
                ? 'Stop voice recording'
                : 'Record voice message'
            }
          >
            <Ionicons
              name={
                isRecording
                  ? 'stop'
                  : 'mic'
              }
              size={19}
              color={colors.background}
            />
          </Pressable>
        )}
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
        {message.attachmentUri ? (
          <View
            style={[
              styles.attachmentBubble,
              own &&
                styles.attachmentBubbleOwn,
            ]}
          >
            <Ionicons
              name={
                message.type === 'image'
                  ? 'image'
                  : message.type === 'video'
                    ? 'videocam'
                    : 'musical-notes'
              }
              size={24}
              color={
                own
                  ? colors.background
                  : colors.accent
              }
            />

            {message.type === 'image' ? (
              <Image
                source={{
                  uri: message.attachmentUri,
                }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={[
                  styles.attachmentName,
                  own &&
                    styles.attachmentNameOwn,
                ]}
                numberOfLines={2}
              >
                {message.attachmentName ??
                  (message.type === 'video'
                    ? 'Video'
                    : 'Audio')}
              </Text>
            )}
          </View>
        ) : null}

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

        <View style={styles.messageMeta}>
          <Text
            style={[
              styles.messageTime,
              own &&
                styles.messageTimeOwn,
            ]}
          >
            {formatTime(message.createdAt)}
          </Text>

          {own ? (
            <Text
              style={[
                styles.readReceipt,
                message.readAt
                  ? styles.readReceiptRead
                  : styles.readReceiptDelivered,
              ]}
            >
              {message.readAt ? '✓✓' : '✓'}
            </Text>
          ) : null}
        </View>
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

  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 18,
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

  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },

  readReceipt: {
    fontSize: 11,
    fontWeight: '800',
  },

  readReceiptDelivered: {
    color: colors.background,
  },

  readReceiptRead: {
    color: colors.blue,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 24,
    paddingBottom: 24,
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

  attachmentMenu: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },

  attachmentOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  attachmentIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  attachmentLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
  },

  attachmentBubble: {
    minWidth: 170,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  attachmentBubbleOwn: {
    opacity: 0.98,
  },

  attachmentName: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  attachmentNameOwn: {
    color: colors.background,
  },

  messageImage: {
    width: 190,
    height: 150,
    borderRadius: 12,
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

  voiceButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  voiceButtonRecording: {
    backgroundColor: colors.danger,
  },

  sendButtonDisabled: {
    opacity: 0.35,
  },
  });
}
