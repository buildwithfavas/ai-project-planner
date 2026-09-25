const { ai } = require('./config/gemini');
const { generateMultiStepPlan } = require('./services/promptService');
const fs = require('fs');

// Load test inputs
const testInputs = JSON.parse(fs.readFileSync('./test-inputs.json', 'utf8'));

async function runTests() {
  console.log('🧪 Starting AI System Tests...\n');
  
  // Initialize results file
  if (!fs.existsSync('./test-results.json')) {
    fs.writeFileSync('./test-results.json', '');
  }
  
  for (const testCase of testInputs) {
    console.log(`📋 Running test: ${testCase.testName}`);
    console.log(`Project: ${testCase.projectName}`);
    
    try {
      const { plan, workflowSteps } = await generateMultiStepPlan(ai, testCase);
      
      console.log(`✅ Test passed: ${testCase.testName}`);
      console.log(`Complexity: ${plan.complexity}`);
      console.log(`Phases: ${plan.phases.length}`);
      console.log(`Workflow steps: ${workflowSteps.length}`);
      
      // Save result
      const result = {
        testName: testCase.testName,
        status: 'success',
        plan: plan,
        workflowSteps: workflowSteps,
        timestamp: new Date().toISOString(),
        // NEW: Add quality metrics
        qualityMetrics: {
          phasesCount: plan.phases.length,
          totalTasks: plan.phases.reduce((sum, phase) => sum + (phase.tasks?.length || 0), 0),
          complexity: plan.complexity,
          estimatedDays: plan.estimatedTotalDays
        }
      };
      
      // Add output quality evaluation if expected criteria exist
      if (testCase.expectedCriteria) {
        const qualityEval = evaluateOutputQuality(plan, testCase.expectedCriteria);
        result.qualityEvaluation = qualityEval;
        
        if (!qualityEval.isCorrect) {
          console.log(`⚠️ Quality issues found: ${qualityEval.issues.length}`);
          qualityEval.issues.forEach(issue => console.log(`  - ${issue}`));
        } else {
          console.log(`✅ Quality check passed (Score: ${qualityEval.qualityScore}/100)`);
        }
      }
      
      fs.appendFileSync('./test-results.json', JSON.stringify(result) + '\n');
      
    } catch (error) {
      console.log(`❌ Test failed: ${testCase.testName}`);
      console.log(`Error: ${error.message}`);
      
      const result = {
        testName: testCase.testName,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      fs.appendFileSync('./test-results.json', JSON.stringify(result) + '\n');
    }
    
    console.log('---\n');
  }
  
  console.log('🏁 Tests completed!');
}

// Run both test functions
runTests().then(() => runConsistencyTests());


async function runConsistencyTests() {
  console.log('🧪 Starting Consistency Tests...\n');
  
  const allResults = [];
  
  for (const testCase of testInputs) {
    console.log(`📋 Testing consistency for: ${testCase.testName}`);
    
    const results = [];
    
    for (let i = 1; i <= 3; i++) {
      console.log(`  Run ${i}/3...`);
      
      try {
        const { plan, workflowSteps } = await generateMultiStepPlan(ai, testCase);
        results.push({
          testName: testCase.testName,
          run: i,
          complexity: plan.complexity,
          phasesCount: plan.phases.length,
          estimatedDays: plan.estimatedTotalDays,
          status: 'success',
          plan: plan
        });
        allResults.push(results[results.length - 1]);
      } catch (error) {
        results.push({
          testName: testCase.testName,
          run: i,
          status: 'failed',
          error: error.message
        });
        allResults.push(results[results.length - 1]);
      }
    }
    
    // Analyze consistency
    const complexities = results.filter(r => r.status === 'success').map(r => r.complexity);
    const phaseCounts = results.filter(r => r.status === 'success').map(r => r.phasesCount);
    
    const complexityConsistent = complexities.length > 0 && complexities.every(c => c === complexities[0]);
    const phasesConsistent = phaseCounts.length > 0 && phaseCounts.every(c => c === phaseCounts[0]);
    
    console.log(`  Complexity consistent: ${complexityConsistent ? '✅' : '❌'}`);
    console.log(`  Phases count consistent: ${phasesConsistent ? '✅' : '❌'}`);
    console.log('---\n');
  }
  
  // Analyze variability across all results
  if (allResults.length > 0) {
    console.log('📊 Variability Analysis:');
    const variability = analyzeTestVariability(allResults);
    console.log(JSON.stringify(variability, null, 2));
  }
}

// Add variability analysis function
function analyzeTestVariability(results) {
  const variabilityAnalysis = {
    complexityVariability: {},
    phasesCountVariability: {},
    estimatedDaysVariability: {}
  };
  
  // Group results by test name
  const groupedResults = {};
  results.forEach(result => {
    if (!groupedResults[result.testName]) {
      groupedResults[result.testName] = [];
    }
    groupedResults[result.testName].push(result);
  });
  
  // Analyze each test
  for (const testName in groupedResults) {
    const testResults = groupedResults[testName];
    const complexities = testResults.map(r => r.plan?.complexity).filter(Boolean);
    const phaseCounts = testResults.map(r => r.plan?.phases?.length).filter(Boolean);
    const estimatedDays = testResults.map(r => r.plan?.estimatedTotalDays).filter(Boolean);
    
    // Calculate variability
    variabilityAnalysis.complexityVariability[testName] = {
      values: complexities,
      unique: [...new Set(complexities)].length,
      consistent: complexities.length > 0 && complexities.every(c => c === complexities[0])
    };
    
    variabilityAnalysis.phasesCountVariability[testName] = {
      values: phaseCounts,
      min: phaseCounts.length > 0 ? Math.min(...phaseCounts) : 0,
      max: phaseCounts.length > 0 ? Math.max(...phaseCounts) : 0,
      range: phaseCounts.length > 0 ? Math.max(...phaseCounts) - Math.min(...phaseCounts) : 0
    };
    
    variabilityAnalysis.estimatedDaysVariability[testName] = {
      values: estimatedDays,
      min: estimatedDays.length > 0 ? Math.min(...estimatedDays) : 0,
      max: estimatedDays.length > 0 ? Math.max(...estimatedDays) : 0,
      range: estimatedDays.length > 0 ? Math.max(...estimatedDays) - Math.min(...estimatedDays) : 0
    };
  }
  
  return variabilityAnalysis;
}

// Output Quality Evaluation Function
function evaluateOutputQuality(plan, expectedCriteria) {
  const issues = [];
  
  // Check for incomplete output (missing required modules)
  if (expectedCriteria.requiredModules) {
    const planContent = JSON.stringify(plan).toLowerCase();
    expectedCriteria.requiredModules.forEach(module => {
      if (!planContent.includes(module.toLowerCase())) {
        issues.push(`Missing required module: ${module}`);
      }
    });
  }
  
  // Check for incomplete output (too few phases)
  if (expectedCriteria.minPhases && plan.phases.length < expectedCriteria.minPhases) {
    issues.push(`Insufficient phases: ${plan.phases.length} (expected at least ${expectedCriteria.minPhases})`);
  }
  
  // Check for vague output (too few tasks per phase)
  if (expectedCriteria.minTasksPerPhase) {
    plan.phases.forEach(phase => {
      if (phase.tasks.length < expectedCriteria.minTasksPerPhase) {
        issues.push(`Phase "${phase.name}" has insufficient tasks: ${phase.tasks.length} (expected at least ${expectedCriteria.minTasksPerPhase})`);
      }
    });
  }
  
  // Check for incorrect output (deadline unrealistic)
  if (expectedCriteria.deadlineFeasibilityCheck && plan.estimatedTotalDays) {
    const deadline = parseInt(expectedCriteria.deadline) || 7;
    if (plan.estimatedTotalDays > deadline * 3) {
      issues.push(`Estimated days (${plan.estimatedTotalDays}) far exceeds deadline (${deadline}) - indicates incorrect planning`);
    }
  }
  
  // Check for vague output (task descriptions too short)
  plan.phases.forEach(phase => {
    phase.tasks.forEach(task => {
      if (task.title && task.title.length < 15) {
        issues.push(`Task title too vague: "${task.title}" (less than 15 characters)`);
      }
    });
  });
  
  // Check for incomplete output (missing key deliverables)
  if (expectedCriteria.requiredModules && expectedCriteria.requiredModules.includes('testing')) {
    const hasTesting = plan.phases.some(phase => 
      phase.name.toLowerCase().includes('test') || 
      phase.name.toLowerCase().includes('qa') ||
      phase.tasks.some(task => task.title.toLowerCase().includes('test'))
    );
    if (!hasTesting) {
      issues.push('Missing testing/quality assurance phase');
    }
  }
  
  return {
    isCorrect: issues.length === 0,
    issues: issues,
    qualityScore: Math.max(0, 100 - (issues.length * 10)),
    issueTypes: {
      incorrect: issues.filter(i => i.includes('far exceeds') || i.includes('incorrect')).length,
      vague: issues.filter(i => i.includes('vague') || i.includes('too short')).length,
      incomplete: issues.filter(i => i.includes('Missing') || i.includes('Insufficient')).length
    }
  };
}


