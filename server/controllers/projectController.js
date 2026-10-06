const mongoose = require('mongoose');
const { validateProjectPlan, generateMultiStepPlan, askAssistantWithLLM } = require('../services/promptService');
const { sendIndividualTaskEmails } = require('../services/emailService');
const { AppError } = require('../middlewares/errorHandler');
const Project = require('../models/Project');

const generatePlan = async (req, res, next) => {
  try {
    const { projectName, description, experience, technology, deadline, teamMembers } = req.body;

    console.log(`Starting Multi-Step AI Workflow for "${projectName}"...`);

    const { plan, workflowSteps } = await generateMultiStepPlan({
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

const dispatchEmails = async (req, res, next) => {
  try {
    const { projectId, projectName, teamMembers, plan } = req.body;

    console.log(`📧 Dispatching task emails for "${projectName}"...`);

    const dispatches = await sendIndividualTaskEmails({
      teamMembers,
      projectName,
      planData: plan
    });

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

module.exports = {
  generatePlan,
  dispatchEmails,
  askAssistant
};
