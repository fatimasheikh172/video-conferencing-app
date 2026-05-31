// Shared constants across client and server

export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // Room events
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  ROOM_USERS: 'room-users',

  // WebRTC signaling
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',

  // Media controls
  TOGGLE_AUDIO: 'toggle-audio',
  TOGGLE_VIDEO: 'toggle-video',
  USER_MEDIA_STATE: 'user-media-state',

  // Chat
  SEND_MESSAGE: 'send-message',
  RECEIVE_MESSAGE: 'receive-message',

  // Screen sharing
  START_SCREEN_SHARE: 'start-screen-share',
  STOP_SCREEN_SHARE: 'stop-screen-share',
};

export const USER_ROLES = {
  HOST: 'host',
  PARTICIPANT: 'participant',
  GUEST: 'guest',
};

export const ROOM_STATUS = {
  ACTIVE: 'active',
  ENDED: 'ended',
  WAITING: 'waiting',
};

export const MESSAGE_TYPES = {
  TEXT: 'text',
  SYSTEM: 'system',
  FILE: 'file',
};

export const MAX_PARTICIPANTS = 10;
export const MAX_MESSAGE_LENGTH = 500;
export const ROOM_ID_LENGTH = 8;
