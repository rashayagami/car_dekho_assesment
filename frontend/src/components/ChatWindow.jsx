import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import './ChatWindow.css';

/**
 * Main chat window with paginated message scrolling.
 * Uses IntersectionObserver for scroll-to-top loading.
 */
export default function ChatWindow({
  messages,
  isSending,
  isLoadingMore,
  hasMore,
  error,
  onSendText,
  onFormSubmit,
  onLoadMore,
  onRetry,
}) {
  const scrollContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const topSentinelRef = useRef(null);
  const inputRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // IntersectionObserver for loading older messages on scroll up
  useEffect(() => {
    if (!topSentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          onLoadMore();
        }
      },
      { root: scrollContainerRef.current, threshold: 0.1 }
    );

    observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const value = inputRef.current?.value?.trim();
        if (value && !isSending) {
          onSendText(value);
          inputRef.current.value = '';
        }
      }
    },
    [onSendText, isSending]
  );

  const handleSendClick = useCallback(() => {
    const value = inputRef.current?.value?.trim();
    if (value && !isSending) {
      onSendText(value);
      inputRef.current.value = '';
    }
  }, [onSendText, isSending]);

  const lastActiveFormMsgId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.message_type === 'form_request' && msg.form_config && msg.is_active !== false) {
        return msg.id;
      }
    }
    return null;
  }, [messages]);

  const memoizedMessages = useMemo(
    () =>
      messages.map((msg, index) => {
        const isLast = index === messages.length - 1;
        const isActiveForm = msg.id === lastActiveFormMsgId;
        return (
          <ChatMessage
            key={msg.id}
            message={msg}
            onFormSubmit={onFormSubmit}
            isLast={isLast}
            isActiveForm={isActiveForm}
          />
        );
      }),
    [messages, onFormSubmit, lastActiveFormMsgId]
  );

  return (
    <div className="cw-container">
      <div className="cw-messages" ref={scrollContainerRef}>
        {/* Sentinel for loading older messages */}
        {hasMore && (
          <div ref={topSentinelRef} className="cw-sentinel">
            {isLoadingMore && <span className="cw-loading-text">Loading...</span>}
          </div>
        )}

        <div className="cw-messages-inner">
          {memoizedMessages}
          {isSending && (
            <div className="cw-status-row">
              <div className="cw-status-bubble">
                <TypingIndicator />
                <span className="cw-status-text">AI is thinking…</span>
              </div>
            </div>
          )}
          {error && !isSending && (
            <div className="cw-error-row">
              <div className="cw-error-bubble">
                <span className="cw-error-icon">⚠</span>
                <span className="cw-error-text">{error}</span>
                {onRetry && (
                  <button className="cw-retry-btn" onClick={onRetry}>Retry</button>
                )}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="cw-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="cw-input"
          placeholder="Type a message..."
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />
        <button
          className="cw-send-btn"
          onClick={handleSendClick}
          disabled={isSending}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
