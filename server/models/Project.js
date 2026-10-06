const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  taskId: { type: String },
  title: { type: String },
  description: { type: String },
  assignedTo: { type: String },
  assignedToEmail: { type: String },
  assignedName: { type: String },
  assignedRole: { type: String },
  assignmentReason: { type: String },
  estimatedHours: { type: Number, default: 8 },
  priority: { type: String, default: 'Medium' },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
    default: 'PENDING'
  }
}, { _id: false, strict: false });

const phaseSchema = new mongoose.Schema({
  phaseNumber: { type: Number },
  phase: { type: Number },
  phaseName: { type: String },
  name: { type: String },
  durationDays: { type: Number, default: 7 },
  tasks: [taskSchema]
}, { _id: false, strict: false });

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    index: true
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
    projectOverview: String,
    complexity: String,
    estimatedTotalDays: Number,
    totalEstimatedDays: Number,
    phases: [phaseSchema],
    risks: [String],
    testingPlan: [String],
    deadlineWarning: String
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
    index: true
  },
  emailDispatches: [{
    recipient: String,
    dispatchedAt: { type: Date, default: Date.now },
    status: String
  }]
}, {
  timestamps: true
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
