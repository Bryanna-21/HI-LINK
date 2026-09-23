export type ConversationType =
  | 'direct'
  | 'group'
  | 'community';

export type ConversationCategory =
  | 'normal'
  | 'event'
  | 'announcement'
  | 'spam';

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'document'
  | 'audio'
  | 'system';

export interface ChatParticipant {
  id: string;
  name: string;
  username: string;
  avatarUri?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  type: MessageType;
  text?: string;
  attachmentUri?: string;
  attachmentName?: string;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
  deliveredAt?: string;
  readAt?: string;
  replyToMessageId?: string;
  deletedAt?: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  category: ConversationCategory;
  title?: string;
  avatarUri?: string;
  participants: ChatParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  pinned: boolean;
  muted: boolean;
  createdAt: string;
  updatedAt: string;
}
