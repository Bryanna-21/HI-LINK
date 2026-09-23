import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import {
  ThemeColors,
  useTheme,
} from '../src/theme/ThemeProvider';
import { HiLinkUser } from '../src/models/user';
import { Post } from '../src/models/post';
import { Conversation } from '../src/models/chat';
import { getIdentity } from '../src/storage/identity';
import { getKnownUsers } from '../src/storage/users';
import {
  addConversation,
  getConversations,
} from '../src/storage/chats';

interface Person {
  id: string;
  name: string;
  username: string;
  avatarUri?: string;
  schoolName?: string;
}

export default function NewChatScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [identity, setIdentity] =
    useState<HiLinkUser | null>(null);

  const [people, setPeople] =
    useState<Person[]>([]);

  const [query, setQuery] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [creatingId, setCreatingId] =
    useState<string | null>(null);

  const loadPeople = useCallback(
    async () => {
      try {
        const currentIdentity =
          await getIdentity();

        setIdentity(currentIdentity);

        const knownUsers =
          await getKnownUsers();

        setPeople(
          knownUsers
            .filter(
              (user) =>
                user.id !== currentIdentity?.id,
            )
            .map((user) => ({
              id: user.id,
              name: user.name,
              username: user.username,
              avatarUri: user.avatarUri,
              schoolName: user.schoolName,
            })),
        );
      } catch (error) {
        console.error(
          'Load people failed:',
          error,
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const filteredPeople =
    useMemo(() => {
      const normalized =
        query.trim().toLowerCase();

      if (!normalized) {
        return people;
      }

      return people.filter((person) =>
        [
          person.name,
          person.username,
          person.schoolName,
        ]
          .filter(Boolean)
          .some((value) =>
            value!
              .toLowerCase()
              .includes(normalized),
          ),
      );
    }, [people, query]);

  async function startConversation(
    person: Person,
  ) {
    if (!identity || creatingId) {
      return;
    }

    setCreatingId(person.id);

    try {
      const conversations =
        await getConversations();

      const existing =
        conversations.find(
          (conversation) =>
            conversation.type ===
              'direct' &&
            conversation.participants.some(
              (participant) =>
                participant.id ===
                identity.id,
            ) &&
            conversation.participants.some(
              (participant) =>
                participant.id ===
                person.id,
            ),
        );

      if (existing) {
        router.push({
          pathname: '/chat/[id]',
          params: { id: existing.id },
        });
        return;
      }

      const now =
        new Date().toISOString();

      const conversation: Conversation = {
        id: `chat-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        type: 'direct',
        category: 'normal',
        participants: [
          {
            id: identity.id,
            name: identity.name,
            username: identity.username,
            avatarUri:
              identity.avatarUri,
          },
          {
            id: person.id,
            name: person.name,
            username: person.username,
            avatarUri:
              person.avatarUri,
          },
        ],
        unreadCount: 0,
        pinned: false,
        muted: false,
        createdAt: now,
        updatedAt: now,
      };

      await addConversation(
        conversation,
      );

      router.push({
        pathname: '/chat/[id]',
        params: { id: conversation.id },
      });
    } catch (error) {
      console.error(
        'Create conversation failed:',
        error,
      );
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.title}>
          New Chat
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchWrap}>
        <Ionicons
          name="search"
          size={20}
          color={colors.muted}
        />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search people"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={
          styles.content
        }
      >
        <Text style={styles.sectionTitle}>
          People
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator
              color={colors.accent}
            />
          </View>
        ) : filteredPeople.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="people-outline"
              size={38}
              color={colors.accent}
            />

            <Text
              style={styles.emptyTitle}
            >
              {query.trim()
                ? 'No people found'
                : 'No people available yet'}
            </Text>

            <Text
              style={styles.emptyBody}
            >
              {query.trim()
                ? 'Try another name or username.'
                : 'People will appear here as HI-LINK users become discoverable.'}
            </Text>
          </View>
        ) : (
          filteredPeople.map(
            (person) => (
              <Pressable
                key={person.id}
                style={styles.person}
                onPress={() =>
                  startConversation(
                    person,
                  )
                }
                disabled={
                  creatingId !== null
                }
              >
                <View
                  style={styles.avatar}
                >
                  <Text
                    style={
                      styles.avatarText
                    }
                  >
                    {person.name
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View
                  style={
                    styles.personBody
                  }
                >
                  <Text
                    style={
                      styles.personName
                    }
                    numberOfLines={1}
                  >
                    {person.name}
                  </Text>

                  <Text
                    style={
                      styles.personUsername
                    }
                    numberOfLines={1}
                  >
                    @{person.username}
                    {person.schoolName
                      ? ` • ${person.schoolName}`
                      : ''}
                  </Text>
                </View>

                {creatingId ===
                person.id ? (
                  <ActivityIndicator
                    color={colors.accent}
                  />
                ) : (
                  <Ionicons
                    name="chatbubble-outline"
                    size={21}
                    color={colors.accent}
                  />
                )}
              </Pressable>
            ),
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  headerSpacer: {
    width: 42,
  },

  searchWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: colors.text,
    fontSize: 15,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },

  center: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  person: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '900',
  },

  personBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  personName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  personUsername: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  empty: {
    marginTop: 30,
    padding: 30,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },

  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    textAlign: 'center',
  },
  });
}
