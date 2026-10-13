import type { AppNotification, Conversation, Message, Property } from './data';

export type CommunicationState = {
  conversations: Conversation[];
  notifications: AppNotification[];
  messageSequence: number;
};

export type CommunicationAction =
  | { type: 'send'; conversationId: string; text: string; time: string }
  | { type: 'read-conversation'; conversationId: string }
  | { type: 'read-notification'; notificationId: string }
  | { type: 'read-all-notifications' }
  | { type: 'reset'; conversations: readonly Conversation[]; notifications: readonly AppNotification[] };

export function createCommunicationState(
  conversations: readonly Conversation[],
  notifications: readonly AppNotification[],
): CommunicationState {
  return {
    conversations: conversations.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) => ({ ...message })),
    })),
    notifications: notifications.map((notification) => ({ ...notification })),
    messageSequence: 0,
  };
}

export function sendLocalMessage(state: CommunicationState, conversationId: string, value: string, time: string) {
  const text = value.trim();
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!text || !conversation) return state;
  const messageSequence = state.messageSequence + 1;
  const message: Message = {
    id: `local-${conversationId}-${messageSequence}`,
    sender: 'student',
    text,
    time,
  };
  const updated = { ...conversation, messages: [...conversation.messages, message], lastMessage: text, time, unread: 0 };
  return {
    ...state,
    messageSequence,
    conversations: [updated, ...state.conversations.filter((item) => item.id !== conversationId)],
  };
}

export function markConversationRead(state: CommunicationState, conversationId: string) {
  if (!state.conversations.some((item) => item.id === conversationId && item.unread > 0)) return state;
  return {
    ...state,
    conversations: state.conversations.map((item) => item.id === conversationId ? { ...item, unread: 0 } : item),
  };
}

export function markNotificationRead(state: CommunicationState, notificationId: string) {
  if (!state.notifications.some((item) => item.id === notificationId && !item.read)) return state;
  return {
    ...state,
    notifications: state.notifications.map((item) => item.id === notificationId ? { ...item, read: true } : item),
  };
}

export function markAllNotificationsRead(state: CommunicationState) {
  if (!state.notifications.some((item) => !item.read)) return state;
  return { ...state, notifications: state.notifications.map((item) => ({ ...item, read: true })) };
}

export function communicationReducer(state: CommunicationState, action: CommunicationAction): CommunicationState {
  switch (action.type) {
    case 'send': return sendLocalMessage(state, action.conversationId, action.text, action.time);
    case 'read-conversation': return markConversationRead(state, action.conversationId);
    case 'read-notification': return markNotificationRead(state, action.notificationId);
    case 'read-all-notifications': return markAllNotificationsRead(state);
    case 'reset': return createCommunicationState(action.conversations, action.notifications);
  }
}

export function getUnreadMessageCount(state: CommunicationState) {
  return state.conversations.reduce((count, conversation) => count + conversation.unread, 0);
}

export function getUnreadNotificationCount(state: CommunicationState) {
  return state.notifications.filter((notification) => !notification.read).length;
}

export function getConversationProperty(conversation: Conversation, properties: readonly Property[]) {
  if (!conversation.propertyId) return undefined;
  return properties.find((property) => property.id === conversation.propertyId);
}

export function getConversationForProperty(conversations: readonly Conversation[], propertyId: string) {
  return conversations.find((conversation) => conversation.propertyId === propertyId);
}

export function getNotificationConversationId(notificationId: string) {
  return notificationId === 'n3' ? 'c1' : undefined;
}
