import Peer from 'simple-peer';

// Google's public STUN servers
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

class WebRTCService {
  constructor() {
    this.peers = new Map(); // Map of peerId -> Peer instance
    this.localStream = null;
    this.screenStream = null;
  }

  // Get user media (camera and microphone)
  async getUserMedia(constraints = { video: true, audio: true }) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  // Get screen sharing stream with quality options
  async getDisplayMedia(quality = '1080p') {
    try {
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in this browser');
      }

      // Quality presets
      const qualitySettings = {
        '1080p': { width: 1920, height: 1080, frameRate: 30 },
        '720p': { width: 1280, height: 720, frameRate: 30 },
        '480p': { width: 854, height: 480, frameRate: 24 }
      };

      const videoConstraints = qualitySettings[quality] || qualitySettings['720p'];

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          ...videoConstraints
        },
        audio: false
      });

      this.screenStream = stream;

      // Listen for when user stops sharing via browser UI
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.log('Screen share ended by user');
          if (this.onScreenShareEnded) {
            this.onScreenShareEnded();
          }
        };
      }

      return stream;
    } catch (error) {
      console.error('Error accessing screen share:', error);

      // Handle specific errors
      if (error.name === 'NotAllowedError') {
        throw new Error('Screen sharing permission denied');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No screen available to share');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Screen sharing is not supported in this browser');
      }

      throw error;
    }
  }

  // Set callback for when screen share ends
  setScreenShareEndedCallback(callback) {
    this.onScreenShareEnded = callback;
  }

  // Create a peer connection
  createPeer(peerId, initiator, stream, callbacks = {}) {
    const { onSignal, onStream, onClose, onError, onConnect } = callbacks;

    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: {
        iceServers: ICE_SERVERS
      }
    });

    // Handle signaling data
    peer.on('signal', (signal) => {
      if (onSignal) onSignal(signal);
    });

    // Handle incoming stream
    peer.on('stream', (remoteStream) => {
      console.log(`Received stream from peer: ${peerId}`);
      if (onStream) onStream(remoteStream);
    });

    // Handle connection
    peer.on('connect', () => {
      console.log(`Connected to peer: ${peerId}`);
      if (onConnect) onConnect();
    });

    // Handle close
    peer.on('close', () => {
      console.log(`Connection closed with peer: ${peerId}`);
      if (onClose) onClose();
      this.removePeer(peerId);
    });

    // Handle errors
    peer.on('error', (error) => {
      console.error(`Peer error (${peerId}):`, error);
      if (onError) onError(error);
      this.removePeer(peerId);
    });

    // Store peer
    this.peers.set(peerId, peer);

    return peer;
  }

  // Signal a peer (send offer/answer/ice candidate)
  signalPeer(peerId, signal) {
    const peer = this.peers.get(peerId);
    if (peer && !peer.destroyed) {
      try {
        peer.signal(signal);
      } catch (error) {
        console.error(`Error signaling peer ${peerId}:`, error);
      }
    }
  }

  // Get peer
  getPeer(peerId) {
    return this.peers.get(peerId);
  }

  // Remove peer
  removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      try {
        if (!peer.destroyed) {
          peer.destroy();
        }
      } catch (error) {
        console.error(`Error destroying peer ${peerId}:`, error);
      }
      this.peers.delete(peerId);
    }
  }

  // Toggle audio track
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
      return true;
    }
    return false;
  }

  // Toggle video track
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
      return true;
    }
    return false;
  }

  // Replace video track (for screen sharing)
  async replaceVideoTrack(newStream, isScreenShare = false) {
    if (!this.localStream) return false;

    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) return false;

    const oldVideoTrack = this.localStream.getVideoTracks()[0];

    // Remove old track
    if (oldVideoTrack) {
      this.localStream.removeTrack(oldVideoTrack);
      oldVideoTrack.stop();
    }

    // Add new track
    this.localStream.addTrack(newVideoTrack);

    // Update all peer connections
    const updatePromises = [];
    this.peers.forEach((peer) => {
      if (!peer.destroyed && peer._pc) {
        const senders = peer._pc.getSenders();
        const videoSender = senders.find(sender =>
          sender.track && sender.track.kind === 'video'
        );

        if (videoSender) {
          updatePromises.push(
            videoSender.replaceTrack(newVideoTrack).catch(err => {
              console.error('Error replacing track:', err);
            })
          );
        }
      }
    });

    await Promise.all(updatePromises);

    // Store reference if it's screen share
    if (isScreenShare) {
      this.isScreenSharing = true;
    } else {
      this.isScreenSharing = false;
    }

    return true;
  }

  // Start screen sharing
  async startScreenShare(quality = '720p') {
    try {
      // Get screen stream
      const screenStream = await this.getDisplayMedia(quality);

      // Replace video track in all peer connections
      await this.replaceVideoTrack(screenStream, true);

      return screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  // Stop screen sharing and restore camera
  async stopScreenShare(cameraStream) {
    try {
      // Stop screen stream
      this.stopScreenStream();

      // Restore camera stream
      if (cameraStream) {
        await this.replaceVideoTrack(cameraStream, false);
      }

      this.isScreenSharing = false;
      return true;
    } catch (error) {
      console.error('Error stopping screen share:', error);
      throw error;
    }
  }

  // Stop screen stream
  stopScreenStream() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.screenStream = null;
    }
  }

  // Check if currently screen sharing
  getIsScreenSharing() {
    return this.isScreenSharing || false;
  }

  // Stop local stream
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }
  }

  // Stop screen sharing
  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.screenStream = null;
    }
  }

  // Get connection stats
  async getConnectionStats(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer || peer.destroyed) return null;

    try {
      const stats = await peer._pc.getStats();
      let quality = 'good';
      let bytesReceived = 0;
      let bytesSent = 0;
      let packetsLost = 0;

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          bytesReceived = report.bytesReceived || 0;
          packetsLost = report.packetsLost || 0;
        }
        if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
          bytesSent = report.bytesSent || 0;
        }
      });

      // Simple quality calculation based on packet loss
      if (packetsLost > 100) {
        quality = 'poor';
      } else if (packetsLost > 50) {
        quality = 'fair';
      }

      return {
        quality,
        bytesReceived,
        bytesSent,
        packetsLost
      };
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return null;
    }
  }

  // Clean up all connections
  cleanup() {
    console.log('Cleaning up WebRTC connections...');

    // Destroy all peers
    this.peers.forEach((peer, peerId) => {
      try {
        if (!peer.destroyed) {
          peer.destroy();
        }
      } catch (error) {
        console.error(`Error destroying peer ${peerId}:`, error);
      }
    });
    this.peers.clear();

    // Stop all tracks
    this.stopLocalStream();
    this.stopScreenShare();
  }

  // Get all active peer IDs
  getActivePeerIds() {
    return Array.from(this.peers.keys());
  }

  // Check if peer exists
  hasPeer(peerId) {
    return this.peers.has(peerId);
  }
}

// Export singleton instance
const webrtcService = new WebRTCService();
export default webrtcService;
