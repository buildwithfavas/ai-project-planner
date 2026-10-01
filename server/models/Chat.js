const mongoose = require('mongoose');

// Sub-schema for individual chat messages in a thread
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Main Chat / Conversation Model
const chatSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    index: true,
    default: null
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: [messageSchema],
  summary: {
    type: String,
    default: '',
    trim: true
  },
  messageCount: {
    type: Number,
    default: 0
  },
  lastSummarizedCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for fast queries by session or project
chatSchema.index({ sessionId: 1, updatedAt: -1 });
chatSchema.index({ projectId: 1, updatedAt: -1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
