import { getScopedLocal, setScopedLocal } from './accountScope';

export interface VideoHistoryRecord {
  postId: string;
  watchedAt: string;
}

const VIDEO_HISTORY_KEY = 'video_history';
const MAX_VIDEO_HISTORY = 30;

export async function getVideoHistory(): Promise<
  VideoHistoryRecord[]
> {
  return getScopedLocal<VideoHistoryRecord[]>(
    VIDEO_HISTORY_KEY,
    [],
  );
}

export async function recordVideoWatch(
  postId: string,
): Promise<void> {
  if (!postId) {
    return;
  }

  const history = await getVideoHistory();

  const next: VideoHistoryRecord[] = [
    {
      postId,
      watchedAt: new Date().toISOString(),
    },
    ...history.filter(
      (item) => item.postId !== postId,
    ),
  ].slice(0, MAX_VIDEO_HISTORY);

  await setScopedLocal(
    VIDEO_HISTORY_KEY,
    next,
  );
}

export async function getRecentlyWatchedVideoIds(
  limit = 10,
): Promise<string[]> {
  const history = await getVideoHistory();

  return history
    .slice(0, limit)
    .map((item) => item.postId);
}

export async function clearVideoHistory(): Promise<void> {
  await setScopedLocal(VIDEO_HISTORY_KEY, []);
}
