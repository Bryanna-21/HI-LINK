import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  VideoView,
  useVideoPlayer,
} from 'expo-video';

import { Post } from '../models/post';
import { updatePost } from '../storage/posts';
import { recordVideoWatch } from '../storage/videoHistory';
import {
  ThemeColors,
  useTheme,
} from '../theme/ThemeProvider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HiLinkVideoFeedProps {
  posts: Post[];
  initialIndex?: number;
  showHeader?: boolean;
  onBack?: () => void;
}

function formatCount(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

function getAspectRatio(post: Post) {
  const width = post.attachment?.width;
  const height = post.attachment?.height;

  if (
    width &&
    height &&
    width > 0 &&
    height > 0
  ) {
    return width / height;
  }

  return 9 / 16;
}

function VideoFeedItem({
  post,
  active,
}: {
  post: Post;
  active: boolean;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const player = useVideoPlayer(
    post.attachment?.uri ?? '',
    (videoPlayer) => {
      videoPlayer.loop = true;
    },
  );

  const lastTapRef =
    useRef<number | null>(null);

  const [playing, setPlaying] =
    useState(false);

  const [liked, setLiked] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  useEffect(() => {
    if (!active) {
      player.pause();
      setPlaying(false);
      return;
    }

    player.play();
    setPlaying(true);

    void recordVideoWatch(post.id);
  }, [
    active,
    player,
    post.id,
  ]);

  useEffect(() => {
    const timeSubscription =
      player.addListener(
        'timeUpdate',
        (event) => {
          setCurrentTime(
            event.currentTime,
          );

          if (
            Number.isFinite(
              player.duration,
            ) &&
            player.duration > 0
          ) {
            setDuration(
              player.duration,
            );
          }
        },
      );

    const statusSubscription =
      player.addListener(
        'statusChange',
        () => {
          if (
            Number.isFinite(
              player.duration,
            ) &&
            player.duration > 0
          ) {
            setDuration(
              player.duration,
            );
          }
        },
      );

    const playingSubscription =
      player.addListener(
        'playingChange',
        (event) => {
          setPlaying(event.isPlaying);

          if (event.isPlaying) {
            void recordVideoWatch(
              post.id,
            );
          }
        },
      );

    return () => {
      timeSubscription.remove();
      statusSubscription.remove();
      playingSubscription.remove();
    };
  }, [player, post.id]);

  const togglePlayback =
    useCallback(() => {
      if (playing) {
        player.pause();
        setPlaying(false);
        return;
      }

      player.play();
      setPlaying(true);

      void recordVideoWatch(
        post.id,
      );
    }, [
      player,
      playing,
      post.id,
    ]);

  const handleVideoPress =
    useCallback(() => {
      const now = Date.now();
      const previousTap =
        lastTapRef.current;

      if (
        previousTap !== null &&
        now - previousTap < 280
      ) {
        lastTapRef.current = null;

        if (!liked) {
          setLiked(true);

          void updatePost({
            ...post,
            likes: post.likes + 1,
            updatedAt:
              new Date().toISOString(),
          });
        }

        return;
      }

      lastTapRef.current = now;

      setTimeout(() => {
        if (
          lastTapRef.current === now
        ) {
          togglePlayback();
        }
      }, 280);
    }, [
      liked,
      post,
      togglePlayback,
    ]);

  async function toggleLike() {
    const nextLiked = !liked;

    setLiked(nextLiked);

    await updatePost({
      ...post,
      likes: Math.max(
        0,
        post.likes +
          (nextLiked ? 1 : -1),
      ),
      updatedAt:
        new Date().toISOString(),
    });
  }

  async function toggleSave() {
    const nextSaved = !saved;

    setSaved(nextSaved);

    await updatePost({
      ...post,
      saves: Math.max(
        0,
        post.saves +
          (nextSaved ? 1 : -1),
      ),
      updatedAt:
        new Date().toISOString(),
    });
  }

  async function shareVideo() {
    try {
      await Share.share({
        message: post.text
          ? `${post.authorName}: ${post.text}`
          : `Watch ${post.authorName}'s video on HI-LINK.`,
      });

      await updatePost({
        ...post,
        shares:
          post.shares + 1,
        updatedAt:
          new Date().toISOString(),
      });
    } catch {
      // User cancelled sharing.
    }
  }

  function openComments() {
    router.push({
      pathname:
        '/comments/[postId]',
      params: {
        postId: post.id,
      },
    });
  }

  const progress =
    duration > 0
      ? Math.max(
          0,
          Math.min(
            1,
            currentTime / duration,
          ),
        )
      : 0;

  return (
    <View style={styles.page}>
      <View
        style={[
          styles.videoFrame,
          {
            aspectRatio:
              getAspectRatio(post),
          },
        ]}
      >
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
        />

        <Pressable
          onPress={
            handleVideoPress
          }
          style={styles.videoTouch}
          accessibilityRole="button"
          accessibilityLabel={
            playing
              ? 'Pause video or double tap to like'
              : 'Play video or double tap to like'
          }
        />

        {!playing ? (
          <View
            pointerEvents="none"
            style={
              styles.pauseOverlay
            }
          >
            <View
              style={
                styles.pauseButton
              }
            >
              <Ionicons
                name="play"
                size={34}
                color={colors.text}
              />
            </View>
          </View>
        ) : null}

        <View
          pointerEvents="none"
          style={styles.bottomGradient}
        />

        <View
          style={styles.videoInfo}
        >
          <Pressable
            onPress={() =>
              router.push({
                pathname:
                  '/profile/[id]',
                params: {
                  id: post.authorId,
                },
              })
            }
          >
            <Text
              style={styles.username}
              numberOfLines={1}
            >
              @{post.authorUsername}
            </Text>
          </Pressable>

          {post.text ? (
            <Text
              style={styles.caption}
              numberOfLines={3}
            >
              {post.text}
            </Text>
          ) : null}

          {post.tags?.length ? (
            <Text
              style={styles.tags}
              numberOfLines={1}
            >
              {post.tags
                .map((tag) =>
                  tag.startsWith('#')
                    ? tag
                    : `#${tag}`,
                )
                .join(' ')}
            </Text>
          ) : null}
        </View>

        <View
          style={styles.actions}
        >
          <Pressable
            onPress={toggleLike}
            style={styles.action}
          >
            <Ionicons
              name={
                liked
                  ? 'heart'
                  : 'heart-outline'
              }
              size={30}
              color={
                liked
                  ? colors.danger
                  : colors.text
              }
            />

            <Text
              style={styles.actionText}
            >
              {formatCount(
                post.likes +
                  (liked ? 1 : 0),
              )}
            </Text>
          </Pressable>

          <Pressable
            onPress={openComments}
            style={styles.action}
          >
            <Ionicons
              name="chatbubble-outline"
              size={29}
              color={colors.text}
            />

            <Text
              style={styles.actionText}
            >
              {formatCount(
                post.comments,
              )}
            </Text>
          </Pressable>

          <Pressable
            onPress={shareVideo}
            style={styles.action}
          >
            <Ionicons
              name="paper-plane-outline"
              size={29}
              color={colors.text}
            />

            <Text
              style={styles.actionText}
            >
              {formatCount(
                post.shares,
              )}
            </Text>
          </Pressable>

          <Pressable
            onPress={toggleSave}
            style={styles.action}
          >
            <Ionicons
              name={
                saved
                  ? 'bookmark'
                  : 'bookmark-outline'
              }
              size={29}
              color={colors.text}
            />

            <Text
              style={styles.actionText}
            >
              {formatCount(
                post.saves +
                  (saved ? 1 : 0),
              )}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              player.muted =
                !player.muted;
            }}
            style={styles.action}
          >
            <Ionicons
              name={
                player.muted
                  ? 'volume-mute-outline'
                  : 'volume-high-outline'
              }
              size={29}
              color={colors.text}
            />
          </Pressable>
        </View>

        <View
          pointerEvents="none"
          style={styles.progress}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

export default function HiLinkVideoFeed({
  posts,
  initialIndex = 0,
  showHeader = false,
  onBack,
}: HiLinkVideoFeedProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const listRef =
    useRef<FlatList<Post>>(null);

  const safeInitialIndex =
    useMemo(() => {
      if (posts.length === 0) {
        return 0;
      }

      return Math.min(
        Math.max(
          0,
          initialIndex,
        ),
        posts.length - 1,
      );
    }, [
      initialIndex,
      posts.length,
    ]);

  const [activeIndex, setActiveIndex] =
    useState(safeInitialIndex);

  useEffect(() => {
    setActiveIndex(
      safeInitialIndex,
    );

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex(
        {
          index:
            safeInitialIndex,
          animated: false,
        },
      );
    });
  }, [safeInitialIndex]);

  const onViewableItemsChanged =
    useRef(
      ({
        viewableItems,
      }: {
        viewableItems: Array<{
          index: number | null;
          isViewable: boolean;
        }>;
      }) => {
        const visible =
          viewableItems.find(
            (item) =>
              item.isViewable &&
              item.index !== null,
          );

        if (
          visible?.index !== null &&
          visible?.index !== undefined
        ) {
          setActiveIndex(
            visible.index,
          );
        }
      },
    ).current;

  const viewabilityConfig =
    useRef({
      itemVisiblePercentThreshold: 80,
    }).current;

  if (posts.length === 0) {
    return (
      <View
        style={styles.empty}
      >
        <Text
          style={styles.emptyText}
        >
          No videos available.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.viewer}
    >
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) =>
          item.id
        }
        renderItem={({
          item,
          index,
        }) => (
          <VideoFeedItem
            post={item}
            active={
              index ===
              activeIndex
            }
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={
          false
        }
        snapToInterval={
          SCREEN_HEIGHT
        }
        decelerationRate="fast"
        disableIntervalMomentum
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        onViewableItemsChanged={
          onViewableItemsChanged
        }
        viewabilityConfig={
          viewabilityConfig
        }
        getItemLayout={(
          _data,
          index,
        ) => ({
          length:
            SCREEN_HEIGHT,
          offset:
            SCREEN_HEIGHT *
            index,
          index,
        })}
      />

      {showHeader ? (
        <View
          pointerEvents="box-none"
          style={styles.topBar}
        >
          <Pressable
            onPress={onBack}
            style={styles.closeButton}
          >
            <Ionicons
              name="arrow-back"
              size={25}
              color={colors.text}
            />
          </Pressable>

          <View
            style={styles.titleWrap}
          >
            <Text
              style={styles.title}
            >
              Videos
            </Text>

            <Text
              style={styles.counter}
            >
              {activeIndex + 1} /{' '}
              {posts.length}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  viewer: {
    flex: 1,
    backgroundColor:
      '#000000',
  },

  page: {
    height: SCREEN_HEIGHT,
    width: '100%',
    backgroundColor:
      '#000000',
    justifyContent:
      'center',
  },

  videoFrame: {
    width: '100%',
    maxHeight:
      SCREEN_HEIGHT,
    alignSelf:
      'center',
    backgroundColor:
      '#000000',
    position:
      'relative',
  },

  video: {
    width: '100%',
    height: '100%',
    backgroundColor:
      '#000000',
  },

  videoTouch: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },

  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:
      'center',
    justifyContent:
      'center',
    zIndex: 3,
  },

  pauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor:
      'rgba(0,0,0,0.55)',
    alignItems:
      'center',
    justifyContent:
      'center',
    paddingLeft: 4,
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.25)',
  },

  bottomGradient: {
    position:
      'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 230,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 3,
  },

  videoInfo: {
    position:
      'absolute',
    left: 14,
    right: 78,
    bottom: 38,
    zIndex: 6,
  },

  username: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 7,
  },

  caption: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },

  tags: {
    color:
      colors.textSecondary,
    fontSize: 13,
    marginTop: 5,
    fontWeight: '700',
  },

  actions: {
    position:
      'absolute',
    right: 12,
    bottom: 44,
    zIndex: 7,
    alignItems:
      'center',
    gap: 18,
  },

  action: {
    alignItems:
      'center',
    justifyContent:
      'center',
    minWidth: 44,
  },

  actionText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },

  progress: {
    position:
      'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: colors.border,
    zIndex: 10,
  },

  progressFill: {
    height: '100%',
    backgroundColor:
      colors.text,
  },

  topBar: {
    position:
      'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
    flexDirection:
      'row',
    alignItems:
      'center',
    paddingHorizontal: 10,
    paddingTop: 6,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      'rgba(0,0,0,0.58)',
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  titleWrap: {
    marginLeft: 12,
  },

  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  counter: {
    color:
      colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },

  empty: {
    flex: 1,
    backgroundColor:
      '#000000',
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  emptyText: {
    color: colors.text,
    fontSize: 16,
  },
});
