import { useEffect, useState } from 'react';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import HiLinkVideoFeed from '../src/components/HiLinkVideoFeed';
import {
  ThemeColors,
  useTheme,
} from '../src/theme/ThemeProvider';
import { Post } from '../src/models/post';
import { getPosts } from '../src/storage/posts';

export default function VideoFeedScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const params =
    useLocalSearchParams<{
      ids?: string;
      index?: string;
    }>();

  const [posts, setPosts] =
    useState<Post[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const allPosts =
          await getPosts();

        const requestedIds =
          params.ids
            ? params.ids
                .split(',')
                .filter(Boolean)
            : [];

        let videos =
          allPosts.filter(
            (post) =>
              post.type === 'video' &&
              Boolean(
                post.attachment?.uri,
              ),
          );

        if (
          requestedIds.length > 0
        ) {
          const byId =
            new Map(
              videos.map(
                (post) => [
                  post.id,
                  post,
                ],
              ),
            );

          videos =
            requestedIds
              .map((id) =>
                byId.get(id),
              )
              .filter(
                (
                  post,
                ): post is Post =>
                  Boolean(post),
              );
        }

        if (mounted) {
          setPosts(videos);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [params.ids]);

  if (loading) {
    return (
      <SafeAreaView
        style={styles.screen}
      >
        <View
          style={styles.center}
        >
          <ActivityIndicator
            size="large"
            color={colors.text}
          />

          <Text
            style={styles.loadingText}
          >
            Loading videos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View
      style={styles.screen}
    >
      <HiLinkVideoFeed
        posts={posts}
        initialIndex={Number(
          params.index ?? 0,
        )}
        showHeader
        onBack={() =>
          router.back()
        }
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      '#000000',
  },

  center: {
    flex: 1,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      '#000000',
  },

  loadingText: {
    marginTop: 12,
    color: colors.text,
    fontSize: 14,
  },
});
