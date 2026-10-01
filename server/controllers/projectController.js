const mongoose = require('mongoose');
// const { ai } = require('../config/gemini');
const { validateProjectPlan, generateMultiStepPlan, askAssistantWithLLM } = require('../services/promptService');
const { sendIndividualTaskEmails } = require('../services/emailService');
const { AppError } = require('../middlewares/errorHandler');
const Project = require('../models/Project');

/**
 * 1. Generate & Persist Project Plan
 * POST /api/project/plan | POST /api/planner/generate
 */
const generatePlan = async (req, res, next) => {
  try {
    const { projectName, description, experience, technology, deadline, teamMembers } = req.body;

    console.log(`Starting Multi-Step AI Workflow for "${projectName}"...`);

    const { plan, workflowSteps } = await generateMultiStepPlan(null, {
      projectName,
      description,
      experience,
      technology,
      deadline,
      teamMembers
    });

    if (!validateProjectPlan(plan)) {
      console.error('Invalid AI plan structure generated:', plan);
      throw new AppError('Received malformed plan from AI. Please try again.', 502);
    }

    // Persist to MongoDB (graceful fallback if DB is not connected)
    let savedProject = null;
    if (mongoose.connection.readyState === 1) {
      try {
        savedProject = await Project.create({
          projectName,
          description,
          experience,
          technology,
          deadline,
          teamMembers,
          plan,
          workflowSteps,
          status: 'DRAFT'
        });
        console.log(`💾 Saved Project to MongoDB with ID: ${savedProject._id}`);
      } catch (dbErr) {
        console.warn('⚠️ Could not persist project to MongoDB:', dbErr.message);
      }
    }

    console.log('✅ Plan generated & validated successfully.');
    return res.status(200).json({
      success: true,
      projectId: savedProject?._id || null,
      plan,
      workflowSteps
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Dedicated Email Dispatch & Status Update
 * POST /api/project/send-emails | POST /api/planner/send-tasks
 */
const dispatchEmails = async (req, res, next) => {
  try {
    const { projectId, projectName, teamMembers, plan } = req.body;

    console.log(`📧 Dispatching task emails for "${projectName}"...`);

    const dispatches = await sendIndividualTaskEmails({
      teamMembers,
      projectName,
      planData: plan
    });

    // Update project status to DISPATCHED in MongoDB if valid ObjectId is provided
    if (projectId && mongoose.Types.ObjectId.isValid(projectId) && mongoose.connection.readyState === 1) {
      try {
        await Project.findByIdAndUpdate(projectId, {
          status: 'DISPATCHED',
          emailDispatches: dispatches.map(d => ({
            recipient: d.email || d.recipient,
            status: d.status,
            dispatchedAt: new Date()
          }))
        });
        console.log(`💾 Updated project ${projectId} status to DISPATCHED in MongoDB.`);
      } catch (dbErr) {
        console.warn('⚠️ Could not update project status in MongoDB:', dbErr.message);
      }
    }

    console.log(`✅ Email Tool completed. Dispatched to ${dispatches.length} members.`);
    return res.status(200).json({
      success: true,
      dispatches
    });
  } catch (error) {
    next(error);
  }
};

const { getSessionHistory } = require('../services/chatService');

/**
 * 3. AI Assistant Follow-Up Q&A
 * POST /api/project/assistant | POST /api/planner/ask
 */
const askAssistant = async (req, res, next) => {
  try {
    const {
      question,
      sessionId = 'session-default',
      projectId = null,
      projectContext,
      currentPlan,
      planContext,
      conversationHistory
    } = req.body;

    const activePlan = currentPlan || planContext || {};

    const result = await askAssistantWithLLM({
      question,
      sessionId,
      projectId,
      projectContext,
      activePlan,
      conversationHistory
    });

    return res.status(200).json({
      success: true,
      answer: result.answer,
      reply: result.answer,
      summary: result.summary,
      provider: result.provider
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get Chat Session History and Rolling Memory Summary
 * GET /api/project/chat/:sessionId
 */
const getChatSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const history = await getSessionHistory(sessionId);
    return res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Get Project History (List recent projects)
 * GET /api/project/history
 */
const getProjectHistory = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, count: 0, projects: [] });
    }

    const projects = await Project.find()
      .select('projectName description technology deadline status createdAt plan.totalEstimatedDays plan.estimatedTotalDays')
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Get Single Project Details by ID
 * GET /api/project/:id
 */
const getProjectById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      throw new AppError('Invalid Project ID format', 400);
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      throw new AppError('Project not found with the requested ID', 404);
    }

    return res.status(200).json({
      success: true,
      project
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generatePlan,
  dispatchEmails,
  askAssistant,
  getChatSession,
  getProjectHistory,
  getProjectById
};
