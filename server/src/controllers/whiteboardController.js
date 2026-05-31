const Whiteboard = require('../models/Whiteboard');
const Room = require('../models/Room');

// Get whiteboard state for a room
const getWhiteboardState = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check if room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is a participant
    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }

    // Get or create whiteboard
    let whiteboard = await Whiteboard.findOne({ roomId });

    if (!whiteboard) {
      whiteboard = await Whiteboard.create({
        roomId,
        canvasData: {},
        objects: [],
        lastModifiedBy: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      whiteboard: {
        roomId: whiteboard.roomId,
        canvasData: whiteboard.canvasData,
        objects: whiteboard.objects,
        version: whiteboard.version,
        lastModifiedAt: whiteboard.lastModifiedAt
      }
    });
  } catch (error) {
    console.error('Error getting whiteboard state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get whiteboard state',
      error: error.message
    });
  }
};

// Save whiteboard state
const saveWhiteboardState = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { canvasData, objects } = req.body;

    // Check if room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is a participant
    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }

    // Update or create whiteboard
    let whiteboard = await Whiteboard.findOne({ roomId });

    if (whiteboard) {
      whiteboard.canvasData = canvasData || whiteboard.canvasData;
      whiteboard.objects = objects || whiteboard.objects;
      whiteboard.version += 1;
      whiteboard.lastModifiedBy = req.user.id;
      await whiteboard.save();
    } else {
      whiteboard = await Whiteboard.create({
        roomId,
        canvasData: canvasData || {},
        objects: objects || [],
        lastModifiedBy: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Whiteboard saved successfully',
      version: whiteboard.version
    });
  } catch (error) {
    console.error('Error saving whiteboard state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save whiteboard state',
      error: error.message
    });
  }
};

// Clear whiteboard
const clearWhiteboard = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check if room exists
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Check if user is a participant
    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }

    // Clear whiteboard
    let whiteboard = await Whiteboard.findOne({ roomId });

    if (whiteboard) {
      whiteboard.canvasData = {};
      whiteboard.objects = [];
      whiteboard.version += 1;
      whiteboard.lastModifiedBy = req.user.id;
      await whiteboard.save();
    }

    res.status(200).json({
      success: true,
      message: 'Whiteboard cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing whiteboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear whiteboard',
      error: error.message
    });
  }
};

module.exports = {
  getWhiteboardState,
  saveWhiteboardState,
  clearWhiteboard
};
