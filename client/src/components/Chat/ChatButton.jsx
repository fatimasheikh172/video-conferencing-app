import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { getUnreadCount } from '../../services/chatApi';

const ChatButton = ({ roomId, onClick, isOpen }) => {
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    if (roomId) {
      loadUnreadCount();
    }
  }, [roomId]);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Listen for new messages
    socket.on('message:received', handleNewMessage);

    return () => {
      socket.off('message:received', handleNewMessage);
    };
  }, [socket, roomId, isOpen]);

  const loadUnreadCount = async () => {
    try {
      const data = await getUnreadCount(roomId);
      setUnreadCount(data.count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleNewMessage = ({ message }) => {
    if (message.roomId === roomId && !isOpen) {
      setUnreadCount(prev => prev + 1);
      setHasNewMessage(true);

      // Clear animation after 1 second
      setTimeout(() => setHasNewMessage(false), 1000);
    }
  };

  const handleClick = () => {
    onClick();
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`relative p-3 rounded-full transition-all duration-200 ${
        isOpen
          ? 'bg-blue-600 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100 shadow-lg'
      } ${hasNewMessage ? 'animate-bounce' : ''}`}
      title={isOpen ? 'Close chat' : 'Open chat'}
    >
      {/* Chat Icon */}
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      {/* Unread Badge */}
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}

      {/* New Message Indicator */}
      {hasNewMessage && !isOpen && (
        <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
      )}
    </button>
  );
};

export default ChatButton;
