import { useState, useCallback, useRef } from 'react';
import {
  createSession as apiCreateSession,
  getMessages as apiGetMessages,
  sendMessage as apiSendMessage,
} from '../services/api';

/**
 * Custom hook for managing chat state.
 * Handles session creation, message sending (text + form),
 * paginated message fetching, and loading states.
 */
export function useChat() {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    total_pages: 1,
    has_more: false,
    total: 0,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const currentPageRef = useRef(1);
  const lastFailedRef = useRef(null);

  /**
   * Create a new session and show a welcome greeting.
   */
  const startSession = useCallback(async () => {
    setIsLoading(true);
    setMessages([]);
    setError(null);
    setSessionId(null);
    lastFailedRef.current = null;
    try {
      const { data } = await apiCreateSession();
      const sid = data.session.id;
      setSessionId(sid);

      // Show a static welcome message (no API call)
      const welcomeMessage = {
        id: 'welcome',
        role: 'assistant',
        content: "Hey there! 👋 I'm your car-finding assistant. What kind of car are you looking for?",
        message_type: 'text',
        created_at: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
      currentPageRef.current = 1;
      setPagination({ page: 1, total_pages: 1, has_more: false, total: 1 });
    } catch (err) {
      console.error('Failed to start session:', err);
      setError('Failed to connect. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Send a text message.
   */
  const sendTextMessage = useCallback(
    async (content) => {
      if (!sessionId || !content.trim()) return;

      // Show user message immediately (optimistic)
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        role: 'user',
        content: content.trim(),
        message_type: 'text',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setIsSending(true);
      setError(null);

      try {
        const { data } = await apiSendMessage(sessionId, {
          content: content.trim(),
          message_type: 'text',
        });

        // Replace temp message with real one + add AI response
        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          const newMsgs = [];
          if (data.user_message) newMsgs.push(data.user_message);
          if (data.assistant_message) newMsgs.push(data.assistant_message);
          return [...withoutTemp, ...newMsgs];
        });
        lastFailedRef.current = null;
      } catch (err) {
        console.error('Failed to send message:', err);
        lastFailedRef.current = { type: 'text', content: content.trim(), tempId };
        const msg = err?.response?.data?.error || 'Failed to get a response. Tap retry to try again.';
        setError(msg);
      } finally {
        setIsSending(false);
      }
    },
    [sessionId]
  );

  /**
   * Send a form response.
   */
  const sendFormResponse = useCallback(
    async (formData = {}, questionId = null) => {
      if (!sessionId) return;

      // Build a friendly display string from form data
      const friendlyContent = Object.values(formData || {})
        .flat()
        .filter(Boolean)
        .map((v) => String(v).replace(/_/g, ' '))
        .join(', ');

      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        role: 'user',
        content: friendlyContent,
        message_type: 'form_response',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);
      setIsSending(true);
      setError(null);

      try {
        const { data } = await apiSendMessage(sessionId, {
          content: friendlyContent,
          message_type: 'form_response',
          form_data: formData,
          question_id: questionId,
        });

        setMessages((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempId);
          const newMsgs = [];
          if (data.user_message) newMsgs.push(data.user_message);
          if (data.assistant_message) newMsgs.push(data.assistant_message);
          return [...withoutTemp, ...newMsgs];
        });
        lastFailedRef.current = null;
      } catch (err) {
        console.error('Failed to send form response:', err);
        lastFailedRef.current = { type: 'form', formData, questionId, tempId };
        const msg = err?.response?.data?.error || 'Failed to get a response. Tap retry to try again.';
        setError(msg);
      } finally {
        setIsSending(false);
      }
    },
    [sessionId]
  );

  /**
   * Load older messages (pagination — scroll up).
   */
  const loadMoreMessages = useCallback(async () => {
    if (!sessionId || isLoadingMore || !pagination.has_more) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPageRef.current + 1;
      const { data } = await apiGetMessages(sessionId, nextPage, 20);

      if (data.messages.length > 0) {
        setMessages((prev) => [...data.messages, ...prev]);
        currentPageRef.current = nextPage;
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [sessionId, isLoadingMore, pagination.has_more]);

  const clearError = useCallback(() => setError(null), []);

  const retryLastMessage = useCallback(() => {
    if (!lastFailedRef.current) return;
    const failed = lastFailedRef.current;
    // Remove the old temp message to avoid duplicates
    if (failed.tempId) {
      setMessages((prev) => prev.filter((m) => m.id !== failed.tempId));
    }
    setError(null);
    if (failed.type === 'text') {
      sendTextMessage(failed.content);
    } else if (failed.type === 'form') {
      sendFormResponse(failed.formData, failed.questionId);
    }
  }, [sendTextMessage, sendFormResponse]);

  return {
    sessionId,
    messages,
    isLoading,
    isSending,
    isLoadingMore,
    error,
    pagination,
    startSession,
    sendTextMessage,
    sendFormResponse,
    loadMoreMessages,
    clearError,
    retryLastMessage,
  };
}
