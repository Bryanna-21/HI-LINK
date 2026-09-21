import { HiLinkUser } from '../../src/models/user';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { VideoView, useVideoPlayer } from 'expo-video';

import { colors } from '../../src/theme/colors';
import {
  DEFAULT_VIDEO_SETTINGS,
  getVideoSettings,
  VideoDisplayMode,
} from '../../src/storage/videoSettings';
import { Post } from '../../src/models/post';
import { getIdentity } from '../../src/storage/identity';
import {
  getPosts,
  updatePost,
} from '../../src/storage/posts';
import { getCommentsByPost } from '../../src/storage/comments';
import {
  isPostSaved,
  toggleSavedPost,
} from '../../src/storage/savedPosts';
import {
  getPostReaction,
  removePostReaction,
  setPostReaction,
  PostReaction,
} from '../../src/storage/postReactions';

const COLORS = {
  background: '#070908',
  surface: '#101512',
  surfaceRaised: '#151B17',
  border: '#242C27',

  white: '#F8FAF8',
  softWhite: '#DCE4DE',
  muted: '#8D9991',

  green: '#19E68C',
  greenSoft: '#123B2A',

  blue: '#2F80FF',
  blueSoft: '#122747',
};

type HomeFeedSection = 'reels' | 'library' | 'feed';
type HomeDiscoverySection =
  | 'you'
  | 'friends'
  | 'school'
  | 'sports'
  | 'clubs';

type FeedHandle = {
  measureVideos: () => void;
};

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const feedRef =
    useRef<FeedHandle>(null);

  const [feedSection, setFeedSection] =
    useState<HomeFeedSection>('feed');

  const [discoverySection, setDiscoverySection] =
    useState<HomeDiscoverySection>('you');

  const [posts, setPosts] = useState<Post[]>([]);
  const [seenCounts, setSeenCounts] = useState({
    reels: 0,
    library: 0,
    feed: 0,
  });

  const loadHomePosts = useCallback(async () => {
    const result = await getPosts();

    setPosts(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHomePosts();
    }, [loadHomePosts]),
  );

  const reelsCount = posts.filter(
    (post) => post.type === 'video',
  ).length;

  const libraryCount = posts.filter(
    (post) =>
      post.type === 'document' ||
      post.type === 'study_resource' ||
      post.type === 'question',
  ).length;

  const feedCount = posts.filter(
    (post) =>
      post.type !== 'video' &&
      post.type !== 'document' &&
      post.type !== 'study_resource' &&
      post.type !== 'question',
  ).length;

  const sectionCounts = {
    reels: reelsCount,
    library: libraryCount,
    feed: feedCount,
  };

  const selectFeedSection = (
    section: HomeFeedSection,
  ) => {
    setFeedSection(section);

    setSeenCounts((current) => ({
      ...current,
      [section]: sectionCounts[section],
    }));
  };

  const horizontalPadding = Math.max(
    16,
    Math.min(24, width * 0.055),
  );

  const storySize = Math.max(
    52,
    Math.min(64, width * 0.15),
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* FIXED HOME HEADER */}
      <View
        style={[
          styles.fixedHomeHeader,
          {
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <View style={styles.brandRow}>
              <Text style={styles.logo}>HI-LINK</Text>

              <View style={styles.logoDot} />
            </View>

            <Text style={styles.subtitle}>
              Your school. Your people. Your world.
            </Text>
          </View>

          <View style={styles.notification}>
            <View style={styles.notificationDot} />
          </View>
        </View>

        {/* HOME NAVIGATION */}
        <View style={styles.homeNavigation}>
          {(
            [
              ['reels', 'Reels'],
              ['library', 'Library'],
              ['feed', 'Feed'],
            ] as const
          ).map(([value, label]) => {
            const newCount =
              sectionCounts[value] -
              seenCounts[value];

            return (
              <Pressable
                key={value}
                onPress={() =>
                  selectFeedSection(value)
                }
                style={[
                  styles.homeNavigationItem,
                  feedSection === value &&
                    styles.homeNavigationItemActive,
                ]}
              >
                <View
                  style={styles.homeNavigationLabel}
                >
                  <Text
                    style={[
                      styles.homeNavigationText,
                      feedSection === value &&
                        styles.homeNavigationTextActive,
                    ]}
                  >
                    {label}
                  </Text>

                  {newCount > 0 ? (
                    <View
                      style={styles.homeNavigationBadge}
                    >
                      <Text
                        style={
                          styles.homeNavigationBadgeText
                        }
                      >
                        {newCount > 99
                          ? '99+'
                          : newCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* PERSISTENT STORY / DISCOVERY LAYER */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stories}
        >
          {[
            ['you', 'You'],
            ['friends', 'Friends'],
            ['school', 'School'],
            ['sports', 'Sports'],
            ['clubs', 'Clubs'],
          ].map(([value, label], index) => {
            const active =
              discoverySection === value;

            return (
              <Pressable
                key={value}
                onPress={() =>
                  setDiscoverySection(
                    value as HomeDiscoverySection,
                  )
                }
                style={styles.story}
              >
                <View
                  style={[
                    styles.storyCircle,
                    {
                      width: storySize,
                      height: storySize,
                      borderRadius: storySize / 2,
                    },
                    active &&
                      styles.storyCircleActive,
                    index === 3 &&
                      styles.storyCircleBlue,
                  ]}
                >
                  <Text style={styles.storyInitial}>
                    {label.charAt(0)}
                  </Text>

                  {active ? (
                    <View
                      style={styles.storyActiveDot}
                    />
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.storyLabel,
                    active &&
                      styles.storyLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: 110,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={() => {
          feedRef.current?.measureVideos();
        }}
      >
        {/* GREETING */}
        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>
            What's happening?
          </Text>

          <Text style={styles.greetingSubtitle}>
            Share something with your world.
          </Text>
        </View>

        {/* WELCOME CARD */}
        <View style={styles.card}>
          <View style={styles.cardAccent} />

          <Text style={styles.cardEyebrow}>
            WELCOME TO HI-LINK
          </Text>

          <Text style={styles.cardTitle}>
            School life, connected.
          </Text>

          <Text style={styles.cardBody}>
            Connect with your school community, discover what is
            happening, share moments and find useful resources.
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.cardPill}>
              <View style={styles.greenDot} />
              <Text style={styles.cardPillText}>
                Built for students
              </Text>
            </View>

            <View style={styles.cardPillBlue}>
              <View style={styles.blueDot} />
              <Text style={styles.cardPillText}>
                Kenyan first
              </Text>
            </View>
          </View>
        </View>

        {/* FEED HEADER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your world</Text>

          <Text style={styles.seeAll}>Latest</Text>
        </View>

        <Feed
          ref={feedRef}
          onRefresh={() => loadFeed()}
          section={feedSection}
          discoverySection={discoverySection}
        />
      </ScrollView>
    </SafeAreaView>
  );
}


async function loadFeed() {
  return getPosts();
}

const Feed = forwardRef<
  FeedHandle,
  {
    onRefresh: () => Promise<Post[]>;
    section: HomeFeedSection;
    discoverySection: HomeDiscoverySection;
  }
>(function Feed(
  {
    onRefresh,
    section,
    discoverySection,
  },
  ref,
) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [identity, setIdentity] = useState<HiLinkUser | null>(null);
  const [activeVideoPostId, setActiveVideoPostId] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void getIdentity().then((currentIdentity) => {
      if (mounted) {
        setIdentity(currentIdentity);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const videoVisibilityRef =
    useRef<
      Record<
        string,
        {
          visibleHeight: number;
          top: number;
        }
      >
    >({});

  const videoViewRefs = useRef<
    Record<string, View | null>
  >({});

  const registerVideoView = useCallback(
    (
      postId: string,
      view: View | null,
    ) => {
      if (view) {
        videoViewRefs.current[postId] = view;
      } else {
        delete videoViewRefs.current[postId];
        delete videoVisibilityRef.current[postId];
      }
    },
    [],
  );

  const handleVideoVisibility = useCallback(
    (
      postId: string,
      visibleHeight: number,
      top: number,
    ) => {
      videoVisibilityRef.current[postId] = {
        visibleHeight,
        top,
      };
    },
    [],
  );

  const measureAllVideos = useCallback(() => {
    const screenHeight =
      require('react-native').Dimensions.get(
        'window',
      ).height;

    const nextVisibility: Record<
      string,
      {
        visibleHeight: number;
        top: number;
      }
    > = {};

    const videoEntries = Object.entries(
      videoViewRefs.current,
    );

    if (videoEntries.length === 0) {
      videoVisibilityRef.current = {};
      setActiveVideoPostId(null);
      return;
    }

    let remainingMeasurements =
      videoEntries.length;

    videoEntries.forEach(
      ([postId, view]) => {
        if (!view) {
          remainingMeasurements -= 1;
          return;
        }

        view.measureInWindow(
          (_x, top, _width, height) => {
            const visibleTop = Math.max(
              0,
              top,
            );

            const visibleBottom = Math.min(
              screenHeight,
              top + height,
            );

            const visibleHeight = Math.max(
              0,
              visibleBottom - visibleTop,
            );

            nextVisibility[postId] = {
              visibleHeight,
              top,
            };

            remainingMeasurements -= 1;

            if (remainingMeasurements > 0) {
              return;
            }

            videoVisibilityRef.current =
              nextVisibility;

            const viewportCenter =
              screenHeight / 2;

            let bestPostId: string | null = null;
            let bestVisibleHeight = 0;
            let bestCenterDistance = Infinity;

            for (const [
              id,
              metrics,
            ] of Object.entries(
              nextVisibility,
            )) {
              if (
                metrics.visibleHeight <= 0
              ) {
                continue;
              }

              const videoCenter =
                metrics.top +
                metrics.visibleHeight / 2;

              const centerDistance =
                Math.abs(
                  videoCenter -
                    viewportCenter,
                );

              if (
                metrics.visibleHeight >
                  bestVisibleHeight ||
                (metrics.visibleHeight ===
                  bestVisibleHeight &&
                  centerDistance <
                    bestCenterDistance)
              ) {
                bestPostId = id;
                bestVisibleHeight =
                  metrics.visibleHeight;
                bestCenterDistance =
                  centerDistance;
              }
            }

            setActiveVideoPostId(
              bestPostId,
            );
          },
        );
      },
    );
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      measureVideos: measureAllVideos,
    }),
    [measureAllVideos],
  );

  const load = useCallback(async () => {

    const result = await getPosts();

    const { getBlockedUserIds } =
      await import(
        '../../src/storage/blockedUsers'
      );

    const { getHiddenPostIds } =
      await import(
        '../../src/storage/hiddenPosts'
      );

    const blockedUserIds =
      await getBlockedUserIds();

    const hiddenPostIds =
      await getHiddenPostIds();

    const visiblePosts = result.filter(
      (post) =>
        !blockedUserIds.includes(
          post.authorId,
        ) &&
        !hiddenPostIds.includes(post.id),
    );

    const sortedPosts =
      visiblePosts.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

    setPosts(sortedPosts);

  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function refresh() {
    setRefreshing(true);

    try {
      const result = await onRefresh();

      const { getBlockedUserIds } =
        await import(
          '../../src/storage/blockedUsers'
        );

      const { getHiddenPostIds } =
        await import(
          '../../src/storage/hiddenPosts'
        );

      const blockedUserIds =
        await getBlockedUserIds();

      const hiddenPostIds =
        await getHiddenPostIds();

      const visiblePosts = result.filter(
        (post) =>
          !blockedUserIds.includes(
            post.authorId,
          ) &&
          !hiddenPostIds.includes(post.id),
      );

      const sortedPosts =
        visiblePosts.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        );

      setPosts(sortedPosts);

    } finally {
      setRefreshing(false);
    }
  }

  if (posts.length === 0) {
    return (
      <View style={styles.placeholder}>
        <View style={styles.placeholderIconWrap}>
          <Text style={styles.placeholderIcon}>✦</Text>
        </View>

        <Text style={styles.placeholderTitle}>
          Your feed starts here
        </Text>

        <Text style={styles.placeholderBody}>
          Create your first photo post using the + button.
        </Text>
      </View>
    );
  }

  const displayedPosts = posts.filter((post) => {
    const matchesContentSection =
      section === 'reels'
        ? post.type === 'video'
        : section === 'library'
          ? post.type === 'document' ||
            post.type === 'study_resource' ||
            post.type === 'question'
          : post.type !== 'video' &&
            post.type !== 'document' &&
            post.type !== 'study_resource' &&
            post.type !== 'question';

    if (!matchesContentSection) {
      return false;
    }

    switch (discoverySection) {
      case 'you':
        return identity?.id === post.authorId;

      case 'school':
        return Boolean(
          identity?.schoolId &&
          post.schoolId &&
          identity.schoolId === post.schoolId,
        );

      case 'friends':
      case 'sports':
      case 'clubs':
        return false;

      default:
        return true;
    }
  });

  return (
    <View>
      {displayedPosts.length === 0 ? (
        <View style={styles.emptyFeed}>
          <Text style={styles.emptyFeedTitle}>
            {section === 'reels'
              ? 'No Reels yet'
              : section === 'library'
                ? 'Your Library is empty'
                : 'No posts yet'}
          </Text>

          <Text style={styles.emptyFeedText}>
            {section === 'reels'
              ? 'Video posts will appear here.'
              : section === 'library'
                ? 'Notes, assignments and study resources will appear here.'
                : 'Your latest posts will appear here.'}
          </Text>
        </View>
      ) : (
        displayedPosts.map((post) => (
          <FeedPost
            key={post.id}
            post={post}
            onChanged={load}
            onVisibilityChange={
              handleVideoVisibility
            }
            activeVideoPostId={
              activeVideoPostId
            }
            setActiveVideoPostId={
              setActiveVideoPostId
            }
            registerVideoView={
              registerVideoView
            }
          />
        ))
      )}

      <View style={styles.feedBottomSpace} />

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={COLORS.green}
          />
        }
        style={styles.refreshOverlay}
        pointerEvents="none"
      />
    </View>
  );
});

function FeedVideo({
  uri,
  postId,
  width,
  height,
  activeVideoPostId,
  setActiveVideoPostId,
  onVisibilityChange,
  registerVideoView,
  onDoubleTapLike,
}: {
  uri: string;
  postId: string;
  width?: number;
  height?: number;
  activeVideoPostId: string | null;
  setActiveVideoPostId: (
    postId: string | null,
  ) => void;
  onVisibilityChange: (
    postId: string,
    visibleHeight: number,
    top: number,
  ) => void;
  registerVideoView: (
    postId: string,
    view: View | null,
  ) => void;
  onDoubleTapLike: () => void;
}) {
  const { width: screenWidth } =
    useWindowDimensions();

  const videoFrameHeight = Math.round(
    (screenWidth * 4) / 5,
  );

  const videoRef =
    useRef<View>(null);

  const lastTapRef =
    useRef<number | null>(null);

  const doubleTapTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive =
    activeVideoPostId === postId;

  const reportVisibility = useCallback(() => {
    videoRef.current?.measureInWindow(
      (_x, top, _width, height) => {
        const screenHeight =
          require('react-native').Dimensions.get(
            'window',
          ).height;

        const visibleTop = Math.max(
          0,
          top,
        );

        const visibleBottom = Math.min(
          screenHeight,
          top + height,
        );

        const visibleHeight = Math.max(
          0,
          visibleBottom - visibleTop,
        );

        onVisibilityChange(
          postId,
          visibleHeight,
          top,
        );
      },
    );
  }, [
    onVisibilityChange,
    postId,
  ]);

  useEffect(() => {
    registerVideoView(
      postId,
      videoRef.current,
    );

    const timer = setTimeout(
      reportVisibility,
      150,
    );

    return () => {
      clearTimeout(timer);

      if (doubleTapTimerRef.current) {
        clearTimeout(doubleTapTimerRef.current);
      }

      registerVideoView(postId, null);
    };
  }, [
    postId,
    registerVideoView,
    reportVisibility,
  ]);

  function handleVideoContainerPress() {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (
      lastTap !== null &&
      now - lastTap < 320
    ) {
      lastTapRef.current = null;

      if (doubleTapTimerRef.current) {
        clearTimeout(doubleTapTimerRef.current);
        doubleTapTimerRef.current = null;
      }

      onDoubleTapLike();
      return;
    }

    lastTapRef.current = now;

    doubleTapTimerRef.current = setTimeout(() => {
      lastTapRef.current = null;
      doubleTapTimerRef.current = null;
    }, 320);
  }

  return (
    <Pressable
      onPress={handleVideoContainerPress}
      style={styles.feedVideo}
    >
      <View
        ref={videoRef}
        style={styles.feedVideo}
      >
      {isActive ? (
        <ActiveFeedVideo
          uri={uri}
          postId={postId}
          setActiveVideoPostId={
            setActiveVideoPostId
          }
          onDoubleTapLike={
            onDoubleTapLike
          }
        />
      ) : (
        <Pressable
          style={styles.feedVideoPlayer}
          onPress={() =>
            setActiveVideoPostId(postId)
          }
          accessibilityRole="button"
          accessibilityLabel="Play video"
        >
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#000',
            }}
          >
            <View
              style={styles.videoPlayButton}
            >
              <Ionicons
                name="play"
                size={30}
                color={COLORS.white}
              />
            </View>
          </View>
        </Pressable>
      )}
      </View>
    </Pressable>
  );
}

function ActiveFeedVideo({
  uri,
  postId,
  setActiveVideoPostId,
  onDoubleTapLike,
}: {
  uri: string;
  postId: string;
  setActiveVideoPostId: (
    postId: string | null,
  ) => void;
  onDoubleTapLike: () => void;
}) {
  const player = useVideoPlayer(
    uri,
    (videoPlayer) => {
      videoPlayer.loop = false;
      videoPlayer.play();
    },
  );

  const [playing, setPlaying] =
    useState(true);

  const lastTapRef =
    useRef<number | null>(null);

  const singleTapTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) {
        clearTimeout(
          singleTapTimerRef.current,
        );
      }
    };
  }, []);

  function togglePlayback() {
    if (playing) {
      player.pause();
      setPlaying(false);
      setActiveVideoPostId(null);
      return;
    }

    player.play();
    setPlaying(true);
  }

  function handleVideoTap() {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (
      lastTap !== null &&
      now - lastTap < 280
    ) {
      lastTapRef.current = null;

      if (singleTapTimerRef.current) {
        clearTimeout(
          singleTapTimerRef.current,
        );
        singleTapTimerRef.current = null;
      }

      onDoubleTapLike();
      return;
    }

    lastTapRef.current = now;

    singleTapTimerRef.current =
      setTimeout(() => {
        lastTapRef.current = null;
        singleTapTimerRef.current = null;
        togglePlayback();
      }, 280);
  }

  return (
    <Pressable
      style={styles.feedVideoPlayer}
      onPress={handleVideoTap}
      accessibilityRole="button"
      accessibilityLabel={
        playing
          ? 'Pause video or double tap to like'
          : 'Play video or double tap to like'
      }
    >
      <VideoView
        player={player}
        style={styles.feedVideoPlayer}
        nativeControls={false}
        contentFit="contain"
      />

      {!playing ? (
        <View style={styles.videoPlayOverlay}>
          <View style={styles.videoPlayButton}>
            <Ionicons
              name="play"
              size={30}
              color={COLORS.white}
            />
          </View>
        </View>
      ) : (
        <View style={styles.videoPlayingBadge}>
          <Ionicons
            name="volume-high"
            size={15}
            color={COLORS.white}
          />

          <Text style={styles.videoPlayingText}>
            Playing
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function FeedPost({
  post,
  onChanged,
  activeVideoPostId,
  setActiveVideoPostId,
  onVisibilityChange,
  registerVideoView,
}: {
  post: Post;
  onChanged: () => Promise<void>;
  activeVideoPostId: string | null;
  setActiveVideoPostId: (
    postId: string | null,
  ) => void;
  onVisibilityChange: (
    postId: string,
    visibleHeight: number,
    top: number,
  ) => void;
  registerVideoView: (
    postId: string,
    view: View | null,
  ) => void;
}) {
  const [commentCount, setCommentCount] =
    useState(post.comments);

  const [likeCount, setLikeCount] =
    useState(post.likes);

  const [liked, setLiked] = useState(false);

  const [reaction, setReaction] =
    useState<PostReaction | null>(null);

  const [showReactions, setShowReactions] =
    useState(false);

  const [saved, setSaved] = useState(false);

  const [lastTap, setLastTap] =
    useState<number | null>(null);

  useEffect(() => {
    loadSavedState();
  }, [post.id]);

  async function loadSavedState() {
    const result = await isPostSaved(post.id);
    setSaved(result);
  }

  useEffect(() => {
    loadLikedState();
  }, [post.id]);

  async function loadLikedState() {
    const storedReaction =
      await getPostReaction(post.id);

    setReaction(storedReaction);
    setLiked(storedReaction === 'like');
  }

  async function selectReaction(
    nextReaction: PostReaction,
  ) {
    try {
      const currentReaction = reaction;

      if (currentReaction === nextReaction) {
        await removePostReaction(post.id);

        setReaction(null);
        setLiked(false);

        const nextCount = Math.max(
          0,
          likeCount - 1,
        );

        setLikeCount(nextCount);

        await updatePost({
          ...post,
          likes: nextCount,
          updatedAt: new Date().toISOString(),
        });

        setShowReactions(false);
        await onChanged();
        return;
      }

      await setPostReaction(
        post.id,
        nextReaction,
      );

      setReaction(nextReaction);
      setLiked(nextReaction === 'like');

      const nextCount =
        currentReaction === null
          ? likeCount + 1
          : likeCount;

      setLikeCount(nextCount);

      await updatePost({
        ...post,
        likes: nextCount,
        updatedAt: new Date().toISOString(),
      });

      setShowReactions(false);
      await onChanged();
    } catch (error) {
      console.error(
        'Reaction update failed:',
        error,
      );
    }
  }

  async function toggleLike() {
    try {
      await selectReaction('like');
    } catch (error) {
      console.error(
        'Like post failed:',
        error,
      );
    }
  }

  async function toggleSave() {
    try {
      const result =
        await toggleSavedPost(post.id);

      setSaved(result);
    } catch (error) {
      console.error(
        'Save post failed:',
        error,
      );
    }
  }

  function handlePostTap() {
    const now = Date.now();

    if (
      lastTap !== null &&
      now - lastTap < 300
    ) {
      setLastTap(null);
      void toggleLike();
      return;
    }

    setLastTap(now);
  }

  async function openComments() {
    const comments =
      await getCommentsByPost(post.id);

    setCommentCount(comments.length);

    router.push({
      pathname: '/comments/[postId]',
      params: { postId: post.id },
    });
  }

  async function sharePost() {
    try {
      await Share.share({
        message:
          post.text ||
          `Check out ${post.authorName}'s post on Hi-Link.`,
      });

      const updated: Post = {
        ...post,
        shares: post.shares + 1,
        updatedAt: new Date().toISOString(),
      };

      const { updatePost } =
        await import('../../src/storage/posts');

      await updatePost(updated);
      await onChanged();
    } catch (error) {
      console.error('Share failed:', error);
    }
  }

  async function downloadMedia() {
    if (!post.attachment?.uri) {
      return;
    }

    if (post.allowDownload === false) {
      Alert.alert(
        'Download disabled',
        'The author has disabled downloads for this post.',
      );
      return;
    }

    const permission =
      await MediaLibrary.requestPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow Hi-Link to access your media library to save this media.',
      );
      return;
    }

    try {
      await MediaLibrary.saveToLibraryAsync(
        post.attachment.uri,
      );

      const mediaLabel =
        post.type === 'video'
          ? 'video'
          : 'image';

      Alert.alert(
        'Saved',
        `The ${mediaLabel} has been saved to your device gallery.`,
      );
    } catch (error) {
      console.error(
        'Media download failed:',
        error,
      );

      Alert.alert(
        'Could not save',
        'Hi-Link could not save this media to your gallery.',
      );
    }
  }

  function openProfile() {
    router.push({
      pathname: '/profile/[id]',
      params: { id: post.authorId },
    });
  }

  function openPostMenu() {
    void getIdentity().then((identity) => {
      const isOwnPost =
        identity?.id === post.authorId;

      if (isOwnPost) {
        Alert.alert(
          'Post options',
          undefined,
          [
            {
              text: 'Edit post',
              onPress: () => {
                const editor =
                  post.type === 'video'
                    ? '/create-video'
                    : post.type === 'text'
                      ? '/create-text'
                      : '/create-photo';

                router.push({
                  pathname: editor,
                  params: {
                    editId: post.id,
                  },
                });
              },
            },
            ...(post.attachment?.uri &&
            post.allowDownload !== false &&
            (post.type === 'photo' ||
              post.type === 'video')
              ? [
                  {
                    text: 'Download',
                    onPress: downloadMedia,
                  },
                ]
              : []),
            {
              text: 'Delete post',
              style: 'destructive',
              onPress: confirmDeletePost,
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ],
        );

        return;
      }

      const mediaActions =
        post.attachment?.uri &&
        post.allowDownload !== false &&
        (post.type === 'photo' ||
          post.type === 'video')
          ? [
              {
                text: 'Download',
                onPress: downloadMedia,
              },
            ]
          : [];

      Alert.alert(
        'Post options',
        undefined,
        [
          ...mediaActions,
          {
            text: 'Hide post',
            onPress: hideThisPost,
          },
          {
            text: 'Block user',
            style: 'destructive',
            onPress: confirmBlockUser,
          },
          {
            text: 'Report post',
            style: 'destructive',
            onPress: openReportPrompt,
          },
          {
            text: 'Report user',
            style: 'destructive',
            onPress: openUserReportPrompt,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
      );
    });
  }

  async function hideThisPost() {
    try {
      const { hidePost } =
        await import(
          '../../src/storage/hiddenPosts'
        );

      await hidePost(post.id);
      await onChanged();
    } catch (error) {
      console.error(
        'Hide post failed:',
        error,
      );
    }
  }

  function confirmBlockUser() {
    Alert.alert(
      'Block user?',
      `You will no longer see posts from @${post.authorUsername}.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: blockThisUser,
        },
      ],
    );
  }

  async function blockThisUser() {
    try {
      const identity =
        await getIdentity();

      if (
        identity &&
        identity.id === post.authorId
      ) {
        Alert.alert(
          'Cannot block yourself',
          'You cannot block your own account.',
        );
        return;
      }

      const { blockUser } =
        await import(
          '../../src/storage/blockedUsers'
        );

      await blockUser(post.authorId);
      await onChanged();

      Alert.alert(
        'User blocked',
        `Posts from @${post.authorUsername} will no longer appear in your feed.`,
      );
    } catch (error) {
      console.error(
        'Block user failed:',
        error,
      );

      Alert.alert(
        'Could not block',
        'Hi-Link could not save the block. Please try again.',
      );
    }
  }

  function openUserReportPrompt() {
    Alert.alert(
      'Report user',
      `Why are you reporting @${post.authorUsername}?`,
      [
        {
          text: 'Spam',
          onPress: () =>
            submitUserReport('spam'),
        },
        {
          text: 'Bullying / Harassment',
          onPress: () =>
            submitUserReport('bullying'),
        },
        {
          text: 'Inappropriate content',
          onPress: () =>
            submitUserReport('inappropriate'),
        },
        {
          text: 'Hate / Abuse',
          onPress: () =>
            submitUserReport('hate'),
        },
        {
          text: 'Impersonation',
          onPress: () =>
            submitUserReport('impersonation'),
        },
        {
          text: 'Something else',
          onPress: () =>
            submitUserReport('other'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  }

  async function submitUserReport(
    reason:
      | 'spam'
      | 'bullying'
      | 'inappropriate'
      | 'hate'
      | 'impersonation'
      | 'other',
  ) {
    try {
      const identity =
        await getIdentity();

      if (!identity) {
        Alert.alert(
          'Account required',
          'You need a Hi-Link account to report a user.',
        );
        return;
      }

      if (
        identity.id === post.authorId
      ) {
        Alert.alert(
          'Cannot report yourself',
          'You cannot report your own account.',
        );
        return;
      }

      const {
        hasReportedUser,
        addUserReport,
      } = await import(
        '../../src/storage/userReports'
      );

      const alreadyReported =
        await hasReportedUser(
          post.authorId,
          identity.id,
        );

      if (alreadyReported) {
        Alert.alert(
          'Already reported',
          'You have already reported this user.',
        );
        return;
      }

      await addUserReport({
        id: `user-report-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

        reportedUserId:
          post.authorId,

        reportedUsername:
          post.authorUsername,

        reporterId:
          identity.id,

        reporterName:
          identity.name,

        reason,

        createdAt:
          new Date().toISOString(),
      });

      Alert.alert(
        'Report submitted',
        'Thank you. Your report has been saved for Hi-Link moderation.',
      );
    } catch (error) {
      console.error(
        'Report user failed:',
        error,
      );

      Alert.alert(
        'Could not report',
        'Hi-Link could not save your report. Please try again.',
      );
    }
  }

  function confirmDeletePost() {
    Alert.alert(
      'Delete post?',
      'This will permanently remove your post and its local comments from this device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: deleteThisPost,
        },
      ],
    );
  }

  async function deleteThisPost() {
    try {
      const { deletePost } =
        await import(
          '../../src/storage/posts'
        );

      const { deleteCommentsForPost } =
        await import(
          '../../src/storage/comments'
        );

      const { removePostReaction } =
        await import(
          '../../src/storage/postReactions'
        );

      const { unsavePost } =
        await import(
          '../../src/storage/savedPosts'
        );

      await deleteCommentsForPost(post.id);
      await removePostReaction(post.id);
      await unsavePost(post.id);
      await deletePost(post.id);
      await onChanged();
    } catch (error) {
      console.error(
        'Delete post failed:',
        error,
      );

      Alert.alert(
        'Could not delete',
        'Hi-Link could not delete this post. Please try again.',
      );
    }
  }

  function openReportPrompt() {
    Alert.alert(
      'Report post',
      'Why are you reporting this post?',
      [
        {
          text: 'Spam',
          onPress: () =>
            submitReport('spam'),
        },
        {
          text: 'Bullying / Harassment',
          onPress: () =>
            submitReport('bullying'),
        },
        {
          text: 'Inappropriate content',
          onPress: () =>
            submitReport('inappropriate'),
        },
        {
          text: 'Hate / Abuse',
          onPress: () =>
            submitReport('hate'),
        },
        {
          text: 'Academic misconduct',
          onPress: () =>
            submitReport(
              'academic_misconduct',
            ),
        },
        {
          text: 'Something else',
          onPress: () =>
            submitReport('other'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
    );
  }

  async function submitReport(
    reason:
      | 'spam'
      | 'bullying'
      | 'inappropriate'
      | 'hate'
      | 'academic_misconduct'
      | 'other',
  ) {
    try {
      const identity =
        await getIdentity();

      if (!identity) {
        Alert.alert(
          'Account required',
          'You need a Hi-Link account to report a post.',
        );
        return;
      }

      const { hasReportedPost, addReport } =
        await import(
          '../../src/storage/reports'
        );

      const alreadyReported =
        await hasReportedPost(
          post.id,
          identity.id,
        );

      if (alreadyReported) {
        Alert.alert(
          'Already reported',
          'You have already reported this post.',
        );
        return;
      }

      await addReport({
        id: `report-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

        postId: post.id,

        reporterId: identity.id,
        reporterName: identity.name,

        reason,

        createdAt:
          new Date().toISOString(),
      });

      Alert.alert(
        'Report submitted',
        'Thank you. Your report has been saved and can be reviewed by Hi-Link moderation tools.',
      );
    } catch (error) {
      console.error(
        'Report post failed:',
        error,
      );

      Alert.alert(
        'Could not report',
        'Hi-Link could not save your report. Please try again.',
      );
    }
  }

  return (
    <View style={styles.feedPost}>
      <View style={styles.feedHeader}>
        <Pressable
          onPress={openProfile}
          style={styles.feedAuthor}
        >
          {post.authorAvatarUri ? (
            <Image
              source={{ uri: post.authorAvatarUri }}
              style={styles.feedAvatar}
            />
          ) : (
            <View style={styles.feedAvatarFallback}>
              <Ionicons
                name="person"
                size={19}
                color={COLORS.green}
              />
            </View>
          )}

          <View style={styles.feedAuthorInfo}>
            <Text style={styles.feedAuthorName}>
              {post.authorName}
            </Text>

            <Text style={styles.feedAuthorMeta}>
              @{post.authorUsername}
              {post.schoolName
                ? ` · ${post.schoolName}`
                : ''}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={openPostMenu}
          style={styles.postMenuButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Post options"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={COLORS.softWhite}
          />
        </Pressable>
      </View>

      <View style={styles.feedContent}>
        {post.text ? (
          <Text style={styles.feedText}>
            {post.text}
          </Text>
        ) : null}

        {post.type === 'photo' &&
        post.attachment?.uri ? (
          <Image
            source={{ uri: post.attachment.uri }}
            style={styles.feedImage}
            resizeMode="cover"
          />
        ) : null}

        {post.type === 'video' &&
        post.attachment?.uri ? (
          <FeedVideo
            uri={post.attachment.uri}
            postId={post.id}
            width={post.attachment.width}
            height={post.attachment.height}
            onVisibilityChange={
              onVisibilityChange
            }
            registerVideoView={
              registerVideoView
            }
            activeVideoPostId={activeVideoPostId}
            setActiveVideoPostId={
              setActiveVideoPostId
            }
            onDoubleTapLike={() => {
              void toggleLike();
            }}
          />
        ) : null}
      </View>

      <View style={styles.feedActions}>
        <View style={styles.reactionAction}>
          {showReactions ? (
            <View style={styles.reactionPicker}>
              <Pressable
                onPress={() => selectReaction('like')}
                style={styles.reactionButton}
              >
                <Text style={styles.reactionEmoji}>
                  ❤️
                </Text>
              </Pressable>

              <Pressable
                onPress={() => selectReaction('love')}
                style={styles.reactionButton}
              >
                <Text style={styles.reactionEmoji}>
                  ❤️
                </Text>
              </Pressable>

              <Pressable
                onPress={() => selectReaction('laugh')}
                style={styles.reactionButton}
              >
                <Text style={styles.reactionEmoji}>
                  😂
                </Text>
              </Pressable>

              <Pressable
                onPress={() => selectReaction('wow')}
                style={styles.reactionButton}
              >
                <Text style={styles.reactionEmoji}>
                  😮
                </Text>
              </Pressable>

              <Pressable
                onPress={() => selectReaction('sad')}
                style={styles.reactionButton}
              >
                <Text style={styles.reactionEmoji}>
                  😢
                </Text>
              </Pressable>

              <Pressable
                onPress={() => selectReaction('angry')}
                style={styles.reactionButton}
              >
                <Text style={styles.reactionEmoji}>
                  😡
                </Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable
            onPress={toggleLike}
            onLongPress={() =>
              setShowReactions(true)
            }
            delayLongPress={300}
            style={styles.feedAction}
          >
            <Ionicons
              name={
                reaction === 'love'
                  ? 'heart'
                  : liked
                    ? 'heart'
                    : 'heart-outline'
              }
              size={21}
              color={
                liked || reaction
                  ? COLORS.green
                  : COLORS.softWhite
              }
            />

            <Text
              style={[
                styles.feedActionText,
                (liked || reaction) && {
                  color: COLORS.green,
                },
              ]}
            >
              {likeCount}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            if (post.commentsAllowed === false) {
              Alert.alert(
                'Comments disabled',
                'The author has disabled comments on this post.',
              );
              return;
            }

            openComments();
          }}
          style={styles.feedAction}
        >
          <Ionicons
            name="chatbubble-outline"
            size={21}
            color={COLORS.softWhite}
          />

          <Text style={styles.feedActionText}>
            {commentCount}
          </Text>
        </Pressable>

        <Pressable
          onPress={sharePost}
          style={styles.feedAction}
        >
          <Ionicons
            name="share-social-outline"
            size={21}
            color={COLORS.softWhite}
          />

          <Text style={styles.feedActionText}>
            {post.shares}
          </Text>
        </Pressable>

        <Pressable
          onPress={toggleSave}
          style={styles.feedAction}
        >
          <Ionicons
            name={
              saved
                ? 'bookmark'
                : 'bookmark-outline'
            }
            size={21}
            color={
              saved
                ? COLORS.green
                : COLORS.softWhite
            }
          />

          <Text
            style={[
              styles.feedActionText,
              saved && {
                color: COLORS.green,
              },
            ]}
          >
            {saved ? 'Saved' : 'Save'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feedTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#F1F3F5',
  },

  feedTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },

  feedTabActive: {
    backgroundColor: '#FFFFFF',
  },

  feedTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  feedTabTextActive: {
    color: '#0B6BFF',
  },

  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
    paddingHorizontal: 24,
  },

  emptyFeedTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  emptyFeedText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: '#6B7280',
  },

  fixedHomeHeader: {
    backgroundColor: COLORS.background,
    zIndex: 20,
  },

  homeNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 4,
    marginBottom: 4,
  },

  homeNavigationItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },

  homeNavigationItemActive: {
    backgroundColor: '#F1F3F5',
    borderBottomColor: COLORS.green,
  },

  homeNavigationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  homeNavigationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },

  homeNavigationTextActive: {
    color: '#000000',
    fontWeight: '800',
  },

  homeNavigationBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#19E68C',
  },

  homeNavigationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000000',
  },

  feedSection: {
    marginBottom: 8,
  },

  feedPost: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    overflow: 'hidden',
  },

  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  feedAuthor: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },

  postMenuButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  feedAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  feedAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedAuthorInfo: {
    flex: 1,
    marginLeft: 11,
  },

  feedAuthorName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },

  feedAuthorMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },

  feedText: {
    color: COLORS.softWhite,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 15,
    paddingBottom: 14,
  },

  feedContent: {
    width: '100%',
  },

  feedVideo: {
    width: '100%',
    aspectRatio: 450 / 600,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },

  feedVideoPlayer: {
    width: '100%',
    height: '100%',
  },

  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  videoPlayButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },

  videoPlayingBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },

  videoPlayingText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },

  feedImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.surfaceRaised,
  },

  feedActions: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  reactionAction: {
    position: 'relative',
    alignItems: 'flex-start',
  },

  reactionPicker: {
    position: 'absolute',
    bottom: 42,
    left: -4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceRaised,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 5,
    zIndex: 20,
    elevation: 8,
  },

  reactionButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reactionEmoji: {
    fontSize: 22,
  },

  feedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },

  feedActionText: {
    color: COLORS.softWhite,
    fontSize: 12,
    fontWeight: '700',
  },

  feedBottomSpace: {
    height: 100,
  },

  refreshOverlay: {
    display: 'none',
  },


  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingTop: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brandBlock: {
    flex: 1,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logo: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 2.2,
  },

  logoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
    marginLeft: 7,
    marginTop: 11,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },

  notification: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },

  greeting: {
    marginTop: 30,
    marginBottom: 18,
  },

  greetingTitle: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  greetingSubtitle: {
    color: COLORS.muted,
    marginTop: 6,
    fontSize: 14,
  },

  stories: {
    paddingBottom: 23,
    paddingRight: 8,
  },

  story: {
    alignItems: 'center',
    marginRight: 18,
  },

  storyCircle: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  storyCircleActive: {
    borderWidth: 2,
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenSoft,
  },

  storyCircleBlue: {
    borderColor: COLORS.blue,
    backgroundColor: COLORS.blueSoft,
  },

  storyInitial: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
  },

  storyLabelActive: {
    color: '#000000',
    fontWeight: '800',
  },

  storyActiveDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: COLORS.green,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  storyLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 7,
  },

  card: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 21,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: COLORS.green,
  },

  cardEyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  cardTitle: {
    color: COLORS.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginTop: 10,
  },

  cardBody: {
    color: COLORS.softWhite,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },

  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
    gap: 8,
  },

  cardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  cardPillBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  cardPillText: {
    color: COLORS.softWhite,
    fontSize: 11,
    fontWeight: '700',
  },

  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.green,
    marginRight: 6,
  },

  blueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.blue,
    marginRight: 6,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 12,
  },

  sectionTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },

  seeAll: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '700',
  },

  placeholder: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  placeholderIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderIcon: {
    color: COLORS.green,
    fontSize: 26,
  },

  placeholderTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
  },

  placeholderBody: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
});
