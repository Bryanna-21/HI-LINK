import {
  Conversation,
  Message,
} from '../models/chat';
import { getLocal, setLocal } from './localStore';
import { getIdentity } from './identity';

const CONVERSATIONS_KEY = 'chat_conversations';
const MESSAGES_KEY = 'chat_messages';

async function getStoredConversations(): Promise<Conversation[]> {
  return getLocal<Conversation[]>(
    CONVERSATIONS_KEY,
    [],
  );
}

export async function getConversations(): Promise<Conversation[]> {
  const conversations = await getStoredConversations();
  const identity = await getIdentity();

  if (!identity) {
    return [];
  }

  let changed = false;

  const visibleConversations = conversations.filter(
    (conversation) => {
      if (conversation.ownerId) {
        return conversation.ownerId === identity.id;
      }

      const belongsToIdentity =
        conversation.participants.some(
          (participant) =>
            participant.id === identity.id,
        );

      if (belongsToIdentity) {
        conversation.ownerId = identity.id;
        changed = true;
        return true;
      }

      return false;
    },
  );

  for (const conversation of visibleConversations) {
    conversation.participants =
      conversation.participants.map(
        (participant) =>
          participant.id === identity.id
            ? {
                ...participant,
                name: identity.name,
                username: identity.username,
                avatarUri: identity.avatarUri,
              }
            : participant,
      );
  }

  if (changed) {
    await setLocal(
      CONVERSATIONS_KEY,
      conversations,
    );
  }

  return visibleConversations.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime(),
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
