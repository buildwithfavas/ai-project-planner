const mongoose = require('mongoose');

// Sub-schema for individual tasks within a phase
const taskSchema = new mongoose.Schema({
  taskId: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  assignedToEmail: { type: String },
  assignedName: { type: String },
  assignedRole: { type: String },
  assignmentReason: { type: String }, // Explainable AI (XAI)
  estimatedHours: { type: Number, default: 8 },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
    default: 'PENDING'
  }
}, { _id: false });

// Sub-schema for phases
const phaseSchema = new mongoose.Schema({
  phaseNumber: { type: Number },
  phaseName: { type: String, required: true },
  durationDays: { type: Number, default: 7 },
  tasks: [taskSchema]
}, { _id: false });

// Main Project Schema
const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    index: true // Indexed for fast searches by name
  },
  description: {
    type: String,
    required: [true, 'Project description is required']
  },
  experience: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Intermediate'
  },
  technology: {
    type: String,
    default: 'MERN Stack'
  },
  deadline: {
    type: Number,
    required: true
  },
  teamMembers: [{
    name: String,
    email: String,
    role: String,
    skills: [String],
    activeTasksCount: { type: Number, default: 0 },
    isOnLeave: { type: Boolean, default: false }
  }],
  plan: {
    phases: [phaseSchema],
    totalEstimatedDays: Number
  },
  workflowSteps: [{
    step: Number,
    agent: String,
    status: String,
    details: mongoose.Schema.Types.Mixed
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'APPROVED', 'DISPATCHED'],
    default: 'DRAFT',
    index: true // Indexed for filtering active vs dispatched projects
  },
  emailDispatches: [{
    recipient: String,
    dispatchedAt: { type: Date, default: Date.now },
    status: String
  }]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
