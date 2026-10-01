const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  generatePlan,
  dispatchEmails,
  askAssistant,
  getChatSession,
  getProjectHistory,
  getProjectById
} = require('../controllers/projectController');

const { validate } = require('../middlewares/validate');
const {
  generatePlanSchema,
  sendEmailsSchema,
  assistantSchema
} = require('../validations/projectValidation');

const router = express.Router();

// 1. Rate Limiting Middlewares (guards against API quota abuse while allowing smooth usage)
const planLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many plan generation requests. Please wait a few minutes before trying again.'
  }
});

const assistantLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 40 : 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many assistant queries. Please wait a moment before sending another message.'
  }
});

// 2. Define Endpoints with Middleware Chains & Aliases

// POST /plan & /generate
router.post(['/plan', '/generate'], planLimiter, validate(generatePlanSchema), generatePlan);

// POST /send-emails & /send-tasks
router.post(['/send-emails', '/send-tasks'], validate(sendEmailsSchema), dispatchEmails);

// POST /assistant & /ask
router.post(['/assistant', '/ask'], assistantLimiter, validate(assistantSchema), askAssistant);

// GET /chat/:sessionId (Fetch persistent chat history & memory summary)
router.get('/chat/:sessionId', getChatSession);

// GET /history
router.get('/history', getProjectHistory);

// GET /:id
router.get('/:id', getProjectById);

module.exports = router;

