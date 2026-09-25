const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  generatePlan,
  dispatchEmails,
  askAssistant,
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

// 1. Rate Limiting Middlewares (guards against API quota exhaustion)
const planLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // Matches API quota - each plan uses 3-5 API calls
  message: {
    success: false,
    error: 'Daily plan generation limit reached (3/day). Please try again tomorrow.'
  }
});

const assistantLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5, // Matches API quota - each question uses 1 API call
  message: {
    success: false,
    error: 'Daily assistant query limit reached (5/day). Please try again tomorrow.'
  }
});

// 2. Define Endpoints with Middleware Chains

// POST /api/project/plan
router.post('/plan', planLimiter, validate(generatePlanSchema), generatePlan);

// POST /api/project/send-emails
router.post('/send-emails', validate(sendEmailsSchema), dispatchEmails);

// POST /api/project/assistant
router.post('/assistant', assistantLimiter, validate(assistantSchema), askAssistant);



// GET /api/project/history
router.get('/history', getProjectHistory);

// GET /api/project/:id
router.get('/:id', getProjectById);


module.exports = router;
