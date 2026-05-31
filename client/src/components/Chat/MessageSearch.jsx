import React, { useState, useEffect } from 'react';
import { searchMessages } from '../../services/chatApi';

const MessageSearch = ({ roomId, onClose, onResultClick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (query.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        handleSearch();
      }, 500); // Debounce search

      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await searchMessages(roomId, query.trim(), 20);
      setResults(data.messages || []);
      setLoading(false);
    } catch (err) {
      console.error('Error searching messages:', err);
      setError('Failed to search messages');
      setLoading(false);
    }
  };

  const highlightText = (text, query) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Search Results */}
      <div className="max-h-64 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            No messages found
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="divide-y divide-gray-200">
            {results.map((message) => (
              <button
                key={message._id}
                onClick={() => {
                  onResultClick(message._id);
                  onClose();
                }}
                className="w-full p-4 text-left hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {message.senderId?.name || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(message.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {highlightText(message.content, query)}
                </p>
              </button>
            ))}
          </div>
        )}

        {query.trim().length < 2 && (
          <div className="p-4 text-center text-sm text-gray-500">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageSearch;
