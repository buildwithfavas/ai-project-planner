const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  generatePlan,
  dispatchEmails,
  askAssistant
} = require('../controllers/projectController');

const { validate } = require('../middlewares/validate');
const {
  generatePlanSchema,
  sendEmailsSchema,
  assistantSchema
} = require('../validations/projectValidation');

const router = express.Router();

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

router.post('/plan', planLimiter, validate(generatePlanSchema), generatePlan);
router.post('/send-emails', validate(sendEmailsSchema), dispatchEmails);
router.post('/assistant', assistantLimiter, validate(assistantSchema), askAssistant);
// router.get('/chat/:sessionId', getChatSession);
// router.get('/history', getProjectHistory);
// router.get('/:id', getProjectById);

module.exports = router;