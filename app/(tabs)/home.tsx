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
  Animated,
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

import {
  ThemeColors,
  useTheme,
} from '../../src/theme/ThemeProvider';
import HiLinkVideoFeed from '../../src/components/HiLinkVideoFeed';
import {
  DEFAULT_VIDEO_SETTINGS,
  getVideoSettings,
  VideoDisplayMode,
} from '../../src/storage/videoSettings';
import { Post } from '../../src/models/post';
import { getIdentity } from '../../src/storage/identity';
import {
  getRecentlyWatchedVideoIds,
  recordVideoWatch,
} from '../../src/storage/videoHistory';
import {
  addPost,
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
import {
  isPostReshared,
  addReshare,
} from '../../src/storage/reshares';
import { getFollowingIds } from '../../src/storage/follows';
import { getKnownUsers } from '../../src/storage/users';

const DISCOVERY_SPORTS = [
  'football',
  'soccer',
  'rugby',
  'basketball',
  'volleyball',
  'athletics',
  'tennis',
  'hockey',
  'swimming',
  'cricket',
  'handball',
  'netball',
  'badminton',
  'boxing',
  'karate',
  'taekwondo',
  'chess',
];

function normalizeDiscoveryValue(value: string): string {
  return value.trim().toLowerCase();
}

function matchesDiscoveryTerms(
  values: string[] | undefined,
  terms: string[],
): boolean {
  if (!values?.length || !terms.length) {
    return false;
  }

  return values.some((value) => {
    const normalizedValue =
      normalizeDiscoveryValue(value);

    return terms.some((term) => {
      const normalizedTerm =
        normalizeDiscoveryValue(term);

      return (
        normalizedValue === normalizedTerm ||
        normalizedValue.includes(normalizedTerm) ||
        normalizedTerm.includes(normalizedValue)
      );
    });
  });
}

const REACTION_EMOJI: Record<
  PostReaction,
  string
> = {
  like: '❤️',
  love: '💕',
  laugh: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
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
  const { colors } = useTheme();
  const styles = createStyles(colors);

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
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [identity, setIdentity] = useState<HiLinkUser | null>(null);
  const [followingIds, setFollowingIds] =
    useState<string[]>([]);
  const [knownUsers, setKnownUsers] =
    useState<HiLinkUser[]>([]);
  const [recentlyWatched, setRecentlyWatched] =
    useState<Post[]>([]);
  const [activeVideoPostId, setActiveVideoPostId] =
    useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const [
        currentIdentity,
        currentKnownUsers,
      ] = await Promise.all([
        getIdentity(),
        getKnownUsers(),
      ]);

      if (!mounted) {
        return;
      }

      setIdentity(currentIdentity);
      setKnownUsers(currentKnownUsers);

      if (currentIdentity) {
        const currentFollowingIds =
          await getFollowingIds(
            currentIdentity.id,
          );

        if (mounted) {
          setFollowingIds(
            currentFollowingIds,
          );
        }
      } else {
        setFollowingIds([]);
      }
    })();

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

    const recentIds =
      await getRecentlyWatchedVideoIds(10);

    const recentMap = new Map(
      result
        .filter(
          (post) =>
            post.type === 'video' &&
            post.attachment?.uri,
        )
        .map((post) => [post.id, post]),
    );

    setRecentlyWatched(
      recentIds
        .map((id) => recentMap.get(id))
        .filter(
          (post): post is Post =>
            Boolean(post),
        ),
    );

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

      return () => {
        setActiveVideoPostId(null);
      };
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
          Share a post, photo, video, or study resource using the + button.
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
        return followingIds.includes(
          post.authorId,
        );

      case 'sports': {
        const author = knownUsers.find(
          (user) => user.id === post.authorId,
        );

        return (
          matchesDiscoveryTerms(
            post.tags,
            DISCOVERY_SPORTS,
          ) ||
          matchesDiscoveryTerms(
            author?.interests,
            DISCOVERY_SPORTS,
          )
        );
      }

      case 'clubs': {
        const currentClubs = [
          ...(identity?.clubs ?? []),
          ...(identity?.societies ?? []),
        ];

        if (currentClubs.length === 0) {
          return matchesDiscoveryTerms(
            post.tags,
            ['club', 'clubs', 'society', 'societies'],
          );
        }

        const author = knownUsers.find(
          (user) => user.id === post.authorId,
        );

        const authorClubs = [
          ...(author?.clubs ?? []),
          ...(author?.societies ?? []),
        ];

        return (
          matchesDiscoveryTerms(
            post.tags,
            currentClubs,
          ) ||
          matchesDiscoveryTerms(
            authorClubs,
            currentClubs,
          )
        );
      }

      default:
        return true;
    }
  });

  return (
    <View>
      {section === 'reels' &&
      recentlyWatched.length > 0 ? (
        <View style={styles.recentlyWatchedSection}>
          <View style={styles.recentlyWatchedHeader}>
            <View>
              <Text style={styles.recentlyWatchedTitle}>
                Recently watched
              </Text>

              <Text style={styles.recentlyWatchedSubtitle}>
                Pick up where you left off
              </Text>
            </View>

            <Ionicons
              name="time-outline"
              size={20}
              color={colors.accent}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.recentlyWatchedList
            }
          >
            {recentlyWatched.map((post) => (
              <Pressable
                key={post.id}
                style={styles.recentlyWatchedCard}
                onPress={() =>
                  router.push({
                    pathname: '/video/[id]',
                    params: {
                      id: post.id,
                    },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open recently watched video by ${post.authorName}`}
              >
                <View
                  style={
                    styles.recentlyWatchedPreview
                  }
                >
                  <Ionicons
                    name="play"
                    size={28}
                    color={colors.text}
                  />

                  <View
                    style={
                      styles.recentlyWatchedPlayCircle
                    }
                  >
                    <Ionicons
                      name="play"
                      size={16}
                      color={colors.text}
                    />
                  </View>
                </View>

                <Text
                  style={
                    styles.recentlyWatchedAuthor
                  }
                  numberOfLines={1}
                >
                  {post.authorName}
                </Text>

                {post.text ? (
                  <Text
                    style={
                      styles.recentlyWatchedCaption
                    }
                    numberOfLines={2}
                  >
                    {post.text}
                  </Text>
                ) : (
                  <Text
                    style={
                      styles.recentlyWatchedCaption
                    }
                    numberOfLines={1}
                  >
                    Video
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {displayedPosts.length === 0 ? (
        <View style={styles.emptyFeed}>
          <Text style={styles.emptyFeedTitle}>
            {discoverySection === 'you'
              ? section === 'reels'
                ? 'No Reels from you yet'
                : section === 'library'
                  ? 'Your Library is empty'
                  : 'No posts from you yet'
              : discoverySection === 'school'
                ? section === 'reels'
                  ? 'No school Reels yet'
                  : section === 'library'
                    ? 'No school resources yet'
                    : 'No school posts yet'
                : discoverySection === 'friends'
                  ? 'No Friends content yet'
                  : discoverySection === 'sports'
                    ? 'No Sports content yet'
                    : discoverySection === 'clubs'
                      ? 'No Clubs content yet'
                      : section === 'reels'
                        ? 'No Reels yet'
                        : section === 'library'
                          ? 'Your Library is empty'
                          : 'No posts yet'}
          </Text>

          <Text style={styles.emptyFeedText}>
            {discoverySection === 'you'
              ? section === 'reels'
                ? 'Your video posts will appear here.'
                : section === 'library'
                  ? 'Your notes, assignments and study resources will appear here.'
                  : 'Your latest posts will appear here.'
              : discoverySection === 'school'
                ? section === 'reels'
                  ? 'Video posts from your school will appear here.'
                  : section === 'library'
                    ? 'Notes, assignments and study resources from your school will appear here.'
                    : 'Posts from your school community will appear here.'
                : discoverySection === 'friends'
                  ? 'Connect with friends to see their posts, Reels and shared resources here.'
                  : discoverySection === 'sports'
                    ? 'Sports content will appear here when Sports communities and posts are available.'
                    : discoverySection === 'clubs'
                      ? 'Club content will appear here when Clubs communities and posts are available.'
                      : section === 'reels'
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
            tintColor={colors.accent}
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
  activeVideoPostId,
  setActiveVideoPostId,
  onVisibilityChange,
  registerVideoView,
  onDoubleTapLike,
}: {
  uri: string;
  postId: string;
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
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const videoRef = useRef<View>(null);
  const lastTapRef = useRef<number | null>(null);

  const player = useVideoPlayer(
    uri,
    (videoPlayer) => {
      videoPlayer.loop = false;
    },
  );

  function videoLog(
    event: string,
    details?: Record<string, unknown>,
  ) {
    console.log(
      `[HI-LINK VIDEO] ${event}`,
      details ?? '',
    );
  }

  const isActive =
    activeVideoPostId === postId;

  const [playing, setPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const progressWidthRef =
    useRef(0);

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

      registerVideoView(postId, null);
    };
  }, [
    postId,
    registerVideoView,
    reportVisibility,
  ]);

  useEffect(() => {
    if (!isActive) {
      player.pause();
      setPlaying(false);
      return;
    }

    if (
      Number.isFinite(player.duration) &&
      player.duration > 0
    ) {
      setDuration(player.duration);
    }

    player.play();
    setPlaying(true);
    void recordVideoWatch(postId);
  }, [
    isActive,
    player,
    postId,
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
            Number.isFinite(player.duration) &&
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
            Number.isFinite(player.duration) &&
            player.duration > 0
          ) {
            setDuration(
              player.duration,
            );
          }
        },
      );

    return () => {
      timeSubscription.remove();
      statusSubscription.remove();
    };
  }, [player]);

  useEffect(() => {
    const subscription =
      player.addListener(
        'playingChange',
        (event) => {
          setPlaying(event.isPlaying);
        },
      );

    return () => {
      subscription.remove();
    };
  }, [player]);

  function togglePlayback() {
    if (!isActive) {
      setActiveVideoPostId(postId);
      player.play();
      setPlaying(true);
      void recordVideoWatch(postId);
      return;
    }

    if (playing) {
      const pausedAt = Number.isFinite(player.currentTime)
        ? player.currentTime
        : currentTime;

      videoLog('PAUSE_REQUEST', {
        postId,
        currentTime: pausedAt,
        duration,
      });

      player.pause();
      setCurrentTime(pausedAt);
      setPlaying(false);

      // Keep the video active while paused so the next tap resumes
      // from the current position.
      setActiveVideoPostId(postId);
      return;
    }

    videoLog('PLAY_REQUEST', {
      postId,
      currentTime: player.currentTime,
      duration,
    });

    player.play();
    setPlaying(true);
    setActiveVideoPostId(postId);
    void recordVideoWatch(postId);
  }

  function handleVideoPress() {
    const now = Date.now();
    const previousTap = lastTapRef.current;

    videoLog('TAP', {
      postId,
      playing,
      isActive,
      currentTime: player.currentTime,
    });

    if (
      previousTap !== null &&
      now - previousTap < 280
    ) {
      lastTapRef.current = null;

      videoLog('DOUBLE_TAP', {
        postId,
        elapsed: now - previousTap,
      });

      onDoubleTapLike();
    } else {
      lastTapRef.current = now;
    }

    togglePlayback();
  }

  function seekFromPress(
    event: any,
  ) {
    if (!duration || duration <= 0) {
      return;
    }

    const width =
      progressWidthRef.current;

    const locationX =
      event.nativeEvent.locationX;

    if (!width || width <= 0) {
      return;
    }

    const ratio = Math.max(
      0,
      Math.min(1, locationX / width),
    );

    const nextTime = duration * ratio;

    videoLog('SEEK', {
      postId,
      from: player.currentTime,
      to: nextTime,
      duration,
    });

    player.currentTime = nextTime;

    setCurrentTime(nextTime);
  }

  function formatTime(
    seconds: number,
  ) {
    if (
      !Number.isFinite(seconds) ||
      seconds < 0
    ) {
      return '0:00';
    }

    const totalSeconds =
      Math.floor(seconds);

    const minutes =
      Math.floor(totalSeconds / 60);

    const remaining =
      totalSeconds % 60;

    return `${minutes}:${String(
      remaining,
    ).padStart(2, '0')}`;
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
    <View
      ref={videoRef}
      style={styles.feedVideo}
    >
      <VideoView
        player={player}
        style={styles.feedVideoPlayer}
        nativeControls={false}
        contentFit="contain"
      />

      <Pressable
        onPress={handleVideoPress}
        style={styles.videoTouchSurface}
        accessibilityRole="button"
        accessibilityLabel={
          isActive && playing
            ? 'Pause video or double tap to like'
            : 'Play video or double tap to like'
        }
      />

      {!isActive || !playing ? (
        <View
          style={styles.videoPlayOverlay}
          pointerEvents="none"
        >
          <View
            style={styles.videoPlayButton}
          >
            <Ionicons
              name="play"
              size={30}
              color={colors.text}
            />
          </View>
        </View>
      ) : null}

      {!playing && duration > 0 ? (
        <View
          style={styles.videoTimeOverlay}
          pointerEvents="none"
        >
          <Text
            style={styles.videoTimeText}
          >
            {formatTime(currentTime)} /{' '}
            {formatTime(duration)}
          </Text>
        </View>
      ) : null}

      {!playing && duration > 0 ? (
        <View
          style={styles.videoProgressTrack}
        >
          <Pressable
            style={styles.videoProgressTouchArea}
            onLayout={(event) => {
              progressWidthRef.current =
                event.nativeEvent.layout.width;
            }}
            onPress={(event) =>
              seekFromPress(event)
            }
            accessibilityRole="adjustable"
            accessibilityLabel="Video progress"
          >
            <View
              style={styles.videoProgressBackground}
            >
              <View
                style={[
                  styles.videoProgressFill,
                  {
                    width: `${progress * 100}%`,
                  },
                ]}
              />
            </View>
          </Pressable>
        </View>
      ) : null}

      {isActive && playing ? (
        <View
          style={styles.videoPlayingBadge}
          pointerEvents="none"
        >
          <Ionicons
            name="volume-high"
            size={15}
            color={colors.text}
          />

          <Text
            style={styles.videoPlayingText}
          >
            Playing
          </Text>
        </View>
      ) : null}
    </View>
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
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [commentCount, setCommentCount] =
    useState(post.comments);

  const [likeCount, setLikeCount] =
    useState(post.likes);

  const [reaction, setReaction] =
    useState<PostReaction | null>(null);

  const [showReactions, setShowReactions] =
    useState(false);

  const [saved, setSaved] = useState(false);

  const [reshared, setReshared] =
    useState(false);

  const [resharing, setResharing] =
    useState(false);

  const reshareInFlightRef =
    useRef(false);

  const [lastTap, setLastTap] =
    useState<number | null>(null);

  const heartScale = useRef(
    new Animated.Value(0.5),
  ).current;

  const heartOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const heartAnimationRunningRef =
    useRef(false);

  useEffect(() => {
    loadSavedState();
  }, [post.id]);

  async function loadSavedState() {
    const result = await isPostSaved(post.id);
    setSaved(result);
  }

  useEffect(() => {
    loadReshareState();
  }, [post.id]);

  async function loadReshareState() {
    const currentIdentity = await getIdentity();

    if (!currentIdentity) {
      setReshared(false);
      return;
    }

    const result = await isPostReshared(
      post.id,
      currentIdentity.id,
    );

    setReshared(result);
  }

  useEffect(() => {
    loadReactionState();
  }, [post.id]);

  async function loadReactionState() {
    const storedReaction =
      await getPostReaction(post.id);

    setReaction(storedReaction);
  }

  async function selectReaction(
    nextReaction: PostReaction,
  ) {
    try {
      const currentReaction = reaction;

      if (currentReaction === nextReaction) {
        await removePostReaction(post.id);

        setReaction(null);

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

  async function likeFromDoubleTap() {
    try {
      if (reaction === 'like') {
        return;
      }

      await setPostReaction(
        post.id,
        'like',
      );

      setReaction('like');

      if (reaction === null) {
        const nextCount = likeCount + 1;

        setLikeCount(nextCount);

        await updatePost({
          ...post,
          likes: nextCount,
          updatedAt: new Date().toISOString(),
        });
      }

      await onChanged();
    } catch (error) {
      console.error(
        'Double-tap like failed:',
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

  function openFullscreenVideo() {
    if (
      post.type !== 'video' ||
      !post.attachment?.uri
    ) {
      return;
    }

    router.push({
      pathname: '/video/[id]',
      params: { id: post.id },
    });
  }

  function triggerLikeAnimation() {
    if (heartAnimationRunningRef.current) {
      return;
    }

    heartAnimationRunningRef.current = true;

    heartScale.setValue(0.45);
    heartOpacity.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.15,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(heartOpacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(350),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      heartAnimationRunningRef.current = false;
    });
  }

  function handlePostTap() {
    const now = Date.now();

    if (
      lastTap !== null &&
      now - lastTap < 300
    ) {
      setLastTap(null);
      triggerLikeAnimation();
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

  async function resharePost() {
    if (
      reshareInFlightRef.current ||
      resharing ||
      reshared
    ) {
      return;
    }

    reshareInFlightRef.current = true;
    setResharing(true);

    try {
      const currentIdentity = await getIdentity();

      if (!currentIdentity) {
        Alert.alert(
          'Identity required',
          'Set up your Hi-Link identity before resharing a dispatch.',
        );
        return;
      }

      const alreadyReshared = await isPostReshared(
        post.id,
        currentIdentity.id,
      );

      if (alreadyReshared) {
        setReshared(true);
        return;
      }

      const now = new Date().toISOString();

      const resharedPost: Post = {
        ...post,
        id: `reshare-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        authorId: currentIdentity.id,
        authorName: currentIdentity.name,
        authorUsername: currentIdentity.username,
        authorAvatarUri: currentIdentity.avatarUri,
        likes: 0,
        comments: 0,
        shares: 0,
        reshares: 0,
        saves: 0,
        resharedFromId: post.id,
        createdAt: now,
        updatedAt: now,
      };

      await addPost(resharedPost);

      const updatedOriginal: Post = {
        ...post,
        reshares: (post.reshares ?? 0) + 1,
        updatedAt: now,
      };

      await updatePost(updatedOriginal);

      await addReshare({
        id: `reshare-record-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        postId: post.id,
        userId: currentIdentity.id,
        resharedPostId: resharedPost.id,
        createdAt: now,
      });

      setReshared(true);

      await onChanged();
    } catch (error) {
      console.error(
        'Reshare failed:',
        error,
      );

      Alert.alert(
        'Reshare failed',
        'The dispatch could not be reshared. Please try again.',
      );
    } finally {
      reshareInFlightRef.current = false;
      setResharing(false);
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
                color={colors.accent}
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
            color={colors.textSecondary}
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
          <Pressable
            onPress={handlePostTap}
            style={styles.feedMediaTouch}
            accessibilityRole="button"
            accessibilityLabel="Photo. Double tap to like."
          >
            <Image
              source={{ uri: post.attachment.uri }}
              style={styles.feedImage}
              resizeMode="cover"
            />

            <Animated.View
              pointerEvents="none"
              style={[
                styles.doubleTapHeart,
                {
                  opacity: heartOpacity,
                  transform: [
                    {
                      scale: heartScale,
                    },
                  ],
                },
              ]}
            >
              <Ionicons
                name="heart"
                size={92}
                color={colors.text}
              />
            </Animated.View>
          </Pressable>
        ) : null}

        {post.type === 'video' &&
        post.attachment?.uri ? (
          <FeedVideo
            uri={post.attachment.uri}
            postId={post.id}
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
              triggerLikeAnimation();
              void likeFromDoubleTap();
            }}
          />
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.doubleTapHeart,
            {
              opacity: heartOpacity,
              transform: [
                {
                  scale: heartScale,
                },
              ],
            },
          ]}
        >
          <Ionicons
            name="heart"
            size={92}
            color={colors.text}
          />
        </Animated.View>
      </View>

      <View style={styles.feedActions}>
        <Pressable
          onPress={toggleLike}
          style={styles.feedAction}
        >
          <Ionicons
            name={
              reaction === 'like'
                ? 'heart'
                : 'heart-outline'
            }
            size={21}
            color={
              reaction === 'like'
                ? colors.accent
                : colors.textSecondary
            }
          />

          <Text
            style={[
              styles.feedActionText,
              reaction === 'like' && {
                color: colors.accent,
              },
            ]}
          >
            {likeCount}
          </Text>
        </Pressable>

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
                  💕
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
            onPress={() =>
              setShowReactions(
                (visible) => !visible,
              )
            }
            style={styles.feedAction}
          >
            <Text
              style={styles.reactionActionEmoji}
            >
              {reaction
                ? REACTION_EMOJI[reaction]
                : '🙂'}
            </Text>

            <Text
              style={[
                styles.feedActionText,
                reaction && {
                  color: colors.accent,
                },
              ]}
            >
              React
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
            color={colors.textSecondary}
          />

          <Text style={styles.feedActionText}>
            {commentCount}
          </Text>
        </Pressable>

        <Pressable
          onPress={resharePost}
          style={styles.feedAction}
          disabled={resharing || reshared}
          accessibilityRole="button"
          accessibilityLabel={
            reshared
              ? 'Already reshared'
              : 'Reshare dispatch'
          }
        >
          <Ionicons
            name="repeat-outline"
            size={21}
            color={
              reshared
                ? colors.accent
                : colors.textSecondary
            }
          />

          <Text
            style={[
              styles.feedActionText,
              reshared && {
                color: colors.accent,
              },
            ]}
          >
            {reshared
              ? 'Reshared'
              : post.reshares ?? 0}
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
                ? colors.accent
                : colors.textSecondary
            }
          />

          <Text
            style={[
              styles.feedActionText,
              saved && {
                color: colors.accent,
              },
            ]}
          >
            {saved ? 'Saved' : 'Save'}
          </Text>
        </Pressable>

        {post.type === 'video' &&
        post.attachment?.uri ? (
          <Pressable
            onPress={openFullscreenVideo}
            style={styles.feedAction}
            accessibilityRole="button"
            accessibilityLabel="Open fullscreen video"
          >
            <Ionicons
              name="expand-outline"
              size={21}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  feedTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.cardRaised,
  },

  feedTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },

  feedTabActive: {
    backgroundColor: colors.card,
  },

  feedTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },

  feedTabTextActive: {
    color: colors.blue,
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
    color: colors.text,
    marginBottom: 6,
  },

  emptyFeedText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: colors.muted,
  },

  fixedHomeHeader: {
    backgroundColor: colors.background,
    zIndex: 20,
  },

  homeNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.cardRaised,
    borderBottomColor: colors.accent,
  },

  homeNavigationLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  homeNavigationText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  homeNavigationTextActive: {
    color: colors.text,
    fontWeight: '800',
  },

  homeNavigationBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },

  homeNavigationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.background,
  },

  feedSection: {
    marginBottom: 8,
  },

  feedPost: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedAuthorInfo: {
    flex: 1,
    marginLeft: 11,
  },

  feedAuthorName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  feedAuthorMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
  },

  feedText: {
    color: colors.textSecondary,
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
    backgroundColor: '#000000',
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
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },

  videoTouchSurface: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 2,
  },

  videoTimeOverlay: {
    position: 'absolute',
    left: 12,
    bottom: 34,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },

  videoTimeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  videoProgressTrack: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    height: 22,
    justifyContent: 'center',
    zIndex: 3,
  },

  videoProgressTouchArea: {
    width: '100%',
    height: 22,
    justifyContent: 'center',
  },

  videoProgressBackground: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },

  videoProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.text,
  },

  feedImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.cardRaised,
  },

  feedMediaTouch: {
    position: 'relative',
    width: '100%',
  },

  doubleTapHeart: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },

  feedActions: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
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

  reactionActionEmoji: {
    fontSize: 21,
    lineHeight: 21,
  },

  feedAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },

  feedActionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  recentlyWatchedSection: {
    marginBottom: 14,
    paddingTop: 4,
  },

  recentlyWatchedHeader: {
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  recentlyWatchedTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  recentlyWatchedSubtitle: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 12,
  },

  recentlyWatchedList: {
    paddingHorizontal: 14,
    gap: 10,
  },

  recentlyWatchedCard: {
    width: 132,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: 9,
  },

  recentlyWatchedPreview: {
    width: '100%',
    aspectRatio: 9 / 13,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  recentlyWatchedPlayCircle: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingLeft: 2,
  },

  recentlyWatchedAuthor: {
    marginTop: 8,
    paddingHorizontal: 9,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },

  recentlyWatchedCaption: {
    marginTop: 3,
    paddingHorizontal: 9,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },

  feedBottomSpace: {
    height: 100,
  },

  refreshOverlay: {
    display: 'none',
  },


  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 2.2,
  },

  logoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
    marginLeft: 7,
    marginTop: 11,
  },

  subtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },

  notification: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },

  greeting: {
    marginTop: 30,
    marginBottom: 18,
  },

  greetingTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  greetingSubtitle: {
    color: colors.muted,
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
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  storyCircleActive: {
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },

  storyCircleBlue: {
    borderColor: colors.blue,
    backgroundColor: colors.blueSoft,
  },

  storyInitial: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },

  storyLabelActive: {
    color: colors.text,
    fontWeight: '800',
  },

  storyActiveDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.card,
  },

  storyLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 7,
  },

  card: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 21,
    borderWidth: 1,
    borderColor: colors.border,
  },

  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: colors.accent,
  },

  cardEyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    marginTop: 10,
  },

  cardBody: {
    color: colors.textSecondary,
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
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  cardPillBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  cardPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 6,
  },

  blueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
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
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  seeAll: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },

  placeholder: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  placeholderIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderIcon: {
    color: colors.accent,
    fontSize: 26,
  },

  placeholderTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
  },

  placeholderBody: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  });
}
