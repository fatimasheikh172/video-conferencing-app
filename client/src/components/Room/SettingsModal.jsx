import React, { useState } from 'react';
import useMediaStore from '../../store/mediaStore';
import useUIStore from '../../store/uiStore';
import useRoomStore from '../../store/roomStore';

const SettingsModal = ({ onClose }) => {
  const {
    audioDevices,
    videoDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    switchAudioDevice,
    switchVideoDevice,
    videoQuality,
    setVideoQuality,
  } = useMediaStore();
  const { layout, setLayout } = useUIStore();
  const { roomSettings, updateRoomSettings, isHost } = useRoomStore();

  const [activeTab, setActiveTab] = useState('media');

  const handleAudioDeviceChange = async (deviceId) => {
    try {
      await switchAudioDevice(deviceId);
    } catch (error) {
      console.error('Error switching audio device:', error);
    }
  };

  const handleVideoDeviceChange = async (deviceId) => {
    try {
      await switchVideoDevice(deviceId);
    } catch (error) {
      console.error('Error switching video device:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('media')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === 'media'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Media Devices
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === 'video'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Video Settings
          </button>
          {isHost && (
            <button
              onClick={() => setActiveTab('room')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition ${
                activeTab === 'room'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Room Settings
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Media Devices Tab */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* Microphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Microphone
                </label>
                <select
                  value={selectedAudioDevice || ''}
                  onChange={(e) => handleAudioDeviceChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {audioDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Camera
                </label>
                <select
                  value={selectedVideoDevice || ''}
                  onChange={(e) => handleVideoDeviceChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {videoDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Video Settings Tab */}
          {activeTab === 'video' && (
            <div className="space-y-6">
              {/* Video Quality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video Quality
                </label>
                <select
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low (360p)</option>
                  <option value="medium">Medium (720p)</option>
                  <option value="high">High (1080p)</option>
                </select>
              </div>

              {/* Layout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video Layout
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setLayout('grid')}
                    className={`p-4 border-2 rounded-lg transition ${
                      layout === 'grid'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      <div className="h-4 bg-gray-400 rounded"></div>
                      <div className="h-4 bg-gray-400 rounded"></div>
                      <div className="h-4 bg-gray-400 rounded"></div>
                      <div className="h-4 bg-gray-400 rounded"></div>
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">Grid</span>
                  </button>

                  <button
                    onClick={() => setLayout('speaker')}
                    className={`p-4 border-2 rounded-lg transition ${
                      layout === 'speaker'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div className="space-y-1 mb-2">
                      <div className="h-8 bg-gray-400 rounded"></div>
                      <div className="h-2 bg-gray-400 rounded"></div>
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">Speaker</span>
                  </button>

                  <button
                    onClick={() => setLayout('sidebar')}
                    className={`p-4 border-2 rounded-lg transition ${
                      layout === 'sidebar'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex gap-1 mb-2">
                      <div className="flex-1 h-10 bg-gray-400 rounded"></div>
                      <div className="w-3 space-y-1">
                        <div className="h-2 bg-gray-400 rounded"></div>
                        <div className="h-2 bg-gray-400 rounded"></div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300">Sidebar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Room Settings Tab (Host only) */}
          {activeTab === 'room' && isHost && (
            <div className="space-y-6">
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lock Room
                  </span>
                  <input
                    type="checkbox"
                    checked={roomSettings.isLocked}
                    onChange={(e) => updateRoomSettings({ isLocked: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Waiting Room
                  </span>
                  <input
                    type="checkbox"
                    checked={roomSettings.waitingRoomEnabled}
                    onChange={(e) => updateRoomSettings({ waitingRoomEnabled: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Allow Screen Share
                  </span>
                  <input
                    type="checkbox"
                    checked={roomSettings.allowScreenShare}
                    onChange={(e) => updateRoomSettings({ allowScreenShare: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Allow Chat
                  </span>
                  <input
                    type="checkbox"
                    checked={roomSettings.allowChat}
                    onChange={(e) => updateRoomSettings({ allowChat: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Allow File Sharing
                  </span>
                  <input
                    type="checkbox"
                    checked={roomSettings.allowFileShare}
                    onChange={(e) => updateRoomSettings({ allowFileShare: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Allow Whiteboard
                  </span>
                  <input
                    type="checkbox"
                    checked={roomSettings.allowWhiteboard}
                    onChange={(e) => updateRoomSettings({ allowWhiteboard: e.target.checked })}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
