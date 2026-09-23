import {
  Conversation,
  Message,
} from '../models/chat';
import { getLocal, setLocal } from './localStore';

const CONVERSATIONS_KEY = 'chat_conversations';
const MESSAGES_KEY = 'chat_messages';

export async function getConversations(): Promise<Conversation[]> {
  return getLocal<Conversation[]>(
    CONVERSATIONS_KEY,
    [],
  );
}

export async function saveConversations(
  conversations: Conversation[],
) {
  await setLocal(
    CONVERSATIONS_KEY,
    conversations,
  );
}

export async function getMessages(): Promise<Message[]> {
  return getLocal<Message[]>(
    MESSAGES_KEY,
    [],
  );
}

export async function saveMessages(
  messages: Message[],
) {
  await setLocal(
    MESSAGES_KEY,
    messages,
  );
}

export async function getConversation(
  conversationId: string,
): Promise<Conversation | null> {
  const conversations =
    await getConversations();

  return (
    conversations.find(
      (conversation) =>
        conversation.id === conversationId,
    ) ?? null
  );
}

export async function getConversationMessages(
  conversationId: string,
): Promise<Message[]> {
  const messages = await getMessages();

  return messages
    .filter(
      (message) =>
        message.conversationId ===
        conversationId,
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime(),
    );
}

export async function addConversation(
  conversation: Conversation,
) {
  const conversations =
    await getConversations();

  await saveConversations([
    conversation,
    ...conversations,
  ]);
}

export async function updateConversation(
  updated: Conversation,
) {
  const conversations =
    await getConversations();

  await saveConversations(
    conversations.map((conversation) =>
      conversation.id === updated.id
        ? updated
        : conversation,
    ),
  );
}

export async function addMessage(
  message: Message,
) {
  const messages = await getMessages();

  await saveMessages([
    ...messages,
    message,
  ]);

  const conversation =
    await getConversation(
      message.conversationId,
    );

  if (conversation) {
    await updateConversation({
      ...conversation,
      lastMessage: message,
      updatedAt: message.createdAt,
    });
  }
}

export async function updateMessage(
  updated: Message,
) {
  const messages = await getMessages();

  await saveMessages(
    messages.map((message) =>
      message.id === updated.id
        ? updated
        : message,
    ),
  );

  const conversation =
    await getConversation(
      updated.conversationId,
    );

  if (
    conversation?.lastMessage?.id ===
    updated.id
  ) {
    await updateConversation({
      ...conversation,
      lastMessage: updated,
      updatedAt:
        updated.updatedAt ??
        updated.createdAt,
    });
  }
}

export async function markMessageRead(
  messageId: string,
) {
  const messages = await getMessages();
  const now = new Date().toISOString();

  await saveMessages(
    messages.map((message) =>
      message.id === messageId
        ? {
            ...message,
            deliveredAt:
              message.deliveredAt ?? now,
            readAt: now,
          }
        : message,
    ),
  );
}

export async function markConversationRead(
  conversationId: string,
  currentUserId?: string,
) {
  const conversations =
    await getConversations();

  await saveConversations(
    conversations.map((conversation) =>
      conversation.id === conversationId
        ? {
            ...conversation,
            unreadCount: 0,
          }
        : conversation,
    ),
  );

  const messages = await getMessages();
  const now = new Date().toISOString();

  await saveMessages(
    messages.map((message) => {
      if (
        message.conversationId !==
          conversationId ||
        message.senderId === currentUserId
      ) {
        return message;
      }

      return {
        ...message,
        deliveredAt:
          message.deliveredAt ?? now,
        readAt: now,
      };
    }),
  );
}
