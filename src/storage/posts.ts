import { Post } from '../models/post';
import { getLocal, setLocal } from './localStore';
import { getProfileMap, withLiveAuthor } from './liveProfiles';

const POSTS_KEY = 'posts';

/**
 * Returns every post with the author's CURRENT name/username/avatar resolved
 * by `authorId`. Ownership (`authorId`) is never rewritten; only the display
 * snapshot is refreshed, so profile edits show on historical posts.
 */
export async function getPosts(): Promise<Post[]> {
  const [posts, profiles] = await Promise.all([
    getLocal<Post[]>(POSTS_KEY, []),
    getProfileMap(),
  ]);

  return posts.map((post) => withLiveAuthor(post, profiles));
}

export async function getPost(postId: string): Promise<Post | null> {
  const posts = await getPosts();

  return posts.find((post) => post.id === postId) ?? null;
}

/**
 * Atomically merge a partial update into one post. Used by systems that own a
 * single field (reaction totals, comment counts) so they cannot overwrite
 * unrelated fields with a stale copy of the whole post.
 */
export async function patchPost(
  postId: string,
  patch: (post: Post) => Partial<Post>,
): Promise<Post | null> {
  const posts = await getLocal<Post[]>(POSTS_KEY, []);
  let updated: Post | null = null;

  const next = posts.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    updated = {
      ...post,
      ...patch(post),
      updatedAt: new Date().toISOString(),
    };

    return updated;
  });

  if (updated) {
    await setLocal(POSTS_KEY, next);
  }

  return updated;
}

export async function savePosts(posts: Post[]) {
  await setLocal(POSTS_KEY, posts);
}

export async function addPost(post: Post) {
  const posts = await getPosts();

  await savePosts([
    post,
    ...posts,
  ]);
}

export async function updatePost(updatedPost: Post) {
  const posts = await getPosts();

  await savePosts(
    posts.map((post) =>
      post.id === updatedPost.id
        ? updatedPost
        : post,
    ),
  );
}

export async function deletePost(postId: string) {
  const posts = await getPosts();

  await savePosts(
    posts.filter((post) => post.id !== postId),
  );
}

export async function getPostsByAuthor(
  authorId: string,
): Promise<Post[]> {
  const posts = await getPosts();

  return posts.filter(
    (post) => post.authorId === authorId,
  );
}


export async function migratePostAuthor(
  fromAuthorId: string,
  toAuthorId: string,
  toUser: {
    name: string;
    username: string;
    avatarUri?: string;
  },
) {
  const posts = await getPosts();

  const migratedPosts = posts.map((post) => {
    if (post.authorId !== fromAuthorId) {
      return post;
    }

    return {
      ...post,
      authorId: toAuthorId,
      authorName: toUser.name,
      authorUsername: toUser.username,
      authorAvatarUri: toUser.avatarUri,
      updatedAt: new Date().toISOString(),
    };
  });

  await savePosts(migratedPosts);
}
