/**
 * Chat System Integration Example
 * Complete example showing how to integrate chat into your video room
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useSocket } from '../context/SocketContext';
import ChatPanel from '../components/Chat/ChatPanel';
import ChatButton from '../components/Chat/ChatButton';
import VideoGrid from '../components/Video/VideoGrid';
import ControlBar from '../components/Video/ControlBar';

const VideoRoomWithChat = () => {
  const { roomId } = useParams();
  const { user } = useAuthStore();
  const { socket } = useSocket();

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);

  // Video state
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  useEffect(() => {
    if (socket && roomId) {
      // Join room
      socket.emit('join-room', { roomId, userName: user.name });
    }

    return () => {
      if (socket && roomId) {
        socket.emit('leave-room', { roomId });
      }
    };
  }, [socket, roomId, user]);

  return (
    <div className="relative h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Room: {roomId}</h1>
          <p className="text-sm text-gray-400">Logged in as {user.name}</p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
        >
          Leave Room
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          <VideoGrid roomId={roomId} />
        </div>

        {/* Chat Panel - Slides in from right when open */}
        <ChatPanel
          roomId={roomId}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-center space-x-4">
        <ControlBar
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={() => setIsAudioEnabled(!isAudioEnabled)}
          onToggleVideo={() => setIsVideoEnabled(!isVideoEnabled)}
        />
      </div>

      {/* Floating Chat Button - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-40">
        <ChatButton
          roomId={roomId}
          onClick={() => setChatOpen(!chatOpen)}
          isOpen={chatOpen}
        />
      </div>
    </div>
  );
};

export default VideoRoomWithChat;
