const mongoose = require('mongoose');

const whiteboardSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  canvasData: {
    type: Object,
    default: {}
  },
  objects: {
    type: Array,
    default: []
  },
  version: {
    type: Number,
    default: 1
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastModifiedAt on save
whiteboardSchema.pre('save', function(next) {
  this.lastModifiedAt = new Date();
  next();
});

module.exports = mongoose.model('Whiteboard', whiteboardSchema);
