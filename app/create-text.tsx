import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import {
  ThemeColors,
  useTheme,
} from '../src/theme/ThemeProvider';
import { Post, PostVisibility } from '../src/models/post';
import { getIdentity } from '../src/storage/identity';
import { getPosts, updatePost, addPost } from '../src/storage/posts';

const AUDIENCES: {
  label: string;
  value: PostVisibility;
}[] = [
  { label: 'Everyone', value: 'everyone' },
  { label: 'My School', value: 'my_school' },
  { label: 'My Class / Stream', value: 'my_class' },
  { label: 'My Group', value: 'my_group' },
];

const RESOURCE_TYPES = [
  'None',
  'Notes',
  'Assignment',
  'Past Paper',
  'Revision',
  'Exam',
  'Results',
  'Study Guide',
  'Other',
];

function normalizeTags(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim().replace(/^#/, '').toLowerCase())
    .filter(Boolean)
    .slice(0, 10);
}

export default function CreateTextScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { editId } = useLocalSearchParams<{
    editId?: string;
  }>();

  const isEditing = Boolean(editId);

  const [text, setText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [subject, setSubject] = useState('');
  const [resourceType, setResourceType] =
    useState('None');

  const [visibility, setVisibility] =
    useState<PostVisibility>('everyone');

  const [commentsAllowed, setCommentsAllowed] =
    useState(true);
  const [allowDownload, setAllowDownload] =
    useState(true);
  const [contentWarning, setContentWarning] =
    useState(false);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) {
      return;
    }

    loadPost(editId);
  }, [editId]);

  async function loadPost(id: string) {
    try {
      const identity = await getIdentity();
      const posts = await getPosts();
      const post = posts.find(
        (item) => item.id === id,
      );

      if (!identity || !post) {
        Alert.alert(
          'Post unavailable',
          'This post could not be found.',
        );
        router.back();
        return;
      }

      if (post.authorId !== identity.id) {
        Alert.alert(
          'Not allowed',
          'You can only edit your own posts.',
        );
        router.back();
        return;
      }

      if (post.type !== 'text') {
        Alert.alert(
          'Unsupported post',
          'This editor is for text posts.',
        );
        router.back();
        return;
      }

      setText(post.text || '');
      setTagsText(
        post.tags?.map((tag) => `#${tag}`).join(' ') || '',
      );
      setSubject(post.subject || '');
      setResourceType(
        post.resourceType || 'None',
      );
      setVisibility(post.visibility);
      setCommentsAllowed(
        post.commentsAllowed !== false,
      );
      setAllowDownload(
        post.allowDownload !== false,
      );
      setContentWarning(
        post.contentWarning === true,
      );
    } catch (error) {
      console.error(
        'Load text post failed:',
        error,
      );

      Alert.alert(
        'Unable to edit',
        'Something went wrong while loading the post.',
      );

      router.back();
    } finally {
      setLoading(false);
    }
  }

  function selectAudience(
    next: PostVisibility,
  ) {
    if (next === 'my_group') {
      Alert.alert(
        'Groups coming next',
        'Group-based audiences will be enabled when Hi-Link groups are connected.',
      );
      return;
    }

    setVisibility(next);
  }

  async function save() {
    if (saving) {
      return;
    }

    const identity = await getIdentity();

    if (!identity) {
      Alert.alert(
        'Profile required',
        'Complete your Hi-Link profile first.',
      );
      return;
    }

    if (!text.trim()) {
      Alert.alert(
        'Text required',
        'Write something before continuing.',
      );
      return;
    }

    if (
      visibility === 'my_class' &&
      !identity.form
    ) {
      Alert.alert(
        'Class not set',
        'Add your form/grade in your profile before using My Class / Stream.',
      );
      return;
    }

    const tags = normalizeTags(tagsText);
    const now = new Date().toISOString();

    setSaving(true);

    try {
      if (isEditing && editId) {
        const posts = await getPosts();
        const existing = posts.find(
          (post) => post.id === editId,
        );

        if (!existing) {
          throw new Error('Post not found.');
        }

        if (existing.authorId !== identity.id) {
          throw new Error(
            'You can only edit your own posts.',
          );
        }

        const updatedPost: Post = {
          ...existing,
          type: 'text',
          text: text.trim(),
          attachment: undefined,
          subject:
            subject.trim() || undefined,
          resourceType:
            resourceType === 'None'
              ? undefined
              : resourceType,
          visibility,
          tags:
            tags.length > 0
              ? tags
              : undefined,
          commentsAllowed,
          allowDownload,
          contentWarning,
          updatedAt: now,
          editedAt: now,
        };

        await updatePost(updatedPost);
      } else {
        const post: Post = {
          id: `post-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,

          authorId: identity.id,
          authorName: identity.name,
          authorUsername: identity.username,
          authorAvatarUri: identity.avatarUri,

          type: 'text',

          text: text.trim(),

          schoolId: identity.schoolId,
          schoolName: identity.schoolName,
          form: identity.form,
          stream:
            identity.stream === 'None'
              ? undefined
              : identity.stream,

          subject:
            subject.trim() || undefined,
          resourceType:
            resourceType === 'None'
              ? undefined
              : resourceType,

          visibility,

          tags:
            tags.length > 0
              ? tags
              : undefined,

          commentsAllowed,
          allowDownload,
          contentWarning,

          likes: 0,
          comments: 0,
          shares: 0,
          reshares: 0,
          saves: 0,

          createdAt: now,
          updatedAt: now,
        };

        await addPost(post);
      }

      router.replace('/(tabs)/home');
    } catch (error) {
      console.error(
        'Save text post failed:',
        error,
      );

      Alert.alert(
        'Unable to save',
        'The text post could not be saved.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={colors.accent}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.text}
            />
          </Pressable>

          <Text style={styles.title}>
            {isEditing
              ? 'Edit text post'
              : 'Create text post'}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.sectionTitle}>
          Your post
        </Text>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={5000}
          style={styles.postInput}
          autoFocus={!isEditing}
        />

        <Text style={styles.characterCount}>
          {text.length}/5000
        </Text>

        <Text style={styles.sectionTitle}>
          Tags
        </Text>

        <TextInput
          value={tagsText}
          onChangeText={setTagsText}
          placeholder="#mathematics #revision #study"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.helper}>
          Add up to 10 tags. Separate them with spaces or commas.
        </Text>

        <Text style={styles.sectionTitle}>
          Subject
        </Text>

        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. Mathematics"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.sectionTitle}>
          Resource type
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {RESOURCE_TYPES.map((item) => {
            const selected =
              resourceType === item;

            return (
              <Pressable
                key={item}
                onPress={() => setResourceType(item)}
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected &&
                      styles.chipTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>
          Audience
        </Text>

        <View style={styles.audienceGrid}>
          {AUDIENCES.map((item) => {
            const selected =
              visibility === item.value;

            return (
              <Pressable
                key={item.value}
                onPress={() =>
                  selectAudience(item.value)
                }
                style={[
                  styles.audienceButton,
                  selected &&
                    styles.audienceSelected,
                ]}
              >
                <Text
                  style={[
                    styles.audienceText,
                    selected &&
                      styles.audienceTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>
          Post settings
        </Text>

        <View style={styles.settingsCard}>
          <SettingRow
            title="Allow comments"
            value={commentsAllowed}
            onChange={setCommentsAllowed}
          />

          <SettingRow
            title="Allow downloads"
            value={allowDownload}
            onChange={setAllowDownload}
          />

          <SettingRow
            title="Content warning"
            value={contentWarning}
            onChange={setContentWarning}
          />
        </View>

        <View style={styles.safetyCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={22}
            color={colors.accent}
          />

          <View style={styles.safetyCopy}>
            <Text style={styles.safetyTitle}>
              Keep Hi-Link safe
            </Text>

            <Text style={styles.safetyBody}>
              Don't post private school records,
              admission numbers, phone numbers, or
              content that could put another student
              at risk.
            </Text>
          </View>
        </View>

        <Pressable
          onPress={save}
          disabled={saving}
          style={[
            styles.publishButton,
            saving && styles.publishDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator
              color={colors.background}
            />
          ) : (
            <Text style={styles.publishText}>
              {isEditing
                ? 'Save changes'
                : 'Publish text'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  title,
  value,
  onChange,
}: {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingTitle}>
        {title}
      </Text>

      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: colors.border,
          true: colors.accentDark,
        }}
        thumbColor={
          value ? colors.accent : colors.textSecondary
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },

  title: {
    flex: 1,
    marginLeft: 12,
    color: colors.text,
    fontSize: 21,
    fontWeight: '700',
  },

  headerSpacer: {
    width: 42,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 9,
    marginTop: 10,
  },

  postInput: {
    minHeight: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    color: colors.text,
    padding: 16,
    fontSize: 17,
    lineHeight: 25,
    textAlignVertical: 'top',
  },

  characterCount: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 5,
  },

  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },

  helper: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6,
  },

  chips: {
    gap: 8,
    paddingBottom: 2,
  },

  chip: {
    paddingHorizontal: 14,
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },

  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  chipTextSelected: {
    color: colors.background,
  },

  audienceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  audienceButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
  },

  audienceSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },

  audienceText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  audienceTextSelected: {
    color: colors.accent,
  },

  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    paddingHorizontal: 14,
  },

  settingRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  settingTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },

  safetyCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardRaised,
    flexDirection: 'row',
    gap: 12,
  },

  safetyCopy: {
    flex: 1,
  },

  safetyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  safetyBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  publishButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  publishDisabled: {
    opacity: 0.65,
  },

  publishText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '800',
  },
});
