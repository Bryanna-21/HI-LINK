import { PostComment } from '../models/comment';
import { getLocal, setLocal } from './localStore';
import { getProfileMap, withLiveAuthor } from './liveProfiles';

const COMMENTS_KEY = 'comments';

export async function getComments(): Promise<PostComment[]> {
  const [comments, profiles] = await Promise.all([
    getLocal<PostComment[]>(COMMENTS_KEY, []),
    getProfileMap(),
  ]);

  return comments.map((comment) => withLiveAuthor(comment, profiles));
}

export async function saveComments(
  comments: PostComment[],
) {
  await setLocal(COMMENTS_KEY, comments);
}

export async function getCommentsByPost(
  postId: string,
): Promise<PostComment[]> {
  const comments = await getComments();

  return comments
    .filter((comment) => comment.postId === postId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime(),
    );
}

export async function addComment(
  comment: PostComment,
) {
  const comments = await getComments();

  await saveComments([
    ...comments,
    comment,
  ]);
}

export async function deleteComment(
  commentId: string,
) {
  const comments = await getComments();

  await saveComments(
    comments.filter(
      (comment) => comment.id !== commentId,
    ),
  );
}

export async function deleteCommentsForPost(
  postId: string,
) {
  const comments = await getComments();

  await saveComments(
    comments.filter(
      (comment) => comment.postId !== postId,
    ),
  );
}
