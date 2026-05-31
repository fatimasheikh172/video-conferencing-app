import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SocketContext } from '../../context/SocketContext';
import useAuthStore from '../../store/authStore';
import useWebRTC from '../../hooks/useWebRTC';
import VideoGrid from './VideoGrid';
import VideoTile from './VideoTile';
import ControlBar from './ControlBar';
import ParticipantList from './ParticipantList';
import FilePanel from '../File/FilePanel';
import Whiteboard from '../Whiteboard/Whiteboard';

const VideoRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket } = useContext(SocketContext);
  const { user } = useAuthStore();

  const [showParticipants, setShowParticipants] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [volume, setVolume] = useState(1);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

  const {
    peers,
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    error,
    isConnecting,
    connectionQuality,
    isScreenSharing,
    screenShareUser,
    screenShareError,
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare
  } = useWebRTC(roomId, user?.name || 'Guest');

  // Initialize media and join room
  useEffect(() => {
    const joinRoom = async () => {
      try {
        // Initialize local media first
        await initializeMedia();

        // Join the room via socket
        if (socket && roomId && !hasJoinedRoom) {
          socket.emit('room:join', {
            roomId,
            userName: user?.name || 'Guest',
            userId: user?.id || socket.id
          });
          setHasJoinedRoom(true);
        }
      } catch (error) {
        console.error('Failed to join room:', error);
      }
    };

    joinRoom();
  }, [socket, roomId, user, initializeMedia, hasJoinedRoom]);

  // Handle volume change
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    // Apply volume to all remote video elements
    const videoElements = document.querySelectorAll('video:not([muted])');
    videoElements.forEach((video) => {
      video.volume = newVolume;
    });
  };

  // Handle leave room
  const handleLeaveRoom = () => {
    if (socket && roomId) {
      socket.emit('room:leave', { roomId });
    }

    // Stop all local media tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Navigate back to home
    navigate('/');
  };

  // Handle screen share toggle
  const handleToggleScreenShare = async (start, quality = '720p') => {
    if (start) {
      const success = await startScreenShare(quality);
      if (!success && screenShareError) {
        // Error is already set in the hook
        setTimeout(() => {
          // Clear error after 5 seconds
        }, 5000);
      }
    } else {
      await stopScreenShare();
    }
  };

  // Prepare participants list for sidebar
  const participants = [
    // Local user
    {
      userId: user?.id || socket?.id || 'local',
      userName: user?.name || 'You',
      isLocal: true,
      isAudioEnabled,
      isVideoEnabled,
      connectionQuality: 'good'
    },
    // Remote peers
    ...peers.map((peer) => ({
      userId: peer.userId,
      userName: peer.userName,
      isLocal: false,
      isAudioEnabled: peer.isAudioEnabled,
      isVideoEnabled: peer.isVideoEnabled,
      connectionQuality: connectionQuality[peer.userId] || 'good'
    }))
  ];

  // Show loading state
  if (isConnecting) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Connecting to room...</p>
          <p className="text-gray-400 text-sm mt-2">Setting up your camera and microphone</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* Room header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-lg font-semibold">Room: {roomId}</h1>
            <p className="text-gray-400 text-sm">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-medium">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video grid area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Screen share indicator banner */}
        {screenShareUser && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium">
                {screenShareUser.userId === (user?.id || socket?.id)
                  ? 'You are sharing your screen'
                  : `${screenShareUser.userName} is sharing their screen`}
              </span>
            </div>
          </div>
        )}

        {/* Screen share error notification */}
        {screenShareError && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-medium">{screenShareError}</span>
          </div>
        )}

        <VideoGrid participantCount={participants.length}>
          {/* Local video */}
          {localStream && (
            <VideoTile
              stream={localStream}
              userName={user?.name || 'You'}
              isLocal={true}
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
              connectionQuality="good"
              isScreenSharing={isScreenSharing}
            />
          )}

          {/* Remote peers */}
          {peers.map((peer) => (
            <VideoTile
              key={peer.userId}
              stream={peer.stream}
              userName={peer.userName}
              isLocal={false}
              isAudioEnabled={peer.isAudioEnabled}
              isVideoEnabled={peer.isVideoEnabled}
              connectionQuality={connectionQuality[peer.userId] || 'good'}
              isScreenSharing={screenShareUser?.userId === peer.userId}
            />
          ))}
        </VideoGrid>

        {/* Empty room message */}
        {peers.length === 0 && localStream && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center bg-gray-800 bg-opacity-90 rounded-lg p-8 max-w-md">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="text-white text-lg font-semibold mb-2">Waiting for others to join</h3>
              <p className="text-gray-400 text-sm">
                Share the room ID with others to start the call
              </p>
              <div className="mt-4 bg-gray-700 rounded-lg px-4 py-2">
                <p className="text-gray-300 text-xs mb-1">Room ID</p>
                <p className="text-white font-mono font-semibold">{roomId}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <ControlBar
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onLeaveRoom={handleLeaveRoom}
        onToggleParticipants={() => setShowParticipants(!showParticipants)}
        participantCount={participants.length}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isScreenSharing={isScreenSharing}
        onToggleScreenShare={handleToggleScreenShare}
        screenShareUser={screenShareUser}
        onToggleFiles={() => setShowFiles(!showFiles)}
        onToggleWhiteboard={() => setShowWhiteboard(!showWhiteboard)}
      />

      {/* Participants list sidebar */}
      <ParticipantList
        participants={participants}
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
      />

      {/* File sharing panel */}
      <FilePanel
        roomId={roomId}
        isOpen={showFiles}
        onClose={() => setShowFiles(false)}
      />

      {/* Whiteboard */}
      <Whiteboard
        roomId={roomId}
        isOpen={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
      />
    </div>
  );
};

export default VideoRoom;
