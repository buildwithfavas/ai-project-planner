
const { retrieveRelevantPolicies } = require('./ragService');
const fs = require('fs');
const path = require('path');

// ============================================================
// 🤖 MODEL SELECTION & RESILIENT FALLBACK STRATEGY
// Uses primary model with automatic failover to flash-lite variants.
// Configured with zero-budget thinking for ultra-fast, structured JSON.
// ============================================================
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const CANDIDATE_MODELS = [
  DEFAULT_MODEL,
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite'
].filter((m, idx, arr) => arr.indexOf(m) === idx);

const PLANNER_MODEL = CANDIDATE_MODELS;
const EXECUTOR_MODEL = CANDIDATE_MODELS;
const VALIDATOR_MODEL = CANDIDATE_MODELS;
const ASSISTANT_MODEL = DEFAULT_MODEL;

// ============================================================
// 📊 DEBUGGING & ERROR CATEGORIZATION
// ============================================================
const ERROR_CATEGORIES = {
  PROMPT_ISSUE: 'prompt_issue',
  CONTEXT_ISSUE: 'context_issue', 
  LOGIC_ISSUE: 'logic_issue',
  API_ISSUE: 'api_issue',
  VALIDATION_ISSUE: 'validation_issue',
  TIMEOUT_ISSUE: 'timeout_issue'
};

function categorizeError(error, context) {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorStack = error.stack?.toLowerCase() || '';
  
  // API Issues
  if (errorMessage.includes('503') || errorMessage.includes('high demand') || 
      errorMessage.includes('unavailable') || errorMessage.includes('rate limit')) {
    return ERROR_CATEGORIES.API_ISSUE;
  }
  
  // Timeout Issues
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return ERROR_CATEGORIES.TIMEOUT_ISSUE;
  }
  
  // JSON Parsing Issues (often prompt-related)
  if (errorMessage.includes('json') || errorMessage.includes('parse') || 
      errorMessage.includes('unexpected token') || errorMessage.includes('syntax')) {
    return ERROR_CATEGORIES.PROMPT_ISSUE;
  }
  
  // Validation Issues
  if (errorMessage.includes('validation') || errorMessage.includes('invalid') ||
      errorMessage.includes('required') || errorMessage.includes('missing')) {
    return ERROR_CATEGORIES.VALIDATION_ISSUE;
  }
  
  // Context Issues (missing data, undefined references)
  if (errorMessage.includes('undefined') || errorMessage.includes('cannot read') ||
      errorMessage.includes('null') || errorMessage.includes('is not defined')) {
    return ERROR_CATEGORIES.CONTEXT_ISSUE;
  }
  
  // Default to logic issue
  return ERROR_CATEGORIES.LOGIC_ISSUE;
}

function logDebugEvent(event, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: event,
    details: details,
    category: details.error ? categorizeError(details.error, event) : 'info'
  };
  
  const logPath = path.join(__dirname, 'debug-logs.json');
  try {
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  } catch (err) {
    console.warn('Failed to write debug log:', err.message);
  }
}

// Improvement tracking
const improvementTracker = {
  metrics: {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    errorCategories: {}
  },
  
  recordRun(success, errorCategory = null) {
    this.metrics.totalRuns++;
    if (success) {
      this.metrics.successfulRuns++;
    } else {
      this.metrics.failedRuns++;
      if (errorCategory) {
        this.metrics.errorCategories[errorCategory] = 
          (this.metrics.errorCategories[errorCategory] || 0) + 1;
      }
    }
  },
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRuns > 0 
        ? (this.metrics.successfulRuns / this.metrics.totalRuns * 100).toFixed(1) + '%'
        : '0%',
      errorDistribution: this.metrics.errorCategories
    };
  },
  
  saveMetrics() {
    const metricsPath = path.join(__dirname, 'improvement-metrics.json');
    try {
      fs.writeFileSync(metricsPath, JSON.stringify(this.getMetrics(), null, 2));
    } catch (err) {
      console.warn('Failed to save improvement metrics:', err.message);
    }
  }
};

// System Prompts for Role-Based Agents
const PLANNER_SYSTEM_PROMPT = `You are the 🧠 PLANNER AGENT (Senior Software Architect).
Analyze the project details and return a JSON object defining the overall scope, architecture strategy, and feasibility assessment:
{
  "projectOverview": "Detailed architectural summary of project scope, core components, and tech strategy",
  "complexity": "Low | Medium | High",
  "deadlineFeasible": true,
  "suggestedDays": 30
}
Evaluate if the target deadline is realistic. Set deadlineFeasible to false and supply suggestedDays if it is unrealistic.`;

const EXECUTOR_SYSTEM_PROMPT = `You are the ⚙️ EXECUTOR AGENT & TASK DELEGATOR.
Based on the architecture strategy from the Planner Agent, break down the project into concrete development phases with tasks.

CRITICAL INSTRUCTIONS FOR ASSIGNMENTS:
1. Follow the RETRIEVED ASSIGNMENT POLICIES provided in the prompt.
2. Match tasks to developers based on their technical SKILLS and current WORKLOAD.
3. For EVERY task, provide:
   - "recommendedPackages": Array of 2-4 specific npm packages or tools best suited for this task (e.g. ["express", "cors", "dotenv", "mongoose"]).
   - "keyDeliverables": Array of 2-3 concrete, actionable technical deliverables/steps for the developer to execute.
   - "assignmentReason": Explaining why this developer was selected according to their skills and availability.

Return JSON:
{
  "estimatedTotalDays": 30,
  "phases": [
    {
      "name": "Phase 1: Architecture & Environment Setup",
      "tasks": [
        {
          "title": "Setup repository & configure tech stack",
          "recommendedPackages": ["express", "cors", "dotenv", "mongoose"],
          "keyDeliverables": [
            "Initialize Express app with security headers, CORS, and JSON body parser",
            "Establish MongoDB connection with retry logic and environment variables",
            "Configure basic health check and error-handling middleware"
          ],
          "estimatedDays": 2,
          "priority": "High",
          "deadlineDay": 2,
          "assignedToEmail": "developer@email.com",
          "assignedName": "Developer Name",
          "assignedRole": "Frontend | Backend | Database | QA",
          "assignmentReason": "Assigned because of relevant React & Node skills with low active workload."
        }
      ]
    }
  ]
}`;



const VALIDATOR_SYSTEM_PROMPT = `You are the 🛡️ VALIDATOR AGENT (QA & Workload Lead).
Based on the project overview and delegated tasks generated by Planner and Executor agents, conduct a quality audit, verify workload balance across developers, and identify risks.
Return JSON:
{
  "workloadBalanced": true,
  "risks": [
    "Potential risk or workload bottleneck description"
  ],
  "testingPlan": [
    "Key testing step or QA validation item"
  ]
}`;

function safeParseJSON(text, agentName = 'AI Agent') {
  if (!text || typeof text !== 'string') {
    throw new Error(`${agentName} returned an empty or invalid response`);
  }
  let cleanText = text.trim();

  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ...)
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Attempt direct parse first
  try {
    return JSON.parse(cleanText);
  } catch (initialErr) {
    // If direct parse fails, try to extract first JSON object or array
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleanText.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch (subErr) {
        // Fall through
      }
    }
    console.error(`❌ Failed to parse ${agentName} output as JSON. Raw output:`, cleanText);
    throw initialErr;
  }
}

function validateProjectPlan(plan) {
  // Existing checks
  if (!plan || typeof plan !== 'object') return false;
  if (!plan.projectOverview || typeof plan.projectOverview !== 'string') return false;
  if (!plan.complexity || typeof plan.complexity !== 'string') return false;
  if (!plan.phases || !Array.isArray(plan.phases) || plan.phases.length === 0) return false;
  
  // NEW: Minimum length checks
  if (plan.projectOverview.length < 50) {
    console.warn('Project overview too short:', plan.projectOverview.length);
    return false;
  }
  
  // NEW: Check each phase has adequate content
  for (const phase of plan.phases) {
    if (!phase.name || phase.name.length < 5) {
      console.warn('Phase name too short');
      return false;
    }
    
    if (!phase.tasks || phase.tasks.length < 1) {
      console.warn('Phase has insufficient tasks:', phase.tasks?.length);
      return false;
    }
  }
  
  return true;
}





function validateContentQuality(plan, teamMembers) {
  const issues = [];
  
  // Check 1: Task descriptions quality
  plan.phases.forEach(phase => {
    phase.tasks.forEach(task => {
      if (!task.title || task.title.length < 10) {
        issues.push(`Task title too short: "${task.title}"`);
      }
      
      if (!task.estimatedDays || task.estimatedDays < 1) {
        issues.push(`Invalid estimated days for task: "${task.title}"`);
      }
    });
  });
  
  // Check 2: Team member assignments
  const assignedEmails = new Set();
  plan.phases.forEach(phase => {
    phase.tasks.forEach(task => {
      if (task.assignedToEmail) {
        assignedEmails.add(task.assignedToEmail);
      }
    });
  });
  
  // Check if all team members got tasks
  teamMembers.forEach(member => {
    if (!assignedEmails.has(member.email)) {
      issues.push(`Team member ${member.name} has no tasks assigned`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

// async function callAIWithRetry(ai, model, contents, config, maxRetries = 3) {
//   let retries = 0;
//   while (retries < maxRetries) {
//     try {
//       return await ai.models.generateContent({
//         model: model,
//         contents: contents,
//         config: config,
//       });
//     } catch (error) {
//       retries++;
//       if (retries === maxRetries) throw error;
//       console.log(`Retry ${retries}/${maxRetries} after error:`, error.message);
//       await new Promise(resolve => setTimeout(resolve, 1000 * retries));
//     }
//   }
// }





async function callAIWithRetry(ai, modelOrModels, contents, config, maxRetries = 3, timeoutMs = 45000, context = 'unknown') {
  const models = Array.isArray(modelOrModels) ? modelOrModels : [modelOrModels];
  let lastError = null;

  for (let mIdx = 0; mIdx < models.length; mIdx++) {
    const currentModel = models[mIdx];
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        );

        const apiPromise = ai.models.generateContent({
          model: currentModel,
          contents: contents,
          config: config,
        });

        return await Promise.race([apiPromise, timeoutPromise]);

      } catch (error) {
        retries++;
        lastError = error;
        const errorCategory = categorizeError(error, context);

        logDebugEvent('AI_CALL_RETRY', {
          context: context,
          model: currentModel,
          retryAttempt: retries,
          maxRetries: maxRetries,
          error: error.message,
          category: errorCategory
        });

        const isQuotaOrOverload = error.message?.includes('429') ||
                                  error.message?.includes('503') ||
                                  error.message?.includes('RESOURCE_EXHAUSTED') ||
                                  error.message?.includes('UNAVAILABLE');

        // If quota exhausted or model unavailable, fail over immediately to next model candidate
        if (isQuotaOrOverload && mIdx < models.length - 1) {
          console.warn(`⚠️ [AI Failover] ${currentModel} returned ${errorCategory}. Failing over to ${models[mIdx + 1]}...`);
          break; // break retry loop to try next model candidate
        }

        if (retries === maxRetries && mIdx === models.length - 1) {
          logDebugEvent('AI_CALL_FAILED', {
            context: context,
            model: currentModel,
            error: error.message,
            category: errorCategory,
            totalRetries: retries
          });
          throw error;
        }

        console.log(`Retry ${retries}/${maxRetries} on ${currentModel} after error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1500 * retries));
      }
    }
  }

  throw lastError || new Error('All AI models failed');
}


// ============================================================
// 🛡️ STEP 7: VALIDATOR AUDIT (Independent Assignment Check)
// Returns: { shouldRetry: boolean, reasons: string[] }
// ============================================================
function detectCriticalIssues(validatorData, phases, teamMembers = []) {
  const reasons = [];

  // Check 1: Validator flagged workload as unbalanced
  if (validatorData.workloadBalanced === false) {
    reasons.push('Workload is not balanced across team members.');
  }

  // Check 2: Any phase has zero tasks
  (phases || []).forEach((phase) => {
    if (!phase.tasks || phase.tasks.length === 0) {
      reasons.push(`Phase "${phase.name}" has no tasks assigned.`);
    }
  });

  // 🔒 Check 3: Independent Deterministic Assignment Audit
  (phases || []).forEach((phase) => {
    (phase.tasks || []).forEach((task) => {
      // Find the developer assigned to this task
      const assignedDev = teamMembers.find(
        (m) => m.email === task.assignedToEmail || m.name === task.assignedName
      );

      if (assignedDev) {
        // Did the AI assign to someone on leave?
        if (assignedDev.isOnLeave) {
          reasons.push(`Task "${task.title}" was mistakenly assigned to ${assignedDev.name} who is on leave.`);
        }
        // Did the AI assign to someone with 3 or more active tasks?
        if ((assignedDev.activeTasksCount ?? 0) >= 3) {
          reasons.push(`Task "${task.title}" was assigned to ${assignedDev.name} who already has ${assignedDev.activeTasksCount} active tasks (max limit is 3).`);
        }
      }
    });
  });

  // Check 4: Any risk string contains a hard blocker keyword
  const CRITICAL_KEYWORDS = ['critical', 'blocking', 'blocker', 'impossible', 'severe', 'failure'];
  (validatorData.risks || []).forEach((risk) => {
    const isCritical = CRITICAL_KEYWORDS.some((kw) => risk.toLowerCase().includes(kw));
    if (isCritical) {
      reasons.push(`Critical risk detected: "${risk}"`);
    }
  });

  return {
    shouldRetry: reasons.length > 0,
    reasons,
  };
}





// ============================================================
// 🗃️ RESPONSE CACHE (In-Memory)
// ============================================================
const planCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes























/**
 * Executes Role-Based AI Agents sequentially:
 * 1. Planner Agent (Scope & Architecture)
 * 2. Executor Agent (Task Breakdown & AI Delegation)
 * 3. Validator Agent (Feasibility & Workload Audit)
 */
async function generateMultiStepPlan(ai, projectDetails) {
  const startTime = Date.now();
  logDebugEvent('WORKFLOW_START', {
    projectName: projectDetails.projectName,
    technology: projectDetails.technology,
    complexity: 'unknown'
  });
  
  try {
    const { projectName, description, experience, technology, deadline, teamMembers } = projectDetails;




// 🗃️ Build a unique cache key from all input parameters
const cacheKey = `${projectName}|${description}|${experience}|${technology}|${deadline}`;



// 🗃️ Check if a fresh cached plan exists
const cached = planCache.get(cacheKey);
if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
  console.log('⚡ [CACHE] Cache HIT — returning saved plan for:', projectName);
  return cached.data;
}
console.log('🔄 [CACHE] Cache MISS — calling Gemini agents...');



    const workflowSteps = [];
    // 🔒 Deterministic rule: Filter out developers on leave or with >= 3 active tasks
    const eligibleMembers = (teamMembers || []).filter(m => !m.isOnLeave && (m.activeTasksCount ?? 0) < 3);

    // Format developer information with skills and workload for the AI
    const teamText = eligibleMembers.length > 0
      ? eligibleMembers.map(m => {
        const skillsStr = Array.isArray(m.skills) ? m.skills.join(', ') : (m.skills || 'General');
        return `- ${m.name} (${m.email}) | Role: ${m.role} | Skills: [${skillsStr}] | Active Tasks: ${m.activeTasksCount ?? 0}`;
      }).join('\n')
      : 'No eligible developers available (all on leave or have >= 3 tasks). Mark assignedName as "Unassigned".';


    // ==========================================
    // STEP 1: 🧠 PLANNER AGENT
    // ==========================================
    console.log('Step 1/3: 🧠 Planner Agent analyzing architecture & scope...');
    const s1Start = Date.now();
    const s1Response = await callAIWithRetry(
      ai,
      PLANNER_MODEL,
      `Project Name: ${projectName}\nDescription: ${description}\nTech Stack: ${technology}\nExperience: ${experience}\nDeadline: ${deadline} days`,
      {
        systemInstruction: PLANNER_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 1000,
        temperature: 0.2,
      },
      3,
      45000,
      'PLANNER_AGENT'
    );
    const s1Data = safeParseJSON(s1Response.text, 'Planner Agent');
    const s1Duration = Date.now() - s1Start;

    workflowSteps.push({
      id: 1,
      role: 'Planner Agent',
      name: 'Architecture & Scope Strategy',
      icon: '🧠',
      status: 'completed',
      durationMs: s1Duration,
      summary: `Analyzed project complexity (${s1Data.complexity}). Scope feasibility evaluated.`,
      details: s1Data
    });

    const adjustedDeadline = !s1Data.deadlineFeasible ? s1Data.suggestedDays : deadline;

    // ==========================================
    // STEP 2: ⚙️ EXECUTOR AGENT (Task Breakdown & AI Delegation)
    // ==========================================
    console.log('Step 2/3: ⚙️ Executor Agent delegating tasks to team members...');

    // 🔍 RAG STEP: Vector similarity search for relevant policies
    const ragQuery = `Tech stack: ${technology}. Tasks: ${description}`;
    const relevantPolicies = await retrieveRelevantPolicies(ai, ragQuery);

    const s2Start = Date.now();
    const s2Response = await callAIWithRetry(
      ai,
      EXECUTOR_MODEL,
      `Overview: ${s1Data.projectOverview}
Complexity: ${s1Data.complexity}
Developer Experience: ${experience}
Tech Stack: ${technology}
Target Deadline: ${adjustedDeadline} days

RETRIEVED ASSIGNMENT POLICIES (RAG):
${relevantPolicies}

ELIGIBLE TEAM MEMBERS FOR DELEGATION:
${teamText || 'Single Developer'}`,
      {
        systemInstruction: EXECUTOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 4000,
        temperature: 0.5,
      },
      3,
      45000,
      'EXECUTOR_AGENT'
    );

    let s2Data = safeParseJSON(s2Response.text, 'Executor Agent');
    const s2Duration = Date.now() - s2Start;

    // RAG Knowledge Step in Workflow Visualizer
    workflowSteps.push({
      id: 2,
      role: 'RAG Knowledge Engine',
      name: 'Vector Search & Policy Retrieval',
      icon: '🔍',
      status: 'completed',
      durationMs: 95,
      summary: `Retrieved domain assignment rules using gemini-embedding-001 cosine similarity.`
    });

    // Executor Agent Step in Workflow Visualizer
    workflowSteps.push({
      id: 3,
      role: 'Executor Agent',
      name: 'Task Breakdown & Smart Delegation',
      icon: '⚙️',
      status: 'completed',
      durationMs: s2Duration,
      summary: `Delegated ${s2Data.phases?.length || 0} phases with contextual assignment reasoning.`,
      details: s2Data
    });

    // ==========================================
    // STEP 3: 🛡️ VALIDATOR AGENT (Workload Audit & Feasibility)
    // ==========================================
    console.log('Step 3/3: 🛡️ Validator Agent conducting workload & QA audit...');
    const s3Start = Date.now();
    const s3Response = await callAIWithRetry(
      ai,
      VALIDATOR_MODEL,
      `Project Overview: ${s1Data.projectOverview}\nPhases & Delegated Tasks: ${JSON.stringify(s2Data.phases)}`,
      {
        systemInstruction: VALIDATOR_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 2000, 
        temperature: 0.1,
      },
      3,
      45000,
      'VALIDATOR_AGENT'
    );
    let s3Data = safeParseJSON(s3Response.text, 'Validator Agent');
    const s3Duration = Date.now() - s3Start;

    workflowSteps.push({
      id: 3,
      role: 'Validator Agent',
      name: 'Feasibility & Workload Audit',
      icon: '🛡️',
      status: 'completed',
      durationMs: s3Duration,
      summary: `Audited workload distribution (${s3Data.workloadBalanced !== false ? 'Balanced' : 'Workload Warning'}) & ${s3Data.risks?.length || 0} potential risks.`,
      details: s3Data
    });

    // ==========================================
    // 🔁 CONDITIONAL RETRY (runs at most ONCE)
    // ==========================================
    const issueCheck = detectCriticalIssues(s3Data, s2Data.phases, teamMembers);

    if (issueCheck.shouldRetry) {
      console.log('⚠️  Critical issues found. Running one correction pass...');
      console.log('   Reasons:', issueCheck.reasons);

      const feedbackText = issueCheck.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n');

      // STEP 4: Re-run Executor with Validator feedback injected
      console.log('Step 4: ⚙️ Executor RETRY — fixing issues...');
      const s4Start = Date.now();
      const s4Response = await callAIWithRetry(
        ai,
        EXECUTOR_MODEL,
        `Overview: ${s1Data.projectOverview}\nComplexity: ${s1Data.complexity}\nDeveloper Experience: ${experience}\nTech Stack: ${technology}\nTarget Deadline: ${adjustedDeadline} days\n\nTEAM MEMBERS FOR DELEGATION:\n${teamText || 'Single Developer'}\n\n⚠️ VALIDATOR FEEDBACK — YOU MUST FIX THESE ISSUES:\n${feedbackText}\n\nPrevious phase plan for reference:\n${JSON.stringify(s2Data.phases)}`,
        {
          systemInstruction: EXECUTOR_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 4000, 
        },
        3,
        45000,
        'EXECUTOR_RETRY'
      );
      s2Data = safeParseJSON(s4Response.text, 'Executor Retry Agent');
      const s4Duration = Date.now() - s4Start;

      workflowSteps.push({
        id: 4,
        role: 'Executor Agent',
        name: 'Task Correction Pass (Retry)',
        icon: '🔁',
        status: 'completed',
        isRetry: true,
        retryReasons: issueCheck.reasons,
        durationMs: s4Duration,
        summary: `Corrected ${s2Data.phases?.length || 0} phases based on Validator feedback.`,
        details: s2Data
      });

      // STEP 5: Re-run Validator one final time (no more retries after this)
      console.log('Step 5: 🛡️ Validator FINAL audit...');
      const s5Start = Date.now();
      const s5Response = await callAIWithRetry(
        ai,
        VALIDATOR_MODEL,
        `Project Overview: ${s1Data.projectOverview}\nPhases & Delegated Tasks: ${JSON.stringify(s2Data.phases)}`,
        {
          systemInstruction: VALIDATOR_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
          maxOutputTokens: 2000, 
        },
        3,
        45000,
        'VALIDATOR_RETRY'
      );
      s3Data = safeParseJSON(s5Response.text, 'Validator Retry Agent');
      const s5Duration = Date.now() - s5Start;

      workflowSteps.push({
        id: 5,
        role: 'Validator Agent',
        name: 'Final QA Audit',
        icon: '✅',
        status: 'completed',
        isRetry: true,
        durationMs: s5Duration,
        summary: `Final audit: workload ${s3Data.workloadBalanced !== false ? 'balanced ✅' : 'still unbalanced ⚠️'}, ${s3Data.risks?.length || 0} risks noted.`,
        details: s3Data
      });
    }

    // MERGE ALL STEPS INTO FINAL PLAN OBJECT
    const finalPlan = {
      projectOverview: s1Data.projectOverview,
      complexity: s1Data.complexity,
      estimatedTotalDays: s2Data.estimatedTotalDays || parseInt(deadline, 10) || 30,
      phases: s2Data.phases,
      risks: s3Data.risks,
      testingPlan: s3Data.testingPlan,
    };

    if (!s1Data.deadlineFeasible) {
      finalPlan.userRequestedDeadline = deadline;
      finalPlan.aiSuggestedDeadline = s1Data.suggestedDays;
      finalPlan.deadlineWarning = `Your requested deadline of ${deadline} days may be unrealistic for a ${s1Data.complexity} complexity project. AI suggests ${s1Data.suggestedDays} days.`;
    }

    // Content quality check
    const qualityCheck = validateContentQuality(finalPlan, teamMembers);
    if (!qualityCheck.isValid) {
      console.warn('Content quality issues found:', qualityCheck.issues);
      workflowSteps.push({
        id: 99,
        role: 'Quality Validator',
        name: 'Content Quality Check',
        icon: '🔍',
        status: 'warning',
        summary: `Found ${qualityCheck.issues.length} quality issues`,
        details: qualityCheck.issues
      });
    }


    // 💾 Save result to cache
planCache.set(cacheKey, {
  timestamp: Date.now(),
  data: { plan: finalPlan, workflowSteps }
});
console.log('💾 [CACHE] Plan cached for:', projectName);

    // Record successful run
    improvementTracker.recordRun(true);
    improvementTracker.saveMetrics();
    
    logDebugEvent('WORKFLOW_SUCCESS', {
      projectName: projectName,
      complexity: finalPlan.complexity,
      phasesCount: finalPlan.phases.length,
      duration: Date.now() - startTime
    });

    return {
      plan: finalPlan,
      workflowSteps: workflowSteps
    };

  } catch (error) {
    const errorCategory = categorizeError(error, 'WORKFLOW_COMPLETE');
    improvementTracker.recordRun(false, errorCategory);
    improvementTracker.saveMetrics();
    
    logDebugEvent('WORKFLOW_FAILED', {
      projectName: projectDetails.projectName,
      error: error.message,
      category: errorCategory,
      duration: Date.now() - startTime
    });

    // If Gemini is down, throw a clean error so the frontend can show the user a proper message
    console.error('❌ Gemini API failed:', error.message);
    throw new Error('AI service is currently unavailable. Please try again in a few minutes.');
  }
}


module.exports = {
  validateProjectPlan,
  generateMultiStepPlan,
  ASSISTANT_MODEL
};