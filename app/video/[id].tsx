import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { getPosts } from '../../src/storage/posts';
import HiLinkVideoPlayer from '../../src/components/HiLinkVideoPlayer';
import {
  ThemeColors,
  useTheme,
} from '../../src/theme/ThemeProvider';

export default function FullscreenVideoScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  const postId =
    Array.isArray(id) ? id[0] : id;

  const [post, setPost] =
    useState<Awaited<
      ReturnType<typeof getPosts>
    >[number] | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadVideo() {
      try {
        const posts = await getPosts();

        const found = posts.find(
          (item) => item.id === postId,
        );

        if (mounted) {
          setPost(
            found?.type === 'video'
              ? found
              : null,
          );
        }
      } catch (error) {
        console.error(
          'Load fullscreen video failed:',
          error,
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadVideo();

    return () => {
      mounted = false;
    };
  }, [postId]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />
      </View>
    );
  }

  if (
    !post ||
    !post.attachment?.uri
  ) {
    return (
      <View style={styles.screen}>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <Ionicons
            name="close"
            size={28}
            color={colors.text}
          />
        </Pressable>

        <Text style={styles.errorText}>
          This video is no longer available.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable
        onPress={() => router.back()}
        style={styles.closeButton}
        accessibilityRole="button"
        accessibilityLabel="Close fullscreen video"
      >
        <Ionicons
          name="close"
          size={28}
          color={colors.text}
        />
      </Pressable>

      <View style={styles.videoContainer}>
        <HiLinkVideoPlayer
          uri={post.attachment.uri}
          postId={post.id}
          width={post.attachment.width}
          height={post.attachment.height}
          autoPlay
          fullscreen
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  videoContainer: {
    width: '100%',
    flex: 1,
  },

  closeButton: {
    position: 'absolute',
    top: 18,
    left: 16,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },

  errorText: {
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
