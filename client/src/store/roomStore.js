import { create } from 'zustand';

const useRoomStore = create((set, get) => ({
  // State
  roomId: null,
  roomName: null,
  participants: [],
  localParticipant: null,
  isHost: false,
  roomSettings: {
    maxParticipants: 50,
    allowScreenShare: true,
    allowChat: true,
    allowFileShare: true,
    allowWhiteboard: true,
    isLocked: false,
    waitingRoomEnabled: false,
  },
  waitingRoom: [],

  // Actions
  setRoomId: (roomId) => set({ roomId }),

  setRoomName: (roomName) => set({ roomName }),

  joinRoom: (roomId, roomName, user) => {
    set({
      roomId,
      roomName,
      localParticipant: {
        id: user.id,
        name: user.name,
        email: user.email,
        isHost: false,
        joinedAt: new Date(),
      },
    });
  },

  leaveRoom: () => {
    set({
      roomId: null,
      roomName: null,
      participants: [],
      localParticipant: null,
      isHost: false,
      waitingRoom: [],
    });
  },

  addParticipant: (participant) => {
    set((state) => ({
      participants: [...state.participants, participant],
    }));
  },

  removeParticipant: (participantId) => {
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== participantId),
    }));
  },

  updateParticipant: (participantId, updates) => {
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, ...updates } : p
      ),
    }));
  },

  setParticipants: (participants) => set({ participants }),

  setIsHost: (isHost) => set({ isHost }),

  updateRoomSettings: (settings) => {
    set((state) => ({
      roomSettings: { ...state.roomSettings, ...settings },
    }));
  },

  addToWaitingRoom: (participant) => {
    set((state) => ({
      waitingRoom: [...state.waitingRoom, participant],
    }));
  },

  removeFromWaitingRoom: (participantId) => {
    set((state) => ({
      waitingRoom: state.waitingRoom.filter((p) => p.id !== participantId),
    }));
  },

  admitFromWaitingRoom: (participantId) => {
    const { waitingRoom, participants } = get();
    const participant = waitingRoom.find((p) => p.id === participantId);
    if (participant) {
      set({
        participants: [...participants, participant],
        waitingRoom: waitingRoom.filter((p) => p.id !== participantId),
      });
    }
  },

  getParticipantCount: () => {
    return get().participants.length + (get().localParticipant ? 1 : 0);
  },

  getParticipantById: (participantId) => {
    const { participants, localParticipant } = get();
    if (localParticipant?.id === participantId) return localParticipant;
    return participants.find((p) => p.id === participantId);
  },
}));

export default useRoomStore;
