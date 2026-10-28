import {
  Conversation,
  Message,
} from '../models/chat';
import { getLocal, setLocal } from './localStore';
import { getIdentity } from './identity';
import { getProfileMap } from './liveProfiles';
import { withLock } from './collection';
import { isBlockedBy } from './blockedUsers';
import { notify } from './notifications';

/**
 * Local chat store.
 *
 * Every account has its OWN copy of a conversation (ownerId) so unread
 * counts, pinning and muting are per person. Copies of one conversation share
 * a threadId. When a message is sent to a person who has a profile on this
 * device, a copy is placed in their inbox and the sender's message is marked
 * delivered. People who are not on this device cannot be reached: there is no
 * network transport, so those messages stay "queued".
 */

const CONVERSATIONS_KEY = 'chat_conversations';
const MESSAGES_KEY = 'chat_messages';

interface ChatState {
  conversations: Conversation[];
  messages: Message[];
}

async function readState(): Promise<ChatState> {
  const [conversations, messages] = await Promise.all([
    getLocal<Conversation[]>(CONVERSATIONS_KEY, []),
    getLocal<Message[]>(MESSAGES_KEY, []),
  ]);

  return { conversations, messages };
}

/**
 * Every write goes through here: one lock, read the WHOLE store, change it,
 * write the whole store. Callers never save a filtered view, so one account's
 * action can never erase another account's chats.
 */
function mutate<T>(change: (state: ChatState) => T | Promise<T>): Promise<T> {
  return withLock('chat-store', async () => {
    const state = await readState();
    const result = await change(state);

    await Promise.all([
      setLocal(CONVERSATIONS_KEY, state.conversations),
      setLocal(MESSAGES_KEY, state.messages),
    ]);

    return result;
  });
}

const threadOf = (conversation: Conversation) =>
  conversation.threadId ?? conversation.id;

export async function getConversations(): Promise<Conversation[]> {
  const identity = await getIdentity();

  if (!identity) {
    return [];
  }

  let { conversations } = await readState();

  // Older builds left conversations without an owner; the first participant
  // to open the app claims them (once).
  if (
    conversations.some(
      (conversation) =>
        !conversation.ownerId &&
        conversation.participants.some((participant) => participant.id === identity.id),
    )
  ) {
    conversations = await mutate((state) => {
      for (const conversation of state.conversations) {
        if (
          !conversation.ownerId &&
          conversation.participants.some((participant) => participant.id === identity.id)
        ) {
          conversation.ownerId = identity.id;
          conversation.threadId = conversation.threadId ?? conversation.id;
        }
      }

      return state.conversations;
    });
  }

  const mine = conversations.filter(
    (conversation) =>
      conversation.ownerId
        ? conversation.ownerId === identity.id
        : false,
  );

  // Resolve every participant's CURRENT profile by stable id. The stored
  // participant snapshot is only a fallback for people unknown on this device.
  const profiles = await getProfileMap();

  return mine
    .map((conversation) => ({
      ...conversation,
      participants: conversation.participants.map((participant) => {
        const profile = profiles.get(participant.id);

        return profile
          ? {
              ...participant,
              name: profile.name,
              username: profile.username,
              avatarUri: profile.avatarUri,
            }
          : participant;
      }),
    }))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime(),
    );
}

export async function getConversation(
  conversationId: string,
): Promise<Conversation | null> {
  const conversations = await getConversations();

  return (
    conversations.find(
      (conversation) => conversation.id === conversationId,
    ) ?? null
  );
}

export async function getConversationMessages(
  conversationId: string,
): Promise<Message[]> {
  // Account isolation: messages are only readable through a conversation the
  // signed-in account owns. Never rely on the UI to hide another account's chat.
  const conversation = await getConversation(conversationId);

  if (!conversation) {
    return [];
  }

  const [{ messages }, profiles] = await Promise.all([
    readState(),
    getProfileMap(),
  ]);

  return messages
    .filter((message) => message.conversationId === conversationId)
    .map((message) => {
      const profile = profiles.get(message.senderId);

      return profile
        ? {
            ...message,
            senderName: profile.name,
            senderUsername: profile.username,
          }
        : message;
    })
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime(),
    );
}

export async function addConversation(conversation: Conversation) {
  const identity = await getIdentity();

  await mutate((state) => {
    state.conversations = [
      {
        ...conversation,
        ownerId: conversation.ownerId ?? identity?.id,
        threadId: conversation.threadId ?? conversation.id,
      },
      ...state.conversations,
    ];
  });
}

export async function updateConversation(updated: Conversation) {
  await mutate((state) => {
    state.conversations = state.conversations.map((conversation) =>
      conversation.id === updated.id
        ? { ...updated, ownerId: conversation.ownerId, threadId: conversation.threadId }
        : conversation,
    );
  });
}

const previewOf = (message: Message): string =>
  message.text?.trim() ||
  (message.type === 'image'
    ? 'Sent a photo'
    : message.type === 'video'
      ? 'Sent a video'
      : message.type === 'audio'
        ? 'Sent a voice note'
        : 'Sent a file');

/**
 * Stores a message in the sender's conversation, then delivers a copy to
 * every other participant that has a profile on this device. Returns the
 * stored message, with deliveredAt set only if everyone else received it.
 */
export async function addMessage(message: Message): Promise<Message> {
  const profiles = await getProfileMap();

  const blocked = new Set<string>();

  for (const profile of profiles.values()) {
    if (profile.id !== message.senderId && (await isBlockedBy(profile.id, message.senderId))) {
      blocked.add(profile.id);
    }
  }

  const notices: Parameters<typeof notify>[0][] = [];

  const stored = await mutate((state) => {
    const own = state.conversations.find(
      (conversation) => conversation.id === message.conversationId,
    );

    if (!own) {
      throw new Error('This conversation no longer exists.');
    }

    const thread = threadOf(own);
    const others = own.participants.filter(
      (participant) => participant.id !== message.senderId,
    );
    let reached = 0;

    for (const participant of others) {
      if (
        own.type === 'community' ||
        !profiles.has(participant.id) ||
        blocked.has(participant.id)
      ) {
        continue;
      }

      let theirs = state.conversations.find(
        (conversation) =>
          threadOf(conversation) === thread &&
          conversation.ownerId === participant.id,
      );

      if (!theirs) {
        theirs = {
          ...own,
          id: `${thread}:${participant.id}`,
          threadId: thread,
          ownerId: participant.id,
          lastMessage: undefined,
          unreadCount: 0,
          pinned: false,
          muted: false,
        };
        state.conversations.unshift(theirs);
      }

      const copy: Message = {
        ...message,
        id: `${message.id}@${participant.id}`,
        originId: message.id,
        conversationId: theirs.id,
        deliveredAt: message.createdAt,
      };

      state.messages.push(copy);
      theirs.lastMessage = copy;
      theirs.updatedAt = message.createdAt;
      theirs.unreadCount += 1;
      reached += 1;

      if (!theirs.muted) {
        notices.push({
          recipientId: participant.id,
          type: 'message',
          title: message.senderName,
          body: previewOf(message),
          actorId: message.senderId,
          entityType: 'conversation',
          entityId: theirs.id,
          route: { pathname: '/chat/[id]', params: { id: theirs.id } },
          dedupeKey: `message:${theirs.id}`,
        });
      }
    }

    const delivered: Message = {
      ...message,
      deliveredAt:
        others.length > 0 && reached === others.length
          ? message.createdAt
          : undefined,
    };

    state.messages.push(delivered);
    own.lastMessage = delivered;
    own.updatedAt = message.createdAt;

    return delivered;
  });

  for (const notice of notices) {
    await notify(notice);
  }

  return stored;
}

/** Edits or deletes (soft) a message, keeping every recipient's copy in step. */
export async function updateMessage(updated: Message) {
  await mutate((state) => {
    const origin = updated.originId ?? updated.id;

    state.messages = state.messages.map((message) => {
      if (message.id !== origin && message.originId !== origin) {
        return message;
      }

      return {
        ...message,
        text: updated.text,
        editedAt: updated.editedAt,
        updatedAt: updated.updatedAt,
        deletedAt: updated.deletedAt,
      };
    });

    for (const conversation of state.conversations) {
      const last = conversation.lastMessage;

      if (last && (last.id === origin || last.originId === origin)) {
        conversation.lastMessage = state.messages.find((message) => message.id === last.id);
      }
    }
  });
}

export async function markMessageRead(messageId: string) {
  const identity = await getIdentity();

  await markReadWhere(identity?.id, (message) => message.id === messageId);
}

export async function markConversationRead(
  conversationId: string,
  currentUserId?: string,
) {
  const reader = currentUserId ?? (await getIdentity())?.id;

  await markReadWhere(
    reader,
    (message) => message.conversationId === conversationId,
    conversationId,
  );
}

/**
 * Marks other people's messages as read by `readerId` and tells the sender's
 * copy. A person's own messages are never marked read by opening the chat.
 */
async function markReadWhere(
  readerId: string | undefined,
  matches: (message: Message) => boolean,
  conversationId?: string,
) {
  if (!readerId) {
    return;
  }

  const now = new Date().toISOString();

  await mutate((state) => {
    const originsRead = new Set<string>();

    state.messages = state.messages.map((message) => {
      const mine = state.conversations.find(
        (conversation) =>
          conversation.id === message.conversationId &&
          conversation.ownerId === readerId,
      );

      if (!mine || !matches(message) || message.senderId === readerId || message.readAt) {
        return message;
      }

      if (message.originId && mine.type === 'direct') {
        originsRead.add(message.originId);
      }

      return { ...message, deliveredAt: message.deliveredAt ?? now, readAt: now };
    });

    if (originsRead.size > 0) {
      state.messages = state.messages.map((message) =>
        originsRead.has(message.id) && !message.readAt
          ? { ...message, deliveredAt: message.deliveredAt ?? now, readAt: now }
          : message,
      );
    }

    if (conversationId) {
      const conversation = state.conversations.find(
        (item) => item.id === conversationId && item.ownerId === readerId,
      );

      if (conversation) {
        conversation.unreadCount = 0;
      }
    }
  });
}
