import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import useAuthStore from '../../store/authStore';
import { getRoomMessages, getUnreadCount } from '../../services/chatApi';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import MessageSearch from './MessageSearch';
import { sanitizeMessage } from '../../utils/sanitization';

const ChatPanel = ({ roomId, isOpen, onClose }) => {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [replyTo, setReplyTo] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // const [searchResults, setSearchResults] = useState([]);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load initial messages
  useEffect(() => {
    if (isOpen && roomId) {
      loadMessages();
      loadUnreadCount();
    }
  }, [isOpen, roomId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    // Message received
    socket.on('message:received', handleMessageReceived);

    // Message edited
    socket.on('message:edited', handleMessageEdited);

    // Message deleted
    socket.on('message:deleted', handleMessageDeleted);

    // Message reacted
    socket.on('message:reacted', handleMessageReacted);

    // Reaction removed
    socket.on('message:reaction-removed', handleReactionRemoved);

    // Message read
    socket.on('message:read', handleMessageRead);

    // Typing indicators
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:received', handleMessageReceived);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:reacted', handleMessageReacted);
      socket.off('message:reaction-removed', handleReactionRemoved);
      socket.off('message:read', handleMessageRead);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, roomId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Mark messages as read when panel opens
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      markAllAsRead();
    }
  }, [isOpen, messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await getRoomMessages(roomId, page, 50);

      if (page === 1) {
        setMessages(data.messages);
      } else {
        setMessages(prev => [...data.messages, ...prev]);
      }

      setHasMore(data.hasMore);
      setLoading(false);
    } catch (error) {
      console.error('Error loading messages:', error);
      if (error.response?.status === 403) {
        toast.error('You need to join the room first to access chat');
      } else {
        toast.error('Failed to load messages');
      }
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await getUnreadCount(roomId);
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Error loading unread count:', error);
      // Don't show error toast for unread count, it's not critical
    }
  };

  const loadMoreMessages = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadMessages();
    }
  };

  const handleMessageReceived = ({ message }) => {
    if (message.roomId === roomId) {
      setMessages(prev => [...prev, message]);

      // Mark as read if panel is open
      if (isOpen && message.sender.id !== user.id) {
        socket.emit('message:read', { messageId: message.id });
      } else if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }
  };

  const handleMessageEdited = ({ messageId, content, editedAt }) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content, isEdited: true, editedAt }
          : msg
      )
    );
  };

  const handleMessageDeleted = ({ messageId }) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const handleMessageReacted = ({ messageId, userId, emoji, reactions }) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, reactions } : msg
      )
    );
  };

  const handleReactionRemoved = ({ messageId, reactions }) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, reactions } : msg
      )
    );
  };

  const handleMessageRead = ({ messageId, userId, readAt }) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id === messageId) {
          const readBy = msg.readBy || [];
          if (!readBy.some(r => r.userId === userId)) {
            readBy.push({ userId, readAt });
          }
          return { ...msg, readBy };
        }
        return msg;
      })
    );
  };

  const handleTypingStart = ({ userId, userName }) => {
    if (userId !== user.id) {
      setTypingUsers(prev => new Set([...prev, userName]));
    }
  };

  const handleTypingStop = ({ userId }) => {
    setTypingUsers(prev => {
      const newSet = new Set(prev);
      // Remove by finding the user
      for (const userName of newSet) {
        // This is simplified - in production, you'd track userId -> userName mapping
        newSet.delete(userName);
        break;
      }
      return newSet;
    });
  };

  const handleSendMessage = (content, type = 'text', fileAttachment = null) => {
    if (!content.trim() && !fileAttachment) return;

    const sanitizedContent = sanitizeMessage(content);

    socket.emit('message:send', {
      roomId,
      content: sanitizedContent,
      type,
      replyTo: replyTo?.id || null,
      fileAttachment
    });

    setReplyTo(null);
    stopTyping();
  };

  const handleTyping = () => {
    socket.emit('typing:start', { roomId });

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  };

  const stopTyping = () => {
    socket.emit('typing:stop', { roomId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const markAllAsRead = () => {
    socket.emit('messages:mark-all-read', { roomId });
    setUnreadCount(0);
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto'
    });
  };

  const handleScroll = (e) => {
    const { scrollTop } = e.target;

    // Load more when scrolled to top
    if (scrollTop === 0 && hasMore && !loading) {
      loadMoreMessages();
    }
  };

  const handleReply = (message) => {
    setReplyTo(message);
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  // const handleSearch = (results) => {
  //   setSearchResults(results);
  // };

  const handleSearchClose = () => {
    setSearchOpen(false);
    // setSearchResults([]);
  };

  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight');
      setTimeout(() => element.classList.remove('highlight'), 2000);
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentDate = null;

    messages.forEach(message => {
      const messageDate = new Date(message.createdAt);
      const dateStr = messageDate.toDateString();

      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({
          type: 'date',
          date: messageDate
        });
      }

      groups.push({
        type: 'message',
        data: message
      });
    });

    return groups;
  };

  const formatDateSeparator = (date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupedMessages = groupMessagesByDate(messages);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800">Chat</h3>
          {unreadCount > 0 && !isOpen && (
            <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition"
            title="Search messages"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Panel */}
      {searchOpen && (
        <MessageSearch
          roomId={roomId}
          onClose={handleSearchClose}
          onResultClick={scrollToMessage}
        />
      )}

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
      >
        {loading && page === 1 && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {loading && page > 1 && (
          <div className="text-center text-sm text-gray-500 py-2">
            Loading more messages...
          </div>
        )}

        {groupedMessages.map((item, index) => {
          if (item.type === 'date') {
            return (
              <div key={`date-${index}`} className="flex justify-center my-4">
                <span className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">
                  {formatDateSeparator(item.date)}
                </span>
              </div>
            );
          }

          return (
            <MessageBubble
              key={item.data.id}
              message={item.data}
              isOwn={item.data.sender.id === user.id}
              onReply={handleReply}
              onReact={(emoji) => socket.emit('message:react', { messageId: item.data.id, emoji })}
              onEdit={(content) => socket.emit('message:edit', { messageId: item.data.id, content })}
              onDelete={() => socket.emit('message:delete', { messageId: item.data.id })}
            />
          );
        })}

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <TypingIndicator users={Array.from(typingUsers)} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput
        onSend={handleSendMessage}
        onTyping={handleTyping}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
      />
    </div>
  );
};

export default ChatPanel;
