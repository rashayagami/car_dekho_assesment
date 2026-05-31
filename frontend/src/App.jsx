import { useEffect, useCallback } from 'react';
import ChatWindow from './components/ChatWindow';
import { useChat } from './hooks/useChat';
import './App.css';

function App() {
  const {
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
    retryLastMessage,
  } = useChat();

  useEffect(() => {
    startSession();
  }, [startSession]);

  const handleFormSubmit = useCallback(
    (data, purpose) => {
      sendFormResponse(data);
    },
    [sendFormResponse]
  );

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
        <p>Starting your car finder session...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1 className="app-title">🚗 CarDekho AI</h1>
          <p className="app-subtitle">Find your perfect car</p>
        </div>
        <button className="app-new-chat" onClick={startSession} disabled={isLoading || isSending}>
          + New Chat
        </button>
      </header>

      <main className="app-main">
        <ChatWindow
          messages={messages}
          isSending={isSending}
          isLoadingMore={isLoadingMore}
          hasMore={pagination.has_more}
          error={error}
          onSendText={sendTextMessage}
          onFormSubmit={handleFormSubmit}
          onLoadMore={loadMoreMessages}
          onRetry={retryLastMessage}
        />
      </main>
    </div>
  );
}

export default App;
