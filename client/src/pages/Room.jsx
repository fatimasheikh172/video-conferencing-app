import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import useAuthStore from '../store/authStore';
import useRoomStore from '../store/roomStore';
import useMediaStore from '../store/mediaStore';
import useUIStore from '../store/uiStore';

// Components
import RoomNavbar from '../components/Room/RoomNavbar';
import VideoGrid from '../components/Room/VideoGrid';
import ControlBar from '../components/Room/ControlBar';
import ChatPanel from '../components/Chat/ChatPanel';
import ChatButton from '../components/Chat/ChatButton';
import ParticipantsSidebar from '../components/Room/ParticipantsSidebar';
import SettingsModal from '../components/Room/SettingsModal';
import WhiteboardPanel from '../components/Whiteboard/WhiteboardPanel';
import FilesSidebar from '../components/Room/FilesSidebar';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const {
    joinRoom,
    leaveRoom,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setParticipants,
  } = useRoomStore();
  const {
    initializeMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    cleanup: cleanupMedia,
  } = useMediaStore();
  const {
    activePanel,
    setActivePanel,
    theme,
    isMobile,
    showSettings,
    setShowSettings,
  } = useUIStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.3 }
    }
  };

  const sidebarVariants = {
    initial: { x: '100%', opacity: 0 },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      x: '100%',
      opacity: 0,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  };

  const leftSidebarVariants = {
    initial: { x: '-100%', opacity: 0 },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      x: '-100%',
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const controlBarVariants = {
    initial: { y: 100, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.2,
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const navbarVariants = {
    initial: { y: -100, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const modalVariants = {
    initial: { scale: 0.9, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      scale: 0.9,
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };

  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Initialize room
  useEffect(() => {
    if (!socket || !user || !roomId) return;

    const initialize = async () => {
      try {
        // Try to initialize media
        const stream = await initializeMedia(true, true);

        if (!stream) {
          // Media permission denied or not available
          toast.error(
            'Camera/microphone access denied. You can still join but others won\'t see or hear you.',
            { duration: 5000 }
          );
        }

        // Join room via API to add user to database
        try {
          const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000 , *';
          const token = localStorage.getItem('accessToken');

          const response = await fetch(`${API_URL}/api/rooms/${roomId}/join`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
          });

          const data = await response.json();

          // Handle "already in room" as success
          if (!response.ok && response.status !== 400) {
            throw new Error(data.message || 'Failed to join room');
          }

          // If 400 and message is "already in room", treat as success
          if (response.status === 400 && data.message?.includes('already in this room')) {
            console.log('User already in room, continuing...');
          } else if (!response.ok) {
            throw new Error(data.message || 'Failed to join room');
          }
        } catch (apiError) {
          console.error('Error joining room via API:', apiError);
          toast.error(apiError.message || 'Failed to join room');
          return;
        }

        // Join room in local state
        joinRoom(roomId, `Room ${roomId}`, user);

        // Then emit socket event with correct event name
        socket.emit('room:join', { roomId, userName: user.name, userId: user.id });

        setIsInitialized(true);

        if (stream) {
          toast.success('Joined room successfully');
        } else {
          toast.success('Joined room without media');
        }
      } catch (error) {
        console.error('Error initializing room:', error);
        toast.error('Failed to join room');
      }
    };

    initialize();

    return () => {
      // Cleanup on unmount
      socket.emit('room:leave', { roomId });
      leaveRoom();
      cleanupMedia();
    };
  }, [socket, user, roomId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !roomId) return;

    // User joined
    socket.on('user:joined', ({ userId, userName, socketId }) => {
      addParticipant({
        id: userId,
        name: userName,
        socketId,
        isAudioEnabled: true,
        isVideoEnabled: true,
        joinedAt: new Date(),
      });
      toast.success(`${userName} joined the room`);
    });

    // User left
    socket.on('user:left', ({ userId, socketId }) => {
      removeParticipant(userId);
      toast(`User left the room`);
    });

    // Room users list
    socket.on('room:users', (users) => {
      const participants = users.map(u => ({
        id: u.userId,
        name: u.userName,
        socketId: u.socketId,
        isAudioEnabled: u.isAudioEnabled,
        isVideoEnabled: u.isVideoEnabled,
        joinedAt: new Date(u.joinedAt),
      }));
      setParticipants(participants);
    });

    // Room error
    socket.on('room:error', ({ message }) => {
      toast.error(message);
    });

    // User media state changed
    socket.on('user:media-state', ({ userId, isAudioEnabled, isVideoEnabled }) => {
      updateParticipant(userId, { isAudioEnabled, isVideoEnabled });
    });

    return () => {
      socket.off('user:joined');
      socket.off('user:left');
      socket.off('room:users');
      socket.off('room:error');
      socket.off('user:media-state');
    };
  }, [socket, roomId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'm':
          handleToggleAudio();
          break;
        case 'v':
          handleToggleVideo();
          break;
        case 's':
          handleToggleScreenShare();
          break;
        case 'c':
          handleToggleChat();
          break;
        case 'p':
          setActivePanel(activePanel === 'participants' ? null : 'participants');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAudioEnabled, isVideoEnabled, isScreenSharing, activePanel]);

  // Handlers
  const handleToggleAudio = useCallback(() => {
    toggleAudio();
    socket?.emit('user:toggle-audio', { roomId, isEnabled: !isAudioEnabled });
    toast.success(isAudioEnabled ? 'Microphone muted' : 'Microphone unmuted');
  }, [toggleAudio, socket, roomId, isAudioEnabled]);

  const handleToggleVideo = useCallback(() => {
    toggleVideo();
    socket?.emit('user:toggle-video', { roomId, isEnabled: !isVideoEnabled });
    toast.success(isVideoEnabled ? 'Camera off' : 'Camera on');
  }, [toggleVideo, socket, roomId, isVideoEnabled]);

  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        stopScreenShare();
        socket?.emit('screenshare:stop', { roomId });
        toast.success('Screen sharing stopped');
      } else {
        await startScreenShare();
        socket?.emit('screenshare:start', { roomId });
        toast.success('Screen sharing started');
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast.error('Failed to toggle screen share');
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare, socket, roomId]);

  const handleToggleChat = useCallback(() => {
    setChatOpen(!chatOpen);
    if (!chatOpen) {
      setActivePanel('chat');
    } else {
      setActivePanel(null);
    }
  }, [chatOpen, setActivePanel]);

  const handleLeaveRoom = useCallback(() => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  if (!isInitialized) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center bg-gray-900"
      >
        <div className="text-center">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
            className="rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"
          />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white"
          >
            Initializing room...
          </motion.p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`h-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-100'}`}
    >
      {/* Top Navbar */}
      <motion.div variants={navbarVariants} initial="initial" animate="animate">
        <RoomNavbar
          roomId={roomId}
          onOpenSettings={() => setShowSettings(true)}
        />
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Whiteboard Tools (when active) */}
        <AnimatePresence>
          {activePanel === 'whiteboard' && !isMobile && (
            <motion.div
              variants={leftSidebarVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
            >
              {/* Whiteboard tools will go here */}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Video Area */}
        <motion.div
          layout
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`flex-1 flex flex-col overflow-hidden ${
            activePanel === 'chat' || activePanel === 'participants' || activePanel === 'files'
              ? isMobile ? 'hidden' : 'w-[70%]'
              : 'w-full'
          }`}
        >
          <VideoGrid roomId={roomId} />
        </motion.div>

        {/* Right Sidebar - Chat/Participants/Files */}
        <AnimatePresence mode="wait">
          {activePanel === 'chat' && (
            <motion.div
              key="chat"
              variants={sidebarVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`${isMobile ? 'fixed top-16 bottom-20 left-0 right-0 z-40' : 'w-[30%]'} bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700`}
            >
              <ChatPanel
                roomId={roomId}
                isOpen={true}
                onClose={() => {
                  setChatOpen(false);
                  setActivePanel(null);
                }}
              />
            </motion.div>
          )}

          {activePanel === 'participants' && (
            <motion.div
              key="participants"
              variants={sidebarVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`${isMobile ? 'fixed top-16 bottom-20 left-0 right-0 z-40' : 'w-[30%]'} bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700`}
            >
              <ParticipantsSidebar onClose={() => setActivePanel(null)} />
            </motion.div>
          )}

          {activePanel === 'files' && (
            <motion.div
              key="files"
              variants={sidebarVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`${isMobile ? 'fixed top-16 bottom-20 left-0 right-0 z-40' : 'w-[30%]'} bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700`}
            >
              <FilesSidebar roomId={roomId} onClose={() => setActivePanel(null)} />
            </motion.div>
          )}

          {activePanel === 'whiteboard' && (
            <motion.div
              key="whiteboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`${isMobile ? 'fixed top-16 bottom-20 left-0 right-0 z-40' : 'flex-1'} bg-white dark:bg-gray-800`}
            >
              <WhiteboardPanel roomId={roomId} onClose={() => setActivePanel(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Control Bar */}
      <motion.div
        variants={controlBarVariants}
        initial="initial"
        animate="animate"
        className="relative z-50"
      >
        <ControlBar
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          onToggleAudio={handleToggleAudio}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleChat={handleToggleChat}
          onToggleParticipants={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
          onToggleWhiteboard={() => setActivePanel(activePanel === 'whiteboard' ? null : 'whiteboard')}
          onToggleFiles={() => setActivePanel(activePanel === 'files' ? null : 'files')}
          onLeaveRoom={handleLeaveRoom}
          activePanel={activePanel}
        />
      </motion.div>

      {/* Floating Chat Button (when chat closed on mobile) */}
      <AnimatePresence>
        {!chatOpen && isMobile && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-6 z-40"
          >
            <ChatButton
              roomId={roomId}
              onClick={handleToggleChat}
              isOpen={chatOpen}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              variants={overlayVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="pointer-events-auto">
                <SettingsModal onClose={() => setShowSettings(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Room;
