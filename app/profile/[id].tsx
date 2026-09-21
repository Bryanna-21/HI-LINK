import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../src/theme/colors';
import { HiLinkUser } from '../../src/models/user';
import { getIdentity } from '../../src/storage/identity';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [user, setUser] = useState<HiLinkUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const identity = await getIdentity();

    if (!identity) {
      router.replace('/onboarding');
      return;
    }

    if (identity.id === id) {
      setUser(identity);
    } else {
      // Other-user profiles will be backed by the
      // local user directory when that is introduced.
      setUser(null);
    }

    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.exileGreen}
        />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.white}
            />
          </Pressable>

          <Text style={styles.headerTitle}>
            Profile
          </Text>
        </View>

        <View style={styles.notFound}>
          <View style={styles.notFoundIcon}>
            <Ionicons
              name="person-outline"
              size={34}
              color={colors.exileGreen}
            />
          </View>

          <Text style={styles.notFoundTitle}>
            Profile unavailable
          </Text>

          <Text style={styles.notFoundText}>
            This profile isn't available in your
            current local Hi-Link data.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerOverlay}>
          <Pressable
            style={styles.headerButton}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={colors.white}
            />
          </Pressable>

          <Pressable
            style={styles.headerButton}
            hitSlop={8}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={23}
              color={colors.white}
            />
          </Pressable>
        </View>

        <View style={styles.cover}>
          {user.coverUri ? (
            <Image
              source={{ uri: user.coverUri }}
              style={styles.coverImage}
            />
          ) : (
            <View style={styles.coverEmpty}>
              <View style={styles.coverGlowGreen} />
              <View style={styles.coverGlowBlue} />

              <Ionicons
                name="sparkles-outline"
                size={34}
                color={colors.exileGreen}
              />

              <Text style={styles.coverEmptyText}>
                Hi-Link
              </Text>
            </View>
          )}
        </View>

        <View style={styles.profileBody}>
          <View style={styles.avatarOuter}>
            {user.avatarUri ? (
              <Image
                source={{ uri: user.avatarUri }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarEmpty}>
                <Ionicons
                  name="person"
                  size={38}
                  color={colors.exileGreen}
                />
              </View>
            )}
          </View>

          <Text style={styles.name}>
            {user.name}
          </Text>

          <Text style={styles.username}>
            @{user.username}
          </Text>

          {user.bio ? (
            <Text style={styles.bio}>
              {user.bio}
            </Text>
          ) : null}

          <View style={styles.schoolRow}>
            <Ionicons
              name="school-outline"
              size={17}
              color={colors.exileGreen}
            />

            <Text style={styles.schoolText}>
              {user.schoolName ?? 'School not set'}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.primaryButton}
            >
              <Ionicons
                name="person-add-outline"
                size={18}
                color={colors.background}
              />

              <Text style={styles.primaryButtonText}>
                Follow
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={colors.white}
              />

              <Text style={styles.secondaryButtonText}>
                Message
              </Text>
            </Pressable>
          </View>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>

            <View style={styles.stat}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              School profile
            </Text>

            {user.form ? (
              <InfoRow
                icon="book-outline"
                label="Form / Grade"
                value={user.form}
              />
            ) : null}

            {user.stream ? (
              <InfoRow
                icon="people-outline"
                label="Stream / Class"
                value={user.stream}
              />
            ) : null}

            {user.house ? (
              <InfoRow
                icon="home-outline"
                label="House"
                value={user.house}
              />
            ) : null}

            {user.boardingStatus &&
            user.boardingStatus !== 'unknown' ? (
              <InfoRow
                icon="bed-outline"
                label="Student type"
                value={
                  user.boardingStatus === 'boarding'
                    ? 'Boarding'
                    : 'Day scholar'
                }
              />
            ) : null}
          </View>

          <View style={styles.postsHeader}>
            <Text style={styles.sectionTitle}>
              Posts
            </Text>
          </View>

          <View style={styles.emptyPosts}>
            <Ionicons
              name="images-outline"
              size={30}
              color={colors.muted}
            />

            <Text style={styles.emptyPostsTitle}>
              No posts yet
            </Text>

            <Text style={styles.emptyPostsText}>
              Posts from this profile will appear
              here.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={19}
        color={colors.exileGreen}
      />

      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text style={styles.infoValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingBottom: 40,
  },

  headerOverlay: {
    position: 'absolute',
    zIndex: 10,
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(7,9,8,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerTitle: {
    marginLeft: 16,
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },

  cover: {
    width: '100%',
    height: 190,
    backgroundColor: colors.charcoal2,
  },

  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  coverEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  coverGlowGreen: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.exileGreenDark,
    opacity: 0.28,
    top: -90,
    left: -50,
  },

  coverGlowBlue: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.exileBlueDark,
    opacity: 0.3,
    bottom: -130,
    right: -70,
  },

  coverEmptyText: {
    color: colors.whiteMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7,
  },

  profileBody: {
    alignItems: 'center',
    paddingHorizontal: 18,
  },

  avatarOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginTop: -44,
    padding: 4,
    backgroundColor: colors.exileGreen,
  },

  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    resizeMode: 'cover',
  },

  avatarEmpty: {
    flex: 1,
    borderRadius: 40,
    backgroundColor: colors.charcoal2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  name: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
  },

  username: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 3,
  },

  bio: {
    color: colors.whiteMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 520,
  },

  schoolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 7,
  },

  schoolText: {
    color: colors.whiteMuted,
    fontSize: 14,
  },

  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  primaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.exileGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  primaryButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '800',
  },

  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.charcoal2,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  secondaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },

  stats: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },

  stat: {
    alignItems: 'center',
  },

  statValue: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },

  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },

  section: {
    width: '100%',
    marginTop: 22,
  },

  sectionTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },

  infoText: {
    flex: 1,
  },

  infoLabel: {
    color: colors.muted,
    fontSize: 11,
  },

  infoValue: {
    color: colors.whiteMuted,
    fontSize: 14,
    marginTop: 2,
  },

  postsHeader: {
    width: '100%',
    marginTop: 22,
  },

  emptyPosts: {
    width: '100%',
    minHeight: 150,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  emptyPostsTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 9,
  },

  emptyPostsText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 5,
  },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  notFoundIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  notFoundTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },

  notFoundText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
});
