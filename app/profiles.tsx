import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemeColors, useTheme } from '../src/theme/ThemeProvider';
import {
  clearIdentity,
  getIdentity,
  saveIdentity,
} from '../src/storage/identity';
import {
  getUsers,
  saveUsers,
  upsertUser,
} from '../src/storage/users';
import { setSessionActive } from '../src/storage/session';
import { setOnboardingComplete } from '../src/storage/onboarding';
import { HiLinkUser } from '../src/models/user';
import {
  hasPin,
  removePin,
  verifyPin,
} from '../src/storage/accountSecurity';
import { clearAccountData } from '../src/storage/localStore';

export default function ProfilesScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [activeUser, setActiveUser] =
    useState<HiLinkUser | null>(null);
  const [users, setUsers] = useState<HiLinkUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfiles = useCallback(async () => {
    setLoading(true);

    const [identity, storedUsers] = await Promise.all([
      getIdentity(),
      getUsers(),
    ]);

    setActiveUser(identity);
    setUsers(storedUsers);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfiles();
    }, [loadProfiles]),
  );

  const [pinTarget, setPinTarget] = useState<HiLinkUser | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  async function requestSwitch(user: HiLinkUser) {
    if (await hasPin(user.id)) {
      setPinValue('');
      setPinError(null);
      setPinTarget(user);

      return;
    }

    await switchProfile(user);
  }

  async function submitPin() {
    if (!pinTarget) {
      return;
    }

    const result = await verifyPin(pinTarget.id, pinValue);

    if (result.ok) {
      const target = pinTarget;

      setPinTarget(null);
      await switchProfile(target);

      return;
    }

    setPinValue('');
    setPinError(
      result.reason === 'locked'
        ? `Too many attempts. Try again in ${result.retryInSeconds}s.`
        : `Wrong PIN. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left before a lockout.`,
    );
  }

  async function switchProfile(user: HiLinkUser) {
    await saveIdentity(user);
    await setSessionActive(true);
    await setOnboardingComplete(true);

    router.replace('/(tabs)/home');
  }

  function createAccount() {
    router.push('/onboarding');
  }

  function confirmDelete(user: HiLinkUser) {
    const isActive = activeUser?.id === user.id;

    Alert.alert(
      'Delete profile',
      `Delete ${user.name}'s saved HI-LINK profile and private data (saved posts, notifications, academic records) from this device? Posts already shared stay visible. This cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const storedUsers = await getUsers();
            const nextUsers = storedUsers.filter(
              (item) => item.id !== user.id,
            );

            await saveUsers(nextUsers);
            await removePin(user.id);
            await clearAccountData(user.id);

            if (isActive) {
              await clearIdentity();
              await setSessionActive(false);
            }

            await loadProfiles();

            if (isActive) {
              router.replace('/');
            }
          },
        },
      ],
    );
  }

  async function logout() {
    if (!activeUser) {
      return;
    }

    await clearIdentity();
    await setSessionActive(false);

    router.replace('/');
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <Ionicons
          name="people-outline"
          size={30}
          color={colors.accent}
        />
        <Text style={styles.loadingText}>
          Loading profiles…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Profiles & Accounts
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeUser ? (
          <>
            <Text style={styles.sectionTitle}>
              CURRENT PROFILE
            </Text>

            <View style={styles.activeCard}>
              <Avatar
                user={activeUser}
                size={64}
                colors={colors}
              />

              <View style={styles.userInfo}>
                <Text
                  style={styles.userName}
                  numberOfLines={1}
                >
                  {activeUser.name}
                </Text>

                <Text
                  style={styles.username}
                  numberOfLines={1}
                >
                  @{activeUser.username}
                </Text>

                <Text
                  style={styles.school}
                  numberOfLines={1}
                >
                  {activeUser.schoolName ||
                    'HI-LINK student'}
                </Text>
              </View>

              <View style={styles.activeBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.accent}
                />
                <Text style={styles.activeBadgeText}>
                  Active
                </Text>
              </View>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>
          SAVED PROFILES
        </Text>

        <View style={styles.profileList}>
          {users.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="person-add-outline"
                size={30}
                color={colors.muted}
              />
              <Text style={styles.emptyTitle}>
                No saved profiles
              </Text>
              <Text style={styles.emptyText}>
                Create a HI-LINK account to save a profile
                on this device.
              </Text>
            </View>
          ) : (
            users.map((user, index) => {
              const isActive =
                activeUser?.id === user.id;

              return (
                <View
                  key={user.id}
                  style={[
                    styles.profileRow,
                    index < users.length - 1 &&
                      styles.profileRowBorder,
                  ]}
                >
                  <Pressable
                    style={styles.profileMain}
                    onPress={() =>
                      isActive
                        ? undefined
                        : requestSwitch(user)
                    }
                    disabled={isActive}
                  >
                    <Avatar
                      user={user}
                      size={48}
                      colors={colors}
                    />

                    <View style={styles.userInfo}>
                      <Text
                        style={styles.userName}
                        numberOfLines={1}
                      >
                        {user.name}
                      </Text>

                      <Text
                        style={styles.username}
                        numberOfLines={1}
                      >
                        @{user.username}
                      </Text>

                      <Text
                        style={styles.school}
                        numberOfLines={1}
                      >
                        {user.schoolName ||
                          'HI-LINK student'}
                      </Text>
                    </View>
                  </Pressable>

                  {isActive ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={colors.accent}
                    />
                  ) : (
                    <Pressable
                      onPress={() =>
                        requestSwitch(user)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Switch to ${user.name}`}
                    >
                      <Text style={styles.switchText}>
                        Switch
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={styles.deleteButton}
                    onPress={() =>
                      confirmDelete(user)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${user.name}`}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={19}
                      color={colors.muted}
                    />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        <Pressable
          style={styles.createButton}
          onPress={createAccount}
        >
          <Ionicons
            name="add"
            size={22}
            color={colors.background}
          />
          <Text style={styles.createButtonText}>
            Create New Account
          </Text>
        </Pressable>

        {activeUser ? (
          <Pressable
            style={styles.logoutButton}
            onPress={logout}
          >
            <Ionicons
              name="log-out-outline"
              size={21}
              color={colors.danger}
            />
            <Text style={styles.logoutText}>
              Log Out
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.note}>
          <Ionicons
            name="shield-checkmark-outline"
            size={19}
            color={colors.accent}
          />
          <Text style={styles.noteText}>
            Saved profiles stay on this device until you
            choose to delete them.
          </Text>
        </View>
      </ScrollView>
      <Modal
        visible={pinTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPinTarget(null)}
      >
        <View style={styles.pinBackdrop}>
          <View style={styles.pinCard}>
            <Text style={styles.pinTitle}>
              Enter PIN for {pinTarget?.name}
            </Text>
            <TextInput
              style={styles.pinInput}
              value={pinValue}
              onChangeText={setPinValue}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={8}
              autoFocus
              placeholder="PIN"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Profile PIN"
              onSubmitEditing={submitPin}
            />
            {pinError ? (
              <Text style={styles.pinError}>{pinError}</Text>
            ) : null}
            <View style={styles.pinActions}>
              <Pressable onPress={() => setPinTarget(null)} accessibilityRole="button">
                <Text style={styles.switchText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitPin} accessibilityRole="button">
                <Text style={styles.switchText}>Unlock</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Avatar({
  user,
  size,
  colors,
}: {
  user: HiLinkUser;
  size: number;
  colors: ThemeColors;
}) {
  if (user.avatarUri) {
    return (
      <Image
        source={{ uri: user.avatarUri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  return (
    <View
      style={[
        avatarStyles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          avatarStyles.initial,
          {
            color: colors.accent,
            fontSize: Math.max(18, size * 0.36),
          },
        ]}
      >
        {(user.name.trim()[0] || 'H').toUpperCase()}
      </Text>
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  initial: {
    fontWeight: '700',
  },
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      gap: 10,
    },

    loadingText: {
      color: colors.muted,
      fontSize: 14,
    },

    header: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },

    headerSpacer: {
      width: 40,
    },

    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },

    content: {
      padding: 16,
      paddingBottom: 40,
    },

    sectionTitle: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginTop: 10,
      marginBottom: 9,
    },

    activeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },

    profileList: {
      overflow: 'hidden',
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },

    profileRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
    },

    profileRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },

    profileMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    userInfo: {
      flex: 1,
      minWidth: 0,
    },

    userName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },

    username: {
      color: colors.muted,
      fontSize: 13,
      marginTop: 2,
    },

    school: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },

    activeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 8,
    },

    activeBadgeText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '700',
    },

    pinBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  pinCard: {
    width: '100%',
    borderRadius: 18,
    padding: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  pinTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 14,
  },

  pinInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 18,
  },

  pinError: {
    color: colors.text,
    marginTop: 10,
    fontSize: 13,
  },

  pinActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
  },

  switchText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '700',
    },

    deleteButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyState: {
      padding: 28,
      alignItems: 'center',
    },

    emptyTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      marginTop: 10,
    },

    emptyText: {
      color: colors.muted,
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
      marginTop: 5,
    },

    createButton: {
      minHeight: 50,
      marginTop: 16,
      borderRadius: 14,
      backgroundColor: colors.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    createButtonText: {
      color: colors.background,
      fontSize: 15,
      fontWeight: '700',
    },

    logoutButton: {
      minHeight: 50,
      marginTop: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    logoutText: {
      color: colors.danger,
      fontSize: 15,
      fontWeight: '700',
    },

    note: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 9,
      marginTop: 18,
      paddingHorizontal: 4,
    },

    noteText: {
      flex: 1,
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
    },
  });
