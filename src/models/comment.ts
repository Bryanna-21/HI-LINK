export interface PostComment {
  id: string;
  postId: string;

  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatarUri?: string;

  text: string;

  createdAt: string;
  updatedAt: string;
}
