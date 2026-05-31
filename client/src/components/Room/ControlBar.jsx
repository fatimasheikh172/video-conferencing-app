import React from 'react';
import useUIStore from '../../store/uiStore';

const ControlBar = ({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onToggleWhiteboard,
  onToggleFiles,
  onLeaveRoom,
  activePanel,
}) => {
  const { isMobile } = useUIStore();

  const ControlButton = ({ onClick, active, disabled, danger, children, title, shortcut }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative group flex flex-col items-center justify-center p-3 rounded-lg transition-all ${
        danger
          ? 'bg-red-600 hover:bg-red-700 text-white'
          : active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={title}
    >
      {children}
      {shortcut && !isMobile && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          {title} ({shortcut})
        </span>
      )}
    </button>
  );

  return (
    <div className="h-20 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-4 md:px-6">
      {/* Left Section - Media Controls */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Microphone */}
        <ControlButton
          onClick={onToggleAudio}
          active={!isAudioEnabled}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
          shortcut="M"
        >
          {isAudioEnabled ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
          {!isMobile && (
            <span className="text-xs mt-1">{isAudioEnabled ? 'Mute' : 'Unmute'}</span>
          )}
        </ControlButton>

        {/* Camera */}
        <ControlButton
          onClick={onToggleVideo}
          active={!isVideoEnabled}
          title={isVideoEnabled ? 'Stop video' : 'Start video'}
          shortcut="V"
        >
          {isVideoEnabled ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
          {!isMobile && (
            <span className="text-xs mt-1">{isVideoEnabled ? 'Stop' : 'Start'}</span>
          )}
        </ControlButton>
      </div>

      {/* Center Section - Feature Controls */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Screen Share */}
        <ControlButton
          onClick={onToggleScreenShare}
          active={isScreenSharing}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          shortcut="S"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {!isMobile && <span className="text-xs mt-1">Share</span>}
        </ControlButton>

        {/* Participants */}
        <ControlButton
          onClick={onToggleParticipants}
          active={activePanel === 'participants'}
          title="Participants"
          shortcut="P"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          {!isMobile && <span className="text-xs mt-1">People</span>}
        </ControlButton>

        {/* Chat */}
        <ControlButton
          onClick={onToggleChat}
          active={activePanel === 'chat'}
          title="Chat"
          shortcut="C"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {!isMobile && <span className="text-xs mt-1">Chat</span>}
        </ControlButton>

        {/* Whiteboard */}
        <ControlButton
          onClick={onToggleWhiteboard}
          active={activePanel === 'whiteboard'}
          title="Whiteboard"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          {!isMobile && <span className="text-xs mt-1">Board</span>}
        </ControlButton>

        {/* Files */}
        <ControlButton
          onClick={onToggleFiles}
          active={activePanel === 'files'}
          title="Files"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          {!isMobile && <span className="text-xs mt-1">Files</span>}
        </ControlButton>
      </div>

      {/* Right Section - Leave Button */}
      <div className="flex items-center">
        <ControlButton
          onClick={onLeaveRoom}
          danger={true}
          title="Leave room"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isMobile && <span className="text-xs mt-1">Leave</span>}
        </ControlButton>
      </div>
    </div>
  );
};

export default ControlBar;
