import React, { useState, useEffect } from 'react';

const ControlBar = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeaveRoom,
  onToggleParticipants,
  participantCount,
  volume,
  onVolumeChange,
  isScreenSharing,
  onToggleScreenShare,
  screenShareUser,
  onToggleFiles,
  onToggleWhiteboard
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showScreenShareMenu, setShowScreenShareMenu] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 py-4 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Left side - Media controls */}
          <div className="flex items-center space-x-3">
            {/* Audio toggle */}
            <button
              onClick={onToggleAudio}
              className={`p-4 rounded-full transition-all duration-200 ${
                isAudioEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioEnabled ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              )}
            </button>

            {/* Video toggle */}
            <button
              onClick={onToggleVideo}
              className={`p-4 rounded-full transition-all duration-200 ${
                isVideoEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              )}
            </button>

            {/* Volume control */}
            <div className="relative">
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200"
                title="Volume control"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </button>

              {/* Volume slider */}
              {showVolumeSlider && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 rounded-lg p-4 shadow-xl">
                  <div className="flex flex-col items-center space-y-2">
                    <span className="text-white text-sm font-medium">{Math.round(volume * 100)}%</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="w-32 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                      style={{
                        writingMode: 'bt-lr',
                        WebkitAppearance: 'slider-vertical',
                        height: '100px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Screen share toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  if (isScreenSharing) {
                    onToggleScreenShare(false);
                  } else if (screenShareUser) {
                    // Someone else is sharing
                    setShowScreenShareMenu(false);
                  } else {
                    setShowScreenShareMenu(!showScreenShareMenu);
                  }
                }}
                className={`p-4 rounded-full transition-all duration-200 ${
                  isScreenSharing
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : screenShareUser
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title={
                  isScreenSharing
                    ? 'Stop sharing screen'
                    : screenShareUser
                    ? `${screenShareUser.userName} is sharing`
                    : 'Share screen'
                }
                disabled={screenShareUser && !isScreenSharing}
              >
                {isScreenSharing ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>

              {/* Screen share quality menu */}
              {showScreenShareMenu && !screenShareUser && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-800 rounded-lg p-3 shadow-xl min-w-[160px]">
                  <p className="text-white text-xs font-medium mb-2">Select Quality</p>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        onToggleScreenShare(true, '1080p');
                        setShowScreenShareMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded transition-colors"
                    >
                      1080p (High)
                    </button>
                    <button
                      onClick={() => {
                        onToggleScreenShare(true, '720p');
                        setShowScreenShareMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded transition-colors"
                    >
                      720p (Medium)
                    </button>
                    <button
                      onClick={() => {
                        onToggleScreenShare(true, '480p');
                        setShowScreenShareMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 rounded transition-colors"
                    >
                      480p (Low)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center - Room info */}
          <div className="hidden md:flex items-center space-x-4 text-white">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Live</span>
            </div>
            <div className="text-sm text-gray-400">
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-3">
            {/* Whiteboard toggle */}
            <button
              onClick={onToggleWhiteboard}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200"
              title="Whiteboard"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </button>

            {/* Files toggle */}
            <button
              onClick={onToggleFiles}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200"
              title="Files"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </button>

            {/* Participants list toggle */}
            <button
              onClick={onToggleParticipants}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200 relative"
              title="Show participants"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              {participantCount > 1 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {participantCount}
                </span>
              )}
            </button>

            {/* Leave room */}
            <button
              onClick={onLeaveRoom}
              className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium transition-all duration-200 flex items-center space-x-2"
              title="Leave room"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlBar;
