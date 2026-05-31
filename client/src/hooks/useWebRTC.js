import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { SocketContext } from '../context/SocketContext';
import webrtcService from '../services/webrtc';

const useWebRTC = (roomId, userName) => {
  const { socket } = useContext(SocketContext);
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionQuality, setConnectionQuality] = useState({});
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareUser, setScreenShareUser] = useState(null);
  const [screenShareError, setScreenShareError] = useState(null);

  const peersRef = useRef(new Map());
  const reconnectTimeoutRef = useRef(null);
  const qualityCheckIntervalRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      setIsConnecting(true);
      const stream = await webrtcService.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      setLocalStream(stream);
      setIsConnecting(false);
      return stream;
    } catch (error) {
      console.error('Error initializing media:', error);
      setError('Failed to access camera/microphone. Please check permissions.');
      setIsConnecting(false);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(
    (userId, socketId, initiator, stream) => {
      console.log(`Creating peer connection: ${userId} (${socketId}), initiator: ${initiator}`);

      const peer = webrtcService.createPeer(socketId, initiator, stream, {
        onSignal: (signal) => {
          socket.emit('peer:signal', {
            signal,
            to: socketId,
            userId: socket.userId
          });
        },
        onStream: (remoteStream) => {
          console.log(`Received stream from ${userId}`);
          setPeers((prevPeers) => {
            const existingPeer = prevPeers.find((p) => p.userId === userId);
            if (existingPeer) {
              return prevPeers.map((p) =>
                p.userId === userId ? { ...p, stream: remoteStream } : p
              );
            }
            return [
              ...prevPeers,
              {
                userId,
                socketId,
                stream: remoteStream,
                userName: userName,
                isAudioEnabled: true,
                isVideoEnabled: true
              }
            ];
          });
        },
        onConnect: () => {
          console.log(`Peer connected: ${userId}`);
          socket.emit('peer:connected', { peerId: socketId, roomId });
        },
        onClose: () => {
          console.log(`Peer closed: ${userId}`);
          removePeer(userId);
        },
        onError: (error) => {
          console.error(`Peer error (${userId}):`, error);
          removePeer(userId);
        }
      });

      peersRef.current.set(userId, { peer, socketId, userId });
      return peer;
    },
    [socket, roomId, userName]
  );

  // Remove peer
  const removePeer = useCallback((userId) => {
    console.log(`Removing peer: ${userId}`);
    setPeers((prevPeers) => prevPeers.filter((p) => p.userId !== userId));

    const peerData = peersRef.current.get(userId);
    if (peerData) {
      webrtcService.removePeer(peerData.socketId);
      peersRef.current.delete(userId);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    webrtcService.toggleAudio(newState);

    if (socket) {
      socket.emit('user:toggle-audio', {
        roomId,
        isEnabled: newState
      });
    }
  }, [isAudioEnabled, socket, roomId]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    webrtcService.toggleVideo(newState);

    if (socket) {
      socket.emit('user:toggle-video', {
        roomId,
        isEnabled: newState
      });
    }
  }, [isVideoEnabled, socket, roomId]);

  // Start screen sharing
  const startScreenShare = useCallback(async (quality = '720p') => {
    try {
      setScreenShareError(null);

      // Store camera stream reference
      if (localStream && !cameraStreamRef.current) {
        cameraStreamRef.current = localStream;
      }

      // Start screen share
      const screenStream = await webrtcService.startScreenShare(quality);

      // Set up callback for when user stops via browser UI
      webrtcService.setScreenShareEndedCallback(() => {
        stopScreenShare();
      });

      // Update local stream
      setLocalStream(screenStream);
      setIsScreenSharing(true);

      // Notify server
      if (socket) {
        socket.emit('screenshare:start', { roomId });
      }

      return true;
    } catch (error) {
      console.error('Error starting screen share:', error);
      setScreenShareError(error.message || 'Failed to start screen sharing');
      return false;
    }
  }, [localStream, socket, roomId]);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    try {
      // Restore camera stream
      if (cameraStreamRef.current) {
        await webrtcService.stopScreenShare(cameraStreamRef.current);
        setLocalStream(cameraStreamRef.current);
      }

      setIsScreenSharing(false);

      // Notify server
      if (socket) {
        socket.emit('screenshare:stop', { roomId });
      }

      return true;
    } catch (error) {
      console.error('Error stopping screen share:', error);
      return false;
    }
  }, [socket, roomId]);

  // Request to share screen (when someone else is sharing)
  const requestScreenShare = useCallback(() => {
    if (socket) {
      socket.emit('screenshare:request', { roomId });
    }
  }, [socket, roomId]);

  // Check connection quality periodically
  const checkConnectionQuality = useCallback(async () => {
    const qualities = {};

    for (const [userId, peerData] of peersRef.current.entries()) {
      const stats = await webrtcService.getConnectionStats(peerData.socketId);
      if (stats) {
        qualities[userId] = stats.quality;
      }
    }

    setConnectionQuality(qualities);
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !localStream) return;

    console.log('Setting up socket listeners');

    // Existing users in room
    socket.on('room:users', (users) => {
      console.log('Received room users:', users);
      users.forEach((user) => {
        if (user.socketId !== socket.id) {
          createPeerConnection(user.userId, user.socketId, true, localStream);
        }
      });
    });

    // New user joined
    socket.on('user:joined', ({ userId, socketId, userName: newUserName }) => {
      console.log('User joined:', userId);
      createPeerConnection(userId, socketId, false, localStream);
    });

    // Receive signal from peer
    socket.on('peer:signal', ({ signal, from, userId }) => {
      console.log('Received signal from:', userId);

      const peerData = Array.from(peersRef.current.values()).find(
        (p) => p.socketId === from
      );

      if (peerData) {
        webrtcService.signalPeer(from, signal);
      } else {
        // Create peer if it doesn't exist (for answering peer)
        const peer = createPeerConnection(userId, from, false, localStream);
        webrtcService.signalPeer(from, signal);
      }
    });

    // User left
    socket.on('user:left', ({ userId }) => {
      console.log('User left:', userId);
      removePeer(userId);
    });

    // User media state changed
    socket.on('user:media-state', ({ userId, isAudioEnabled, isVideoEnabled }) => {
      setPeers((prevPeers) =>
        prevPeers.map((p) =>
          p.userId === userId
            ? { ...p, isAudioEnabled, isVideoEnabled }
            : p
        )
      );
    });

    // User reconnected
    socket.on('user:reconnected', ({ userId, socketId }) => {
      console.log('User reconnected:', userId);
      // Recreate peer connection
      removePeer(userId);
      setTimeout(() => {
        createPeerConnection(userId, socketId, true, localStream);
      }, 1000);
    });

    // Room error
    socket.on('room:error', ({ message }) => {
      console.error('Room error:', message);
      setError(message);
    });

    // Connection quality changed
    socket.on('user:quality-changed', ({ userId, quality }) => {
      setConnectionQuality((prev) => ({ ...prev, [userId]: quality }));
    });

    // Screen share started
    socket.on('screenshare:started', ({ userId, userName }) => {
      console.log(`Screen share started by ${userName}`);
      setScreenShareUser({ userId, userName });
    });

    // Screen share stopped
    socket.on('screenshare:stopped', ({ userId }) => {
      console.log(`Screen share stopped by user ${userId}`);
      setScreenShareUser(null);
    });

    // Screen share error
    socket.on('screenshare:error', ({ message }) => {
      console.error('Screen share error:', message);
      setScreenShareError(message);
      setTimeout(() => setScreenShareError(null), 5000);
    });

    // Screen share request received (someone wants to share)
    socket.on('screenshare:request-received', ({ userId, userName }) => {
      console.log(`${userName} wants to share their screen`);
      // This could trigger a notification/dialog
    });

    return () => {
      socket.off('room:users');
      socket.off('user:joined');
      socket.off('peer:signal');
      socket.off('user:left');
      socket.off('user:media-state');
      socket.off('user:reconnected');
      socket.off('room:error');
      socket.off('user:quality-changed');
      socket.off('screenshare:started');
      socket.off('screenshare:stopped');
      socket.off('screenshare:error');
      socket.off('screenshare:request-received');
    };
  }, [socket, localStream, createPeerConnection, removePeer]);

  // Start connection quality monitoring
  useEffect(() => {
    if (peers.length > 0) {
      qualityCheckIntervalRef.current = setInterval(checkConnectionQuality, 5000);
    }

    return () => {
      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
      }
    };
  }, [peers.length, checkConnectionQuality]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Cleaning up WebRTC hook');
      webrtcService.cleanup();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (qualityCheckIntervalRef.current) {
        clearInterval(qualityCheckIntervalRef.current);
      }
    };
  }, []);

  return {
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
    stopScreenShare,
    requestScreenShare
  };
};

export default useWebRTC;
