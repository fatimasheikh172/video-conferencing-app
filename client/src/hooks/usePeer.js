import { useState, useEffect, useCallback, useContext } from 'react';
import { SocketContext } from '../context/SocketContext';
import webrtcService from '../services/webrtc';
import { SOCKET_EVENTS } from '../utils/constants';

const usePeer = (roomId, userName) => {
  const { socket } = useContext(SocketContext);
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await webrtcService.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Error initializing media:', error);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(
    (userId, socketId, initiator, stream) => {
      const peer = webrtcService.createPeer(
        initiator,
        stream,
        (signal) => {
          // Send signal to other peer
          if (initiator) {
            socket.emit(SOCKET_EVENTS.OFFER, {
              offer: signal,
              to: socketId,
            });
          } else {
            socket.emit(SOCKET_EVENTS.ANSWER, {
              answer: signal,
              to: socketId,
            });
          }
        },
        (remoteStream) => {
          // Received remote stream
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
                peer,
              },
            ];
          });
        },
        () => {
          // Peer closed
          removePeer(userId);
        }
      );

      webrtcService.addPeer(socketId, peer);
      return peer;
    },
    [socket]
  );

  // Remove peer
  const removePeer = useCallback((userId) => {
    setPeers((prevPeers) => {
      const peer = prevPeers.find((p) => p.userId === userId);
      if (peer) {
        webrtcService.removePeer(peer.socketId);
      }
      return prevPeers.filter((p) => p.userId !== userId);
    });
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    webrtcService.toggleAudio(newState);
    socket.emit(SOCKET_EVENTS.TOGGLE_AUDIO, {
      roomId,
      isEnabled: newState,
    });
  }, [isAudioEnabled, socket, roomId]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    webrtcService.toggleVideo(newState);
    socket.emit(SOCKET_EVENTS.TOGGLE_VIDEO, {
      roomId,
      isEnabled: newState,
    });
  }, [isVideoEnabled, socket, roomId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !localStream) return;

    // User joined
    socket.on(SOCKET_EVENTS.USER_JOINED, ({ userId, socketId }) => {
      createPeerConnection(userId, socketId, true, localStream);
    });

    // Receive offer
    socket.on(SOCKET_EVENTS.OFFER, ({ offer, from, userId }) => {
      const peer = createPeerConnection(userId, from, false, localStream);
      webrtcService.signalPeer(from, offer);
    });

    // Receive answer
    socket.on(SOCKET_EVENTS.ANSWER, ({ answer, from }) => {
      webrtcService.signalPeer(from, answer);
    });

    // Receive ICE candidate
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, ({ candidate, from }) => {
      webrtcService.signalPeer(from, candidate);
    });

    // User left
    socket.on(SOCKET_EVENTS.USER_LEFT, ({ userId }) => {
      removePeer(userId);
    });

    // Room users (initial)
    socket.on(SOCKET_EVENTS.ROOM_USERS, (users) => {
      users.forEach((user) => {
        if (user.socketId !== socket.id) {
          createPeerConnection(user.userId, user.socketId, true, localStream);
        }
      });
    });

    return () => {
      socket.off(SOCKET_EVENTS.USER_JOINED);
      socket.off(SOCKET_EVENTS.OFFER);
      socket.off(SOCKET_EVENTS.ANSWER);
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE);
      socket.off(SOCKET_EVENTS.USER_LEFT);
      socket.off(SOCKET_EVENTS.ROOM_USERS);
    };
  }, [socket, localStream, createPeerConnection, removePeer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      webrtcService.cleanup();
    };
  }, []);

  return {
    peers,
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    initializeMedia,
    toggleAudio,
    toggleVideo,
  };
};

export default usePeer;
