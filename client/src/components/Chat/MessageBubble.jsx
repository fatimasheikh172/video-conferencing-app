import React, { useState, useRef } from 'react';
import { sanitizeMessage } from '../../utils/sanitization';

const MessageBubble = ({ message, isOwn, onReply, onReact, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);

  const messageRef = useRef(null);

  const reactions = ['👍', '❤️', '😂', '😮', '😢'];

  const handleReact = (emoji) => {
    onReact(emoji);
    setShowReactions(false);
  };

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(sanitizeMessage(editContent));
      setIsEditing(false);
    } else {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getReactionCount = (emoji) => {
    return message.reactions?.filter(r => r.emoji === emoji).length || 0;
  };

  const hasUserReacted = (emoji) => {
    return message.reactions?.some(r => r.emoji === emoji && r.userId === message.sender.id);
  };

  const groupedReactions = reactions.map(emoji => ({
    emoji,
    count: getReactionCount(emoji),
    hasReacted: hasUserReacted(emoji)
  })).filter(r => r.count > 0);

  return (
    <div
      id={`message-${message.id}`}
      ref={messageRef}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender Info (for others' messages) */}
        {!isOwn && (
          <div className="flex items-center space-x-2 mb-1 px-2">
            {message.sender.avatar ? (
              <img
                src={message.sender.avatar}
                alt={message.sender.name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600">
                {message.sender.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700">
              {message.sender.name}
            </span>
          </div>
        )}

        {/* Reply Preview */}
        {message.replyTo && (
          <div className={`mx-2 mb-1 p-2 border-l-2 ${isOwn ? 'border-blue-500 bg-blue-50' : 'border-gray-400 bg-gray-100'} rounded text-xs`}>
            <div className="font-semibold text-gray-700">
              {message.replyTo.senderId?.name || 'User'}
            </div>
            <div className="text-gray-600 truncate">
              {message.replyTo.content}
            </div>
          </div>
        )}

        {/* Message Content */}
        <div
          className={`relative px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-800 border border-gray-200'
          } shadow-sm`}
        >
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Message Type: Text/Emoji */}
              {message.type === 'text' || message.type === 'emoji' ? (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              ) : null}

              {/* Message Type: File */}
              {message.type === 'file' && message.fileAttachment && (
                <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      {message.fileAttachment.fileName}
                    </p>
                    <p className="text-xs text-gray-600">
                      {(message.fileAttachment.fileSize / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              )}

              {/* Message Type: System */}
              {message.type === 'system' && (
                <p className="text-xs italic text-gray-500">
                  {message.content}
                </p>
              )}

              {/* Edited Indicator */}
              {message.isEdited && (
                <span className={`text-xs italic ${isOwn ? 'text-blue-200' : 'text-gray-500'} ml-2`}>
                  (edited)
                </span>
              )}
            </>
          )}

          {/* Timestamp (on hover) */}
          <div className={`absolute ${isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2`}>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>

        {/* Reactions */}
        {groupedReactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-2">
            {groupedReactions.map(({ emoji, count, hasReacted }) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                  hasReacted
                    ? 'bg-blue-100 border border-blue-300'
                    : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                } transition`}
              >
                <span>{emoji}</span>
                <span className="font-medium">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Read Receipts (for own messages) */}
        {isOwn && message.readBy && message.readBy.length > 0 && (
          <div className="flex justify-end mt-1 px-2">
            <span className="text-xs text-gray-500">
              ✓✓ Read by {message.readBy.length}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && !isEditing && (
        <div className={`flex items-center space-x-1 ${isOwn ? 'order-1 mr-2' : 'order-2 ml-2'}`}>
          {/* React Button */}
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
              title="React"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Reaction Picker */}
            {showReactions && (
              <div className="absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex space-x-1 z-10">
                {reactions.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply Button */}
          <button
            onClick={() => onReply(message)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
            title="Reply"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
            title={copied ? 'Copied!' : 'Copy'}
          >
            {copied ? (
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* Edit/Delete (own messages only) */}
          {isOwn && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Delete this message?')) {
                    onDelete();
                  }
                }}
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
