import { create } from 'zustand';

const useMediaStore = create((set, get) => ({
  // State
  localStream: null,
  remoteStreams: new Map(), // Map<participantId, MediaStream>
  screenStream: null,
  isAudioEnabled: true,
  isVideoEnabled: true,
  isScreenSharing: false,
  selectedAudioDevice: null,
  selectedVideoDevice: null,
  audioDevices: [],
  videoDevices: [],
  audioLevel: 0,
  videoQuality: 'high', // 'low', 'medium', 'high'

  // Actions
  setLocalStream: (stream) => set({ localStream: stream }),

  addRemoteStream: (participantId, stream) => {
    const remoteStreams = new Map(get().remoteStreams);
    remoteStreams.set(participantId, stream);
    set({ remoteStreams });
  },

  removeRemoteStream: (participantId) => {
    const remoteStreams = new Map(get().remoteStreams);
    remoteStreams.delete(participantId);
    set({ remoteStreams });
  },

  setScreenStream: (stream) => set({ screenStream: stream }),

  toggleAudio: () => {
    const { localStream, isAudioEnabled } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isAudioEnabled;
      });
    }
    set({ isAudioEnabled: !isAudioEnabled });
  },

  toggleVideo: () => {
    const { localStream, isVideoEnabled } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !isVideoEnabled;
      });
    }
    set({ isVideoEnabled: !isVideoEnabled });
  },

  setAudioEnabled: (enabled) => {
    const { localStream } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
    set({ isAudioEnabled: enabled });
  },

  setVideoEnabled: (enabled) => {
    const { localStream } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
    set({ isVideoEnabled: enabled });
  },

  startScreenShare: async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      // Handle user stopping screen share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        get().stopScreenShare();
      };

      set({ screenStream: stream, isScreenSharing: true });
      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  },

  stopScreenShare: () => {
    const { screenStream } = get();
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }
    set({ screenStream: null, isScreenSharing: false });
  },

  initializeMedia: async (audioEnabled = true, videoEnabled = true) => {
    try {
      const constraints = {
        audio: audioEnabled,
        video: videoEnabled
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      set({
        localStream: stream,
        isAudioEnabled: audioEnabled,
        isVideoEnabled: videoEnabled,
      });

      // Enumerate devices
      await get().enumerateDevices();

      return stream;
    } catch (error) {
      console.log('Media initialization failed:', error.name, error.message);

      // Handle specific permission errors silently
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        // User denied permission - this is expected behavior, not an error
        console.log('User denied camera/microphone access - joining without media');
        set({
          localStream: null,
          isAudioEnabled: false,
          isVideoEnabled: false,
        });

        // Return null to indicate no media but don't throw
        return null;
      }

      // For other errors (NotFoundError, etc), also allow joining without media
      console.log('Media not available - joining without media');
      set({
        localStream: null,
        isAudioEnabled: false,
        isVideoEnabled: false,
      });

      return null;
    }
  },

  enumerateDevices: async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter((d) => d.kind === 'audioinput');
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      set({ audioDevices, videoDevices });

      // Set default devices if not already set
      if (!get().selectedAudioDevice && audioDevices.length > 0) {
        set({ selectedAudioDevice: audioDevices[0].deviceId });
      }
      if (!get().selectedVideoDevice && videoDevices.length > 0) {
        set({ selectedVideoDevice: videoDevices[0].deviceId });
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
    }
  },

  switchAudioDevice: async (deviceId) => {
    try {
      const { localStream, isAudioEnabled } = get();
      if (localStream) {
        // Stop current audio track
        localStream.getAudioTracks().forEach((track) => track.stop());

        // Get new audio track
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        });

        const newAudioTrack = newStream.getAudioTracks()[0];
        newAudioTrack.enabled = isAudioEnabled;

        // Replace audio track
        const videoTrack = localStream.getVideoTracks()[0];
        const updatedStream = new MediaStream([newAudioTrack]);
        if (videoTrack) updatedStream.addTrack(videoTrack);

        set({ localStream: updatedStream, selectedAudioDevice: deviceId });
        return updatedStream;
      }
    } catch (error) {
      console.error('Error switching audio device:', error);
      throw error;
    }
  },

  switchVideoDevice: async (deviceId) => {
    try {
      const { localStream, isVideoEnabled } = get();
      if (localStream) {
        // Stop current video track
        localStream.getVideoTracks().forEach((track) => track.stop());

        // Get new video track
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        newVideoTrack.enabled = isVideoEnabled;

        // Replace video track
        const audioTrack = localStream.getAudioTracks()[0];
        const updatedStream = new MediaStream([newVideoTrack]);
        if (audioTrack) updatedStream.addTrack(audioTrack);

        set({ localStream: updatedStream, selectedVideoDevice: deviceId });
        return updatedStream;
      }
    } catch (error) {
      console.error('Error switching video device:', error);
      throw error;
    }
  },

  setAudioLevel: (level) => set({ audioLevel: level }),

  setVideoQuality: (quality) => set({ videoQuality: quality }),

  cleanup: () => {
    const { localStream, screenStream, remoteStreams } = get();

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Stop screen stream
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }

    // Stop remote streams
    remoteStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });

    set({
      localStream: null,
      screenStream: null,
      remoteStreams: new Map(),
      isAudioEnabled: true,
      isVideoEnabled: true,
      isScreenSharing: false,
      audioLevel: 0,
    });
  },
}));

export default useMediaStore;
