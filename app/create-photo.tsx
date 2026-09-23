import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import {
  ThemeColors,
  useTheme,
} from '../src/theme/ThemeProvider';
import { getIdentity } from '../src/storage/identity';
import {
  addPost,
  getPosts,
  updatePost,
} from '../src/storage/posts';
import { Post, PostVisibility } from '../src/models/post';

const AUDIENCES: {
  value: PostVisibility;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: 'everyone',
    title: 'Everyone',
    description: 'Anyone on Hi-Link can see this',
    icon: 'globe-outline',
  },
  {
    value: 'my_school',
    title: 'My School',
    description: 'Students and staff at your school',
    icon: 'school-outline',
  },
  {
    value: 'my_class',
    title: 'My Class / Stream',
    description: 'People in your class or stream',
    icon: 'people-outline',
  },
  {
    value: 'my_group',
    title: 'My Group',
    description: 'People in your selected group',
    icon: 'people-circle-outline',
  },
];

const RESOURCE_TYPES = [
  'Notes',
  'Assignment',
  'Past Paper',
  'Revision',
  'Exam',
  'Results',
  'Study Guide',
  'Other',
];

export default function CreatePhotoScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const params = useLocalSearchParams<{
    editId?: string;
  }>();

  const editId =
    typeof params.editId === 'string'
      ? params.editId
      : undefined;

  const editing = Boolean(editId);

  const [imageUri, setImageUri] =
    useState<string | null>(null);

  const [caption, setCaption] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [audience, setAudience] =
    useState<PostVisibility>('everyone');

  const [subject, setSubject] = useState('');
  const [resourceType, setResourceType] =
    useState('');

  const [commentsAllowed, setCommentsAllowed] =
    useState(true);

  const [allowDownload, setAllowDownload] =
    useState(true);

  const [contentWarning, setContentWarning] =
    useState(false);

  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [existingPost, setExistingPost] =
    useState<Post | null>(null);

  useEffect(() => {
    if (!editing || !editId) {
      return;
    }

    loadPostForEditing(editId);
  }, [editing, editId]);

  async function loadPostForEditing(
    postId: string,
  ) {
    try {
      const posts = await getPosts();

      const post = posts.find(
        (item) => item.id === postId,
      );

      const identity = await getIdentity();

      if (!post || !identity) {
        Alert.alert(
          'Post unavailable',
          'This post could not be loaded for editing.',
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

      if (post.type !== 'photo') {
        Alert.alert(
          'Not supported yet',
          'This editor currently supports photo posts. Other post types will use their own editors.',
        );

        router.back();
        return;
      }

      setExistingPost(post);
      setImageUri(
        post.attachment?.uri ?? null,
      );
      setCaption(post.text ?? '');
      setTagsInput(
        post.tags
          ?.map((tag) => `#${tag}`)
          .join(' ') ?? '',
      );
      setAudience(post.visibility);
      setSubject(post.subject ?? '');
      setResourceType(
        post.resourceType ?? '',
      );
      setCommentsAllowed(
        post.commentsAllowed ?? true,
      );
      setAllowDownload(
        post.allowDownload ?? true,
      );
      setContentWarning(
        post.contentWarning ?? false,
      );
    } catch (error) {
      console.error(
        'Failed to load post for editing:',
        error,
      );

      Alert.alert(
        'Could not load post',
        'Hi-Link could not load this post for editing.',
      );

      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });

    if (
      !result.canceled &&
      result.assets[0]?.uri
    ) {
      setImageUri(
        result.assets[0].uri,
      );
    }
  }

  function removeImage() {
    Alert.alert(
      'Remove photo?',
      'The photo will be removed from this post.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () =>
            setImageUri(null),
        },
      ],
    );
  }

  function parseTags(): string[] {
    const unique = new Set<string>();

    tagsInput
      .split(/[\s,]+/)
      .map((tag) =>
        tag.trim().replace(/^#+/, ''),
      )
      .filter(Boolean)
      .forEach((tag) => {
        const cleaned = tag
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase();

        if (cleaned) {
          unique.add(cleaned);
        }
      });

    return Array.from(unique).slice(0, 10);
  }

  async function publish() {
    const identity = await getIdentity();

    if (!identity) {
      router.replace('/onboarding');
      return;
    }

    if (!imageUri) {
      Alert.alert(
        'Choose an image',
        'Select an image before posting.',
      );
      return;
    }

    if (
      audience === 'my_class' &&
      !identity.form
    ) {
      Alert.alert(
        'Class audience unavailable',
        'Your class or stream has not been set on your profile yet.',
      );
      return;
    }

    if (
      audience === 'my_group'
    ) {
      Alert.alert(
        'Group audience',
        'Group audiences will become available when Hi-Link groups are enabled. Please choose another audience for now.',
      );
      return;
    }

    setPosting(true);

    try {
      const now =
        new Date().toISOString();

      const tags = parseTags();

      if (editing && existingPost) {
        const updated: Post = {
          ...existingPost,

          text:
            caption.trim() ||
            undefined,

          attachment: {
            ...(existingPost.attachment ?? {}),
            uri: imageUri,
            mimeType:
              existingPost.attachment
                ?.mimeType ||
              'image/*',
          },

          tags:
            tags.length > 0
              ? tags
              : undefined,

          subject:
            subject.trim() ||
            undefined,

          resourceType:
            resourceType.trim() ||
            undefined,

          visibility: audience,

          commentsAllowed,

          allowDownload,

          contentWarning,

          updatedAt: now,
          editedAt: now,
        };

        await updatePost(updated);

        router.replace('/(tabs)/home');
        return;
      }

      const post: Post = {
        id: `post-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

        authorId: identity.id,
        authorName: identity.name,
        authorUsername:
          identity.username,
        authorAvatarUri:
          identity.avatarUri,

        type: 'photo',

        text:
          caption.trim() ||
          undefined,

        attachment: {
          uri: imageUri,
          mimeType: 'image/*',
        },

        schoolId:
          identity.schoolId,
        schoolName:
          identity.schoolName,
        form: identity.form,
        stream:
          identity.stream === 'None'
            ? undefined
            : identity.stream,

        subject:
          subject.trim() ||
          undefined,

        resourceType:
          resourceType.trim() ||
          undefined,

        tags:
          tags.length > 0
            ? tags
            : undefined,

        visibility: audience,

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

      router.replace('/(tabs)/home');
    } catch (error) {
      console.error(
        editing
          ? 'Failed to update post:'
          : 'Failed to publish photo:',
        error,
      );

      Alert.alert(
        editing
          ? 'Could not save changes'
          : 'Could not post',
        editing
          ? 'Something went wrong while updating your post.'
          : 'Something went wrong while saving your post.',
      );
    } finally {
      setPosting(false);
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

  const selectedAudience =
    AUDIENCES.find(
      (item) =>
        item.value === audience,
    ) ?? AUDIENCES[0];

  return (
    <KeyboardAvoidingView
      style={styles.container}
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
          hitSlop={8}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          {editing
            ? 'Edit Post'
            : 'Photo Post'}
        </Text>

        <Pressable
          onPress={publish}
          disabled={
            !imageUri || posting
          }
          style={[
            styles.postButton,
            (!imageUri || posting) &&
              styles.postButtonDisabled,
          ]}
        >
          {posting ? (
            <ActivityIndicator
              size="small"
              color={colors.background}
            />
          ) : (
            <Text
              style={styles.postButtonText}
            >
              {editing
                ? 'Save'
                : 'Post'}
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {imageUri ? (
          <View style={styles.previewWrap}>
            <Image
              source={{ uri: imageUri }}
              style={styles.preview}
              resizeMode="cover"
            />

            <View style={styles.previewActions}>
              <Pressable
                onPress={pickImage}
                style={styles.changeButton}
              >
                <Ionicons
                  name="images-outline"
                  size={18}
                  color={colors.text}
                />

                <Text
                  style={styles.changeText}
                >
                  Change
                </Text>
              </Pressable>

              <Pressable
                onPress={removeImage}
                style={[
                  styles.changeButton,
                  styles.removeButton,
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.text}
                />

                <Text
                  style={styles.changeText}
                >
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [
              styles.picker,
              pressed &&
                styles.pickerPressed,
            ]}
          >
            <View
              style={styles.pickerIcon}
            >
              <Ionicons
                name="image-outline"
                size={38}
                color={
                  colors.accent
                }
              />
            </View>

            <Text
              style={styles.pickerTitle}
            >
              Choose a photo
            </Text>

            <Text
              style={styles.pickerText}
            >
              Select an image from your
              device.
            </Text>
          </Pressable>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>
            Caption
          </Text>

          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Say something about this photo..."
            placeholderTextColor={
              colors.muted
            }
            multiline
            maxLength={2000}
            textAlignVertical="top"
            style={styles.captionInput}
          />

          <Text style={styles.counter}>
            {caption.length}/2000
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Tags
          </Text>

          <TextInput
            value={tagsInput}
            onChangeText={setTagsInput}
            placeholder="#school #football #revision"
            placeholderTextColor={
              colors.muted
            }
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.helper}>
            Add up to 10 tags. Separate them
            with spaces or commas.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Subject
          </Text>

          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Mathematics"
            placeholderTextColor={
              colors.muted
            }
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Resource type
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.chipRow
            }
          >
            {RESOURCE_TYPES.map(
              (item) => {
                const selected =
                  resourceType ===
                  item;

                return (
                  <Pressable
                    key={item}
                    onPress={() =>
                      setResourceType(
                        selected
                          ? ''
                          : item,
                      )
                    }
                    style={[
                      styles.chip,
                      selected &&
                        styles.chipSelected,
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
              },
            )}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Audience
          </Text>

          <View style={styles.audienceList}>
            {AUDIENCES.map(
              (item) => {
                const selected =
                  audience ===
                  item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() =>
                      setAudience(
                        item.value,
                      )
                    }
                    style={[
                      styles.audienceOption,
                      selected &&
                        styles.audienceSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.audienceIcon,
                        selected &&
                          styles.audienceIconSelected,
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={
                          selected
                            ? colors.background
                            : colors.accent
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.audienceText
                      }
                    >
                      <Text
                        style={
                          styles.audienceTitle
                        }
                      >
                        {item.title}
                      </Text>

                      <Text
                        style={
                          styles.audienceDescription
                        }
                      >
                        {item.description}
                      </Text>
                    </View>

                    <Ionicons
                      name={
                        selected
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={22}
                      color={
                        selected
                          ? colors.accent
                          : colors.muted
                      }
                    />
                  </Pressable>
                );
              },
            )}
          </View>

          <View style={styles.selectedAudience}>
            <Ionicons
              name={
                selectedAudience.icon
              }
              size={17}
              color={colors.blue}
            />

            <Text
              style={
                styles.selectedAudienceText
              }
            >
              {selectedAudience.title}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>
            Post settings
          </Text>

          <SettingRow
            icon="chatbubble-outline"
            title="Allow comments"
            description="People can comment on this post"
            enabled={commentsAllowed}
            onPress={() =>
              setCommentsAllowed(
                (value) => !value,
              )
            }
          />

          <SettingRow
            icon="download-outline"
            title="Allow downloads"
            description="People can save the attachment to their device"
            enabled={allowDownload}
            onPress={() =>
              setAllowDownload(
                (value) => !value,
              )
            }
          />

          <SettingRow
            icon="warning-outline"
            title="Content warning"
            description="Mark this post as potentially sensitive"
            enabled={contentWarning}
            onPress={() =>
              setContentWarning(
                (value) => !value,
              )
            }
          />
        </View>

        <View style={styles.safetyCard}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color={colors.accent}
          />

          <View style={styles.safetyText}>
            <Text
              style={styles.safetyTitle}
            >
              Keep personal information private
            </Text>

            <Text
              style={styles.safetyBody}
            >
              Don't post admission numbers,
              student IDs, phone numbers,
              passwords or other private
              information.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SettingRow({
  icon,
  title,
  description,
  enabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  enabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      style={styles.settingRow}
    >
      <View style={styles.settingIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={colors.accent}
        />
      </View>

      <View style={styles.settingText}>
        <Text
          style={styles.settingTitle}
        >
          {title}
        </Text>

        <Text
          style={
            styles.settingDescription
          }
        >
          {description}
        </Text>
      </View>

      <View
        style={[
          styles.switch,
          enabled &&
            styles.switchEnabled,
        ]}
      >
        <View
          style={[
            styles.switchThumb,
            enabled &&
              styles.switchThumbEnabled,
          ]}
        />
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  loading: {
    flex: 1,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    height: 64,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    marginLeft: 8,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  postButton: {
    minWidth: 58,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor:
      colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postButtonDisabled: {
    opacity: 0.4,
  },

  postButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },

  content: {
    padding: 16,
    paddingBottom: 50,
  },

  previewWrap: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor:
      colors.cardRaised,
    marginBottom: 22,
  },

  preview: {
    width: '100%',
    height: 330,
  },

  previewActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },

  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor:
      colors.cardRaised,
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  removeButton: {
    borderColor:
      'rgba(255,77,94,0.35)',
  },

  changeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  picker: {
    minHeight: 300,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    padding: 24,
  },

  pickerPressed: {
    opacity: 0.7,
  },

  pickerIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor:
      'rgba(25,230,140,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  pickerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  pickerText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },

  section: {
    marginBottom: 22,
  },

  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 9,
  },

  captionInput: {
    minHeight: 125,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      colors.card,
    color: colors.text,
    fontSize: 16,
    padding: 14,
  },

  counter: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 5,
  },

  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      colors.card,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
  },

  helper: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6,
  },

  chipRow: {
    gap: 8,
    paddingVertical: 2,
  },

  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      colors.card,
  },

  chipSelected: {
    backgroundColor:
      colors.accent,
    borderColor:
      colors.accent,
  },

  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  chipTextSelected: {
    color: colors.background,
  },

  audienceList: {
    gap: 8,
  },

  audienceOption: {
    minHeight: 70,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
  },

  audienceSelected: {
    borderColor:
      'rgba(25,230,140,0.55)',
    backgroundColor:
      'rgba(25,230,140,0.06)',
  },

  audienceIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor:
      colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  audienceIconSelected: {
    backgroundColor:
      colors.accent,
  },

  audienceText: {
    flex: 1,
    marginRight: 8,
  },

  audienceTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  audienceDescription: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },

  selectedAudience: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 9,
    paddingHorizontal: 2,
  },

  selectedAudienceText: {
    color: colors.muted,
    fontSize: 12,
  },

  settingRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor:
      colors.border,
    paddingVertical: 10,
  },

  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor:
      'rgba(25,230,140,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  settingText: {
    flex: 1,
    marginRight: 10,
  },

  settingTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  settingDescription: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },

  switch: {
    width: 44,
    height: 25,
    borderRadius: 13,
    backgroundColor:
      colors.cardRaised,
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor:
      colors.border,
  },

  switchEnabled: {
    backgroundColor:
      colors.accentDark,
    borderColor:
      colors.accent,
  },

  switchThumb: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor:
      colors.muted,
  },

  switchThumbEnabled: {
    alignSelf: 'flex-end',
    backgroundColor:
      colors.text,
  },

  safetyCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor:
      'rgba(25,230,140,0.20)',
    backgroundColor:
      'rgba(25,230,140,0.06)',
  },

  safetyText: {
    flex: 1,
    marginLeft: 10,
  },

  safetyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  safetyBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
