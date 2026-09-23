import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  VideoView,
  useVideoPlayer,
} from 'expo-video';

import {
  ThemeColors,
  useTheme,
} from '../theme/ThemeProvider';
import { recordVideoWatch } from '../storage/videoHistory';

interface HiLinkVideoPlayerProps {
  uri: string;
  postId: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  fullscreen?: boolean;
  onFullscreen?: () => void;
}

function getAspectRatio(
  width?: number,
  height?: number,
) {
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

export default function HiLinkVideoPlayer({
  uri,
  postId,
  width,
  height,
  autoPlay = false,
  fullscreen = false,
  onFullscreen,
}: HiLinkVideoPlayerProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const lastTapRef =
    useRef<number | null>(null);

  const progressWidthRef =
    useRef(0);

  const player = useVideoPlayer(
    uri,
    (videoPlayer) => {
      videoPlayer.loop = false;

      if (autoPlay) {
        videoPlayer.play();
      }
    },
  );

  const [playing, setPlaying] =
    useState(autoPlay);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  useEffect(() => {
    if (autoPlay) {
      void recordVideoWatch(postId);
    }
  }, [autoPlay, postId]);

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

    const playingSubscription =
      player.addListener(
        'playingChange',
        (event) => {
          setPlaying(event.isPlaying);

          if (event.isPlaying) {
            void recordVideoWatch(postId);
          }
        },
      );

    return () => {
      timeSubscription.remove();
      statusSubscription.remove();
      playingSubscription.remove();
    };
  }, [player, postId]);

  function togglePlayback() {
    if (playing) {
      player.pause();
      return;
    }

    player.play();
    void recordVideoWatch(postId);
  }

  function handleVideoPress() {
    const now = Date.now();
    const previousTap =
      lastTapRef.current;

    if (
      previousTap !== null &&
      now - previousTap < 280
    ) {
      lastTapRef.current = null;
      return;
    }

    lastTapRef.current = now;
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

    if (!width || width <= 0) {
      return;
    }

    const locationX =
      event.nativeEvent.locationX;

    const ratio = Math.max(
      0,
      Math.min(
        1,
        locationX / width,
      ),
    );

    const nextTime =
      duration * ratio;

    player.currentTime =
      nextTime;

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

  const aspectRatio =
    fullscreen
      ? undefined
      : getAspectRatio(
          width,
          height,
        );

  return (
    <View
      style={[
        styles.container,
        fullscreen
          ? styles.fullscreenContainer
          : {
              aspectRatio,
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
        onPress={handleVideoPress}
        style={styles.touchSurface}
        accessibilityRole="button"
        accessibilityLabel={
          playing
            ? 'Pause video'
            : 'Play video'
        }
      />

      {!playing ? (
        <View
          style={styles.playOverlay}
          pointerEvents="none"
        >
          <View
            style={styles.playButton}
          >
            <Ionicons
              name="play"
              size={30}
              color={colors.text}
            />
          </View>
        </View>
      ) : null}

      {!playing &&
      duration > 0 ? (
        <View
          style={styles.timeOverlay}
          pointerEvents="none"
        >
          <Text style={styles.timeText}>
            {formatTime(currentTime)}
            {' / '}
            {formatTime(duration)}
          </Text>
        </View>
      ) : null}

      {!playing &&
      duration > 0 ? (
        <View
          style={styles.progressContainer}
        >
          <Pressable
            style={styles.progressTouchArea}
            onLayout={(event) => {
              progressWidthRef.current =
                event.nativeEvent.layout.width;
            }}
            onPress={seekFromPress}
            accessibilityRole="adjustable"
            accessibilityLabel="Video progress"
          >
            <View
              style={
                styles.progressBackground
              }
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
          </Pressable>
        </View>
      ) : null}

      {playing ? (
        <View
          style={styles.playingBadge}
          pointerEvents="none"
        >
          <Ionicons
            name="volume-high"
            size={14}
            color={colors.text}
          />

          <Text
            style={styles.playingText}
          >
            Playing
          </Text>
        </View>
      ) : null}

      {onFullscreen ? (
        <Pressable
          onPress={onFullscreen}
          style={styles.fullscreenButton}
          accessibilityRole="button"
          accessibilityLabel="Open fullscreen video"
        >
          <Ionicons
            name="expand-outline"
            size={21}
            color={colors.text}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
  },

  fullscreenContainer: {
    flex: 1,
  },

  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },

  touchSurface: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },

  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },

  playButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },

  timeOverlay: {
    position: 'absolute',
    left: 12,
    bottom: 34,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.cardRaised,
    zIndex: 4,
  },

  timeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },

  progressContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    height: 22,
    justifyContent: 'center',
    zIndex: 5,
  },

  progressTouchArea: {
    width: '100%',
    height: 22,
    justifyContent: 'center',
  },

  progressBackground: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.text,
  },

  playingBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.cardRaised,
    zIndex: 4,
  },

  playingText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },

  fullscreenButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    zIndex: 6,
  },
});
