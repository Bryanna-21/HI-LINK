import { useEffect, useState } from 'react';
import {
  Alert,
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
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../src/theme/colors';
import { getIdentity, saveIdentity } from '../src/storage/identity';
import { HiLinkUser } from '../src/models/user';

const FORMS = [
  'Form 1',
  'Form 2',
  'Form 3',
  'Form 4',
  'Grade 10',
];

const STREAMS = [
  'None',
  'A',
  'B',
  'C',
  'D',
  'E',
  'Other',
];

const HOUSES = [
  'Red',
  'Blue',
  'Green',
  'Yellow',
  'Other',
];

type StudentType = 'boarding' | 'day' | 'unknown';

export default function EditProfile() {
  const [identity, setIdentity] = useState<HiLinkUser | null>(null);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');

  const [form, setForm] = useState('');
  const [stream, setStream] = useState('');
  const [house, setHouse] = useState('');
  const [studentType, setStudentType] =
    useState<StudentType>('unknown');

  const [profilePictureUri, setProfilePictureUri] =
    useState<string | undefined>();
  const [coverImageUri, setCoverImageUri] =
    useState<string | undefined>();

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const user = await getIdentity();

    if (!user) {
      router.replace('/onboarding');
      return;
    }

    setIdentity(user);

    setName(user.name ?? '');
    setUsername(user.username ?? '');
    setBio(user.bio ?? '');

    setForm(user.form ?? '');
    setStream(user.stream ?? '');
    setHouse(user.house ?? '');

    setStudentType(user.boardingStatus ?? 'unknown');
    setProfilePictureUri(user.avatarUri);
    setCoverImageUri(user.coverUri);
  }

  async function pickImage(type: 'profile' | 'cover') {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Hi-Link needs access to your photos so you can choose an image.',
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: type === 'cover' ? [16, 7] : [1, 1],
        quality: 0.9,
      });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    if (type === 'profile') {
      setProfilePictureUri(result.assets[0].uri);
    } else {
      setCoverImageUri(result.assets[0].uri);
    }
  }

  async function saveChanges() {
    if (!identity) {
      return;
    }

    const cleanName = name.trim();
    const cleanUsername = username
      .trim()
      .replace(/^@/, '')
      .replace(/\s+/g, '')
      .toLowerCase();

    if (!cleanName) {
      Alert.alert(
        'Name required',
        'Please enter your name.',
      );
      return;
    }

    if (!cleanUsername) {
      Alert.alert(
        'Username required',
        'Please enter a username.',
      );
      return;
    }

    if (cleanUsername.length < 3) {
      Alert.alert(
        'Username too short',
        'Your username must contain at least 3 characters.',
      );
      return;
    }

    setSaving(true);

    try {
      const updatedUser: HiLinkUser = {
        ...identity,

        name: cleanName,
        username: cleanUsername,
        bio: bio.trim() || undefined,

        form: form || undefined,
        stream:
          stream === 'None'
            ? undefined
            : stream || undefined,

        house: house || undefined,

        boardingStatus: studentType,

        avatarUri:
          profilePictureUri || undefined,

        coverUri:
          coverImageUri || undefined,

        updatedAt: new Date().toISOString(),
      };

      await saveIdentity(updatedUser);

      Alert.alert(
        'Profile updated',
        'Your profile has been saved.',
        [
          {
            text: 'Done',
            onPress: () => {
              router.back();
            },
          },
        ],
      );
    } catch {
      Alert.alert(
        'Could not save',
        'Something went wrong while saving your profile.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (!identity) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
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
          hitSlop={10}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.white}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          Edit Profile
        </Text>

        <Pressable
          onPress={saveChanges}
          disabled={saving}
          style={[
            styles.saveButton,
            saving && styles.saveButtonDisabled,
          ]}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mediaSection}>
          <Pressable
            style={styles.cover}
            onPress={() => pickImage('cover')}
          >
            {coverImageUri ? (
              <Image
                source={{ uri: coverImageUri }}
                style={styles.coverImage}
              />
            ) : (
              <View style={styles.coverEmpty}>
                <Ionicons
                  name="image-outline"
                  size={28}
                  color={colors.exileGreen}
                />
                <Text style={styles.coverText}>
                  Add cover image
                </Text>
              </View>
            )}

            <View style={styles.coverEdit}>
              <Ionicons
                name="camera"
                size={18}
                color={colors.white}
              />
            </View>
          </Pressable>

          <View style={styles.avatarContainer}>
            <Pressable
              style={styles.avatar}
              onPress={() => pickImage('profile')}
            >
              {profilePictureUri ? (
                <Image
                  source={{ uri: profilePictureUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons
                  name="person"
                  size={44}
                  color={colors.exileGreen}
                />
              )}

              <View style={styles.avatarEdit}>
                <Ionicons
                  name="camera"
                  size={14}
                  color={colors.white}
                />
              </View>
            </Pressable>
          </View>
        </View>

        <Section title="Social profile">
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            maxLength={60}
          />

          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            prefix="@"
            maxLength={30}
            autoCapitalize="none"
          />

          <Field
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people a little about yourself"
            multiline
            maxLength={160}
          />
        </Section>

        <Section title="School profile">
          <Text style={styles.fieldLabel}>
            Form / Grade
          </Text>

          <ChoiceGrid
            values={FORMS}
            selected={form}
            onSelect={setForm}
          />

          <Text style={styles.fieldLabel}>
            Stream / Class
          </Text>

          <ChoiceGrid
            values={STREAMS}
            selected={stream || 'None'}
            onSelect={setStream}
          />

          <Text style={styles.fieldLabel}>
            House
          </Text>

          <ChoiceGrid
            values={HOUSES}
            selected={house}
            onSelect={setHouse}
          />

          <Text style={styles.fieldLabel}>
            Student type
          </Text>

          <ChoiceGrid
            values={['Boarding', 'Day', 'Unknown']}
            selected={
              studentType === 'boarding'
                ? 'Boarding'
                : studentType === 'day'
                  ? 'Day'
                  : 'Unknown'
            }
            onSelect={(value) => {
              if (value === 'Boarding') {
                setStudentType('boarding');
              } else if (value === 'Day') {
                setStudentType('day');
              } else {
                setStudentType('unknown');
              }
            }}
          />
        </Section>

        <View style={styles.schoolCard}>
          <View style={styles.schoolIcon}>
            <Ionicons
              name="school-outline"
              size={22}
              color={colors.exileGreen}
            />
          </View>

          <View style={styles.schoolInfo}>
            <Text style={styles.schoolLabel}>
              School
            </Text>

            <Text style={styles.schoolName}>
              {identity.schoolName ?? 'School not set'}
            </Text>
          </View>

          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={colors.muted}
          />
        </View>

        <Text style={styles.privateNote}>
          Your admission number or Student ID is private
          account information and is not shown on your
          public profile.
        </Text>

        <Pressable
          style={styles.bottomSave}
          onPress={saveChanges}
          disabled={saving}
        >
          <Text style={styles.bottomSaveText}>
            {saving
              ? 'Saving changes...'
              : 'Save Changes'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  multiline,
  maxLength,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  prefix?: string;
  multiline?: boolean;
  maxLength: number;
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          multiline && styles.multilineContainer,
        ]}
      >
        {prefix ? (
          <Text style={styles.inputPrefix}>
            {prefix}
          </Text>
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            multiline && styles.multilineInput,
          ]}
          multiline={multiline}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
      </View>
    </View>
  );
}

function ChoiceGrid({
  values,
  selected,
  onSelect,
}: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.choiceGrid}>
      {values.map((value) => {
        const active = value === selected;

        return (
          <Pressable
            key={value}
            onPress={() => onSelect(value)}
            style={[
              styles.choice,
              active && styles.choiceActive,
            ]}
          >
            <Text
              style={[
                styles.choiceText,
                active && styles.choiceTextActive,
              ]}
            >
              {value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    color: colors.whiteMuted,
    fontSize: 16,
  },

  header: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.charcoal,
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 4,
  },

  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.exileGreen,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: colors.black,
    fontSize: 14,
    fontWeight: '800',
  },

  content: {
    paddingBottom: 40,
  },

  mediaSection: {
    height: 155,
    backgroundColor: colors.charcoal,
  },

  cover: {
    height: 100,
    backgroundColor: colors.charcoal2,
    overflow: 'hidden',
    position: 'relative',
  },

  coverImage: {
    width: '100%',
    height: '100%',
  },

  coverEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  coverText: {
    marginTop: 8,
    color: colors.whiteMuted,
    fontSize: 14,
  },

  coverEdit: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(7,9,8,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  avatarContainer: {
    position: 'absolute',
    left: 20,
    bottom: 0,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.charcoal2,
    borderWidth: 4,
    borderColor: colors.exileGreen,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  avatarEdit: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.exileBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.charcoal,
  },

  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },

  sectionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },

  field: {
    marginBottom: 16,
  },

  fieldLabel: {
    color: colors.whiteMuted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  inputContainer: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  multilineContainer: {
    minHeight: 100,
    alignItems: 'flex-start',
  },

  inputPrefix: {
    color: colors.exileGreen,
    fontSize: 16,
    fontWeight: '700',
  },

  input: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    paddingVertical: 12,
  },

  multilineInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  choice: {
    minWidth: 62,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },

  choiceActive: {
    backgroundColor: 'rgba(25,230,140,0.14)',
    borderColor: colors.exileGreen,
  },

  choiceText: {
    color: colors.whiteMuted,
    fontSize: 14,
    fontWeight: '600',
  },

  choiceTextActive: {
    color: colors.exileGreen,
    fontWeight: '800',
  },

  schoolCard: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  schoolIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(25,230,140,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  schoolInfo: {
    flex: 1,
    marginLeft: 12,
  },

  schoolLabel: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 3,
  },

  schoolName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  privateNote: {
    marginTop: 12,
    marginHorizontal: 18,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  bottomSave: {
    marginTop: 22,
    marginHorizontal: 16,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.exileGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomSaveText: {
    color: colors.black,
    fontSize: 16,
    fontWeight: '800',
  },
});
