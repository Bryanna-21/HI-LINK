import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { HiLinkUser } from '../../src/models/user';
import { getIdentity } from '../../src/storage/identity';
import { getKnownUsers } from '../../src/storage/users';
import {
  ThemeColors,
  useTheme,
} from '../../src/theme/ThemeProvider';

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [users, setUsers] = useState<HiLinkUser[]>([]);
  const [query, setQuery] = useState('');
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      const [identity, knownUsers] =
        await Promise.all([
          getIdentity(),
          getKnownUsers(),
        ]);

      setIdentityId(identity?.id ?? null);

      setUsers(
        knownUsers.filter(
          (user) => user.id !== identity?.id,
        ),
      );
    } catch (error) {
      console.error(
        'Load Discover users failed:',
        error,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalized =
      query.trim().toLowerCase();

    if (!normalized) {
      return users;
    }

    return users.filter((user) =>
      [
        user.name,
        user.username,
        user.schoolName,
        user.course,
        user.faculty,
      ]
        .filter(Boolean)
        .some((value) =>
          value!
            .toLowerCase()
            .includes(normalized),
        ),
    );
  }, [query, users]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Discover</Text>

      <Text style={styles.subtitle}>
        Find people, schools, clubs and things happening around you.
      </Text>

      <View style={styles.search}>
        <Ionicons
          name="search-outline"
          size={19}
          color={colors.muted}
        />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Hi-Link"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <Text style={styles.section}>
        People
      </Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator
            size="small"
            color={colors.accent}
          />

          <Text style={styles.loadingText}>
            Loading people...
          </Text>
        </View>
      ) : filteredUsers.length > 0 ? (
        filteredUsers.map((user) => (
          <Pressable
            key={user.id}
            style={styles.personCard}
            onPress={() =>
              router.push({
                pathname: '/profile/[id]',
                params: { id: user.id },
              })
            }
          >
            <View style={styles.avatar}>
              {user.avatarUri ? (
                <Image
                  source={{ uri: user.avatarUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user.name
                    .trim()
                    .charAt(0)
                    .toUpperCase() || '?'}
                </Text>
              )}
            </View>

            <View style={styles.personText}>
              <Text style={styles.personName}>
                {user.name}
              </Text>

              <Text style={styles.personUsername}>
                @{user.username}
              </Text>

              {user.schoolName ? (
                <Text
                  style={styles.personMeta}
                  numberOfLines={1}
                >
                  {user.schoolName}
                </Text>
              ) : null}
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={19}
              color={colors.muted}
            />
          </Pressable>
        ))
      ) : (
        <View style={styles.empty}>
          <Ionicons
            name="people-outline"
            size={32}
            color={colors.muted}
          />

          <Text style={styles.emptyTitle}>
            {query.trim()
              ? 'No people found'
              : 'No other people yet'}
          </Text>

          <Text style={styles.emptyText}>
            {query.trim()
              ? 'Try another name, username, school or course.'
              : 'People will appear here as HI-LINK users become known locally.'}
          </Text>
        </View>
      )}

      <Text style={styles.section}>
        Explore
      </Text>

      {[
        ['Schools', 'Discover school communities', 'school-outline'],
        ['Clubs', 'Find clubs and activities', 'people-outline'],
        ['Sports', 'Follow teams and sports', 'football-outline'],
        ['Study', 'Find notes and resources', 'book-outline'],
      ].map(([title, description], index) => (
        <View style={styles.card} key={title}>
          <View
            style={[
              styles.icon,
              index % 2 === 0
                ? styles.greenIcon
                : styles.blueIcon,
            ]}
          >
            <Ionicons
              name={description === 'Follow teams and sports'
                ? 'football-outline'
                : index === 0
                  ? 'school-outline'
                  : index === 1
                    ? 'people-outline'
                    : 'book-outline'}
              size={21}
              color={colors.text}
            />
          </View>

          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>
              {title}
            </Text>

            <Text style={styles.cardBody}>
              {description}
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 110,
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
  search: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 22,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    marginLeft: 9,
    paddingVertical: 0,
  },
  loading: {
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '900',
  },
  personText: {
    flex: 1,
    marginLeft: 13,
    minWidth: 0,
  },
  personName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  personUsername: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 2,
  },
  personMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  empty: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 5,
  },
  section: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    marginBottom: 10,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenIcon: {
    backgroundColor: colors.accentSoft,
  },
  blueIcon: {
    backgroundColor: colors.blueSoft,
  },
  iconText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  cardText: {
    flex: 1,
    marginLeft: 13,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cardBody: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  arrow: {
    color: colors.muted,
    fontSize: 28,
    marginLeft: 8,
  },
});
