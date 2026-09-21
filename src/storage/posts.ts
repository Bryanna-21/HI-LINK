import { Post } from '../models/post';
import { getLocal, setLocal } from './localStore';

const POSTS_KEY = 'posts';

export async function getPosts(): Promise<Post[]> {
  return getLocal<Post[]>(POSTS_KEY, []);
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
