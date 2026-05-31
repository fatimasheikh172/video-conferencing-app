import React, { useRef, useEffect, useState } from 'react';

const VideoTile = ({
  stream,
  userName,
  isLocal = false,
  isAudioEnabled = true,
  isVideoEnabled = true,
  connectionQuality = 'good',
  isScreenSharing = false
}) => {
  const videoRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play().catch(err => {
          console.error('Error playing video:', err);
        });
        setIsVideoPlaying(true);
      };
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  // Handle picture-in-picture toggle
  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Error toggling picture-in-picture:', error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Get connection quality color
  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'good':
        return 'bg-green-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'poor':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div ref={containerRef} className="relative bg-gray-900 rounded-lg overflow-hidden shadow-lg aspect-video group">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full ${isScreenSharing ? 'object-contain' : 'object-cover'} ${!isVideoEnabled ? 'hidden' : ''}`}
      />

      {/* No video placeholder */}
      {!isVideoEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <p className="text-gray-400 text-sm font-medium">{userName}</p>
          </div>
        </div>
      )}

      {/* Screen share indicator badge */}
      {isScreenSharing && (
        <div className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>SCREEN SHARING</span>
        </div>
      )}

      {/* User name overlay */}
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-2">
        <span>{userName}</span>
        {isLocal && <span className="text-xs text-gray-300">(You)</span>}
      </div>

      {/* Audio indicator */}
      {!isAudioEnabled && (
        <div className="absolute top-2 right-2 bg-red-600 bg-opacity-90 text-white p-2 rounded-full">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
        </div>
      )}

      {/* Connection quality indicator (only show if not screen sharing) */}
      {!isScreenSharing && (
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${getQualityColor()}`}></div>
          <div className={`w-2 h-3 rounded-sm ${connectionQuality !== 'poor' ? getQualityColor() : 'bg-gray-600'}`}></div>
          <div className={`w-2 h-4 rounded-sm ${connectionQuality === 'good' ? getQualityColor() : 'bg-gray-600'}`}></div>
        </div>
      )}

      {/* Control buttons (show on hover for remote streams) */}
      {!isLocal && isVideoPlaying && (
        <div className="absolute top-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded-full transition-all"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            )}
          </button>

          {/* Picture-in-picture button */}
          <button
            onClick={togglePictureInPicture}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded-full transition-all"
            title="Picture-in-picture"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {!isVideoPlaying && isVideoEnabled && stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
};

export default VideoTile;
