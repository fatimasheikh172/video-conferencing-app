import React, { useEffect, useRef } from 'react';
import useRoomStore from '../../store/roomStore';
import useMediaStore from '../../store/mediaStore';
import useUIStore from '../../store/uiStore';

const VideoGrid = ({ roomId }) => {
  const { participants, localParticipant } = useRoomStore();
  const { localStream, remoteStreams, isVideoEnabled } = useMediaStore();
  const { layout, isMobile } = useUIStore();

  const localVideoRef = useRef(null);

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const allParticipants = localParticipant ? [localParticipant, ...participants] : participants;

  // Calculate grid layout
  const getGridClass = () => {
    const count = allParticipants.length;
    if (layout === 'speaker') return 'grid-cols-1';
    if (isMobile) return 'grid-cols-1';
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className={`grid ${getGridClass()} gap-4 h-full`}>
        {/* Local Video */}
        {localParticipant && (
          <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-semibold text-white">
                    {localParticipant.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            )}
            {/* Name Badge */}
            <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-lg flex items-center space-x-2">
              <span className="text-sm font-medium text-white">
                You
              </span>
              {!localParticipant.isAudioEnabled && (
                <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Remote Videos */}
        {participants.map((participant) => (
          <RemoteVideo
            key={participant.id}
            participant={participant}
            stream={remoteStreams.get(participant.id)}
          />
        ))}

        {/* Empty State */}
        {allParticipants.length === 0 && (
          <div className="col-span-full flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">
                Waiting for others to join...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const RemoteVideo = ({ participant, stream }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
      {stream && participant.isVideoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-3xl font-semibold text-white">
              {participant.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      )}

      {/* Name Badge */}
      <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/60 backdrop-blur-sm rounded-lg flex items-center space-x-2">
        <span className="text-sm font-medium text-white">
          {participant.name}
        </span>
        {!participant.isAudioEnabled && (
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Connection Quality Indicator */}
      <div className="absolute top-3 right-3">
        <div className="flex space-x-1">
          <div className="w-1 h-3 bg-green-500 rounded"></div>
          <div className="w-1 h-4 bg-green-500 rounded"></div>
          <div className="w-1 h-5 bg-green-500 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default VideoGrid;
