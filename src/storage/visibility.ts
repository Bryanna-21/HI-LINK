import type { HiLinkUser } from '../models/user';
import type { Post } from '../models/post';
import { getIdentity } from './identity';
import { getPosts } from './posts';
import { getBlockedUserIds } from './blockedUsers';
import { getMyMemberships } from './communities';

/**
 * Single implementation of the existing visibility model
 * (everyone / my_school / my_class / my_group). No second system.
 */

export interface ViewerContext {
  viewer: HiLinkUser | null;
  communityIds: ReadonlySet<string>;
  blockedIds: ReadonlySet<string>;
}

export async function getViewerContext(): Promise<ViewerContext> {
  const [viewer, memberships, blocked] = await Promise.all([
    getIdentity(),
    getMyMemberships(),
    getBlockedUserIds(),
  ]);

  return {
    viewer,
    communityIds: new Set(memberships.map((item) => item.communityId)),
    blockedIds: new Set(blocked),
  };
}

export function canViewPost(post: Post, context: ViewerContext): boolean {
  const { viewer } = context;

  if (!viewer) {
    return false;
  }

  if (post.authorId === viewer.id) {
    return true;
  }

  if (context.blockedIds.has(post.authorId)) {
    return false;
  }

  switch (post.visibility) {
    case 'everyone':
      return true;

    case 'my_school':
      return Boolean(viewer.schoolId) && viewer.schoolId === post.schoolId;

    case 'my_class':
      return (
        Boolean(viewer.schoolId) &&
        viewer.schoolId === post.schoolId &&
        Boolean(viewer.form) &&
        viewer.form === post.form &&
        (!post.stream || viewer.stream === post.stream)
      );

    case 'my_group':
      return Boolean(post.communityId) && context.communityIds.has(post.communityId as string);

    default:
      return false;
  }
}

/** Posts the signed-in account is allowed to see. */
export async function getVisiblePosts(): Promise<Post[]> {
  const [posts, context] = await Promise.all([getPosts(), getViewerContext()]);

  return posts.filter((post) => canViewPost(post, context));
}

export async function canViewPostById(postId: string): Promise<boolean> {
  const [posts, context] = await Promise.all([getPosts(), getViewerContext()]);
  const post = posts.find((item) => item.id === postId);

  return post ? canViewPost(post, context) : false;
}
