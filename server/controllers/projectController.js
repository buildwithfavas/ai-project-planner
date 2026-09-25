const { ai } = require('../config/gemini');
const { validateProjectPlan, generateMultiStepPlan, ASSISTANT_MODEL } = require('../services/promptService');
const { sendIndividualTaskEmails } = require('../services/emailService');
const { AppError } = require('../middlewares/errorHandler');
const Project = require('../models/Project');

/**
 * 1. Generate & Persist Project Plan
 * POST /api/project/plan
 */
const generatePlan = async (req, res, next) => {
  try {
    const { projectName, description, experience, technology, deadline, teamMembers } = req.body;

    console.log(`Starting Multi-Step AI Workflow for "${projectName}"...`);

    const { plan, workflowSteps } = await generateMultiStepPlan(ai, {
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

    // Persist to MongoDB (gracefully handles if DB is in offline/fallback mode)
    let savedProject = null;
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
      console.warn('⚠️ Could not persist to MongoDB:', dbErr.message);
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
 * POST /api/project/send-emails
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

    // Update project status to DISPATCHED in MongoDB if projectId is provided
    if (projectId) {
      try {
        await Project.findByIdAndUpdate(projectId, {
          status: 'DISPATCHED',
          emailDispatches: dispatches.map(d => ({
            recipient: d.recipient,
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

/**
 * 3. AI Assistant Follow-Up Q&A
 * POST /api/project/assistant
 */
const askAssistant = async (req, res, next) => {
  try {
    const { question, projectContext, currentPlan, conversationHistory } = req.body;

    let historyText = '';
    if (conversationHistory && conversationHistory.length > 0) {
      historyText = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
        .join('\n');
    }

    const assistantPrompt = `PROJECT CONTEXT:
Project Name: ${projectContext.projectName}
Technology: ${projectContext.technology}
Experience Level: ${projectContext.experience}
Deadline: ${projectContext.deadline} days

CURRENT PROJECT PLAN:
${JSON.stringify(currentPlan, null, 2)}

CONVERSATION HISTORY:
${historyText || 'No previous conversation.'}

USER QUESTION:
${question}`;

    const assistantSystemPrompt = `You are a helpful AI project planning assistant. 
The developer has already generated a project plan and is now asking follow-up questions.
Use the project context, current plan, and conversation history to give specific, practical answers.
Keep answers concise and actionable.`;

    const response = await ai.models.generateContent({
      model: ASSISTANT_MODEL,
      contents: assistantPrompt,
      config: {
        systemInstruction: assistantSystemPrompt,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 2000,
      },
    });

    return res.status(200).json({
      success: true,
      answer: response.text
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. Get Project History (List recent projects)
 * GET /api/project/history
 */
const getProjectHistory = async (req, res, next) => {
  try {
    const projects = await Project.find()
      .select('projectName description technology deadline status createdAt plan.totalEstimatedDays')
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
 * 5. Get Single Project Details by ID
 * GET /api/project/:id
 */
const getProjectById = async (req, res, next) => {
  try {
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
  getProjectHistory,
  getProjectById
};
