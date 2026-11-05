import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { VideoPlayer } from 'expo-video';

/**
 * True while the screen is focused AND the app is in the foreground.
 * Focus accounts for parent navigators, so pushing a stack screen over the
 * tabs (or switching tabs) makes it false.
 */
export function useScreenActive(): boolean {
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useFocusEffect(
    useCallback(() => {
      setFocused(true);

      return () => setFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setForeground(state === 'active'),
    );

    return () => subscription.remove();
  }, []);

  return focused && foreground;
}

/**
 * Pauses a video when the user leaves the screen or backgrounds the app, and
 * resumes it on return only if it was playing when they left.
 */
export function usePauseWhenAway(player: VideoPlayer): void {
  const active = useScreenActive();
  const resumeRef = useRef(false);

  useEffect(() => {
    if (!active) {
      resumeRef.current = player.playing;
      player.pause();

      return;
    }

    if (resumeRef.current) {
      resumeRef.current = false;
      player.play();
    }
  }, [active, player]);
}
