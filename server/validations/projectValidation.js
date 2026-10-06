const { z } = require('zod');

const teamMemberSchema = z.object({
  name: z.string().min(1, 'Member name is required'),
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Member role is required'),
  skills: z.array(z.string()).optional().default([]),
  activeTasksCount: z.number().int().min(0).max(3, 'Active tasks count cannot exceed 3').optional().default(0),
  isOnLeave: z.boolean().optional().default(false)
});

const deadlineSchema = z.preprocess(
  (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
  z.coerce.number().int().positive('Deadline must be a positive number of days').optional().default(14)
);

const generatePlanSchema = z.object({
  projectName: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().min(5, 'Project description must be at least 5 characters'),
  experience: z.string().optional().default('Intermediate'),
  technology: z.string().optional().default('MERN'),
  deadline: deadlineSchema,
  teamMembers: z.array(teamMemberSchema).optional().default([])
});

const sendEmailsSchema = z.object({
  projectId: z.string().optional(),
  projectName: z.string().min(1, 'Project name is required'),
  teamMembers: z.array(teamMemberSchema).min(1, 'At least one team member is required'),
  plan: z.object({
    phases: z.array(z.any()).min(1, 'Plan must contain phases')
  })
});

const assistantSchema = z.object({
  sessionId: z.string().optional(),
  projectId: z.string().optional().nullable(),
  question: z.string().min(1, 'Question cannot be empty'),
  projectContext: z.object({
    projectName: z.string().optional().default('Project'),
    technology: z.string().optional().default('N/A'),
    experience: z.string().optional().default('Intermediate'),
    deadline: deadlineSchema
  }),
  currentPlan: z.record(z.any(), { message: 'Current plan object is required' }),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'model']),
      text: z.string()
    })
  ).optional().default([])
});

module.exports = {
  generatePlanSchema,
  sendEmailsSchema,
  assistantSchema
};
