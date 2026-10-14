import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  communicationReducer,
  createCommunicationState,
  getUnreadMessageCount,
  getUnreadNotificationCount,
  MAX_MESSAGE_LENGTH,
} from '../communication';
import { conversations as initialConversations, notifications as initialNotifications } from '../data';

type CommunicationValue = ReturnType<typeof createCommunicationState> & {
  unreadMessageCount: number;
  unreadNotificationCount: number;
  sendMessage: (conversationId: string, text: string) => boolean;
  markConversationRead: (conversationId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  resetCommunication: () => void;
};

const CommunicationContext = createContext<CommunicationValue | undefined>(undefined);

export function CommunicationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(
    communicationReducer,
    createCommunicationState(initialConversations, initialNotifications),
  );
  const sendMessage = useCallback((conversationId: string, text: string) => {
    if (!text.trim() || text.trim().length > MAX_MESSAGE_LENGTH || !state.conversations.some((item) => item.id === conversationId)) return false;
    const time = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    dispatch({ type: 'send', conversationId, text, time });
    return true;
  }, [state.conversations]);
  const markConversationRead = useCallback((conversationId: string) => dispatch({ type: 'read-conversation', conversationId }), []);
  const markNotificationRead = useCallback((notificationId: string) => dispatch({ type: 'read-notification', notificationId }), []);
  const markAllNotificationsRead = useCallback(() => dispatch({ type: 'read-all-notifications' }), []);
  const resetCommunication = useCallback(() => dispatch({ type: 'reset', conversations: initialConversations, notifications: initialNotifications }), []);
  const value = useMemo(() => ({
    ...state,
    unreadMessageCount: getUnreadMessageCount(state),
    unreadNotificationCount: getUnreadNotificationCount(state),
    sendMessage,
    markConversationRead,
    markNotificationRead,
    markAllNotificationsRead,
    resetCommunication,
  }), [markAllNotificationsRead, markConversationRead, markNotificationRead, resetCommunication, sendMessage, state]);
  return <CommunicationContext.Provider value={value}>{children}</CommunicationContext.Provider>;
}

export function useCommunication() {
  const value = useContext(CommunicationContext);
  if (!value) throw new Error('useCommunication must be used within CommunicationProvider');
  return value;
}
