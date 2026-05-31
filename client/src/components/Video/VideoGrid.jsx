import React from 'react';

const VideoGrid = ({ children, participantCount }) => {
  // Determine grid layout based on participant count
  const getGridClass = () => {
    if (participantCount === 1) {
      return 'grid-cols-1';
    } else if (participantCount === 2) {
      return 'grid-cols-1 md:grid-cols-2';
    } else if (participantCount <= 4) {
      return 'grid-cols-1 md:grid-cols-2';
    } else {
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  return (
    <div className={`grid ${getGridClass()} gap-4 w-full h-full p-4 auto-rows-fr`}>
      {children}
    </div>
  );
};

export default VideoGrid;
