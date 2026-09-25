const fs = require('fs');
const path = require('path');

// Function to analyze a single results file
function analyzeResultsFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`\n❌ ${label}: File not found (${filePath})`);
    return null;
  }

  const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Basic statistics
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.status === 'success').length;
  const failedTests = results.filter(r => r.status === 'failed').length;

  console.log(`\n📊 ${label}:`);
  console.log(`Total tests: ${totalTests}`);
  console.log(`Successful: ${successfulTests} (${totalTests > 0 ? (successfulTests/totalTests*100).toFixed(1) : 0}%)`);
  console.log(`Failed: ${failedTests} (${totalTests > 0 ? (failedTests/totalTests*100).toFixed(1) : 0}%)`);

  // Analyze successful tests
  const successful = results.filter(r => r.status === 'success');
  if (successful.length > 0) {
    const complexities = successful.map(r => r.plan?.complexity);
    const phaseCounts = successful.map(r => r.plan?.phases?.length);
    const qualityMetrics = successful.map(r => r.qualityMetrics);
    
    console.log('\n📈 Output Variability:');
    console.log(`Complexity distribution: ${complexities.join(', ')}`);
    console.log(`Phase counts: ${phaseCounts.join(', ')}`);
    console.log(`Average phases: ${phaseCounts.length > 0 ? (phaseCounts.reduce((a,b) => a+b, 0) / phaseCounts.length).toFixed(1) : 0}`);
    
    console.log('\n🎯 Quality Metrics:');
    qualityMetrics.forEach(metrics => {
      console.log(`Test: ${metrics.testName || 'Unknown'}`);
      console.log(`  Phases: ${metrics.phasesCount}`);
      console.log(`  Total Tasks: ${metrics.totalTasks}`);
      console.log(`  Complexity: ${metrics.complexity}`);
      console.log(`  Estimated Days: ${metrics.estimatedDays}`);
    });
    
    // Add output quality evaluation analysis
    const qualityEvaluations = successful.filter(r => r.qualityEvaluation);
    if (qualityEvaluations.length > 0) {
      console.log('\n🎯 Output Quality Evaluation:');
      qualityEvaluations.forEach(eval => {
        console.log(`Test: ${eval.testName}`);
        console.log(`  Quality Score: ${eval.qualityEvaluation.qualityScore}/100`);
        console.log(`  Status: ${eval.qualityEvaluation.isCorrect ? '✅ CORRECT' : '❌ ISSUES FOUND'}`);
        console.log(`  Issue Types: Incorrect: ${eval.qualityEvaluation.issueTypes.incorrect}, Vague: ${eval.qualityEvaluation.issueTypes.vague}, Incomplete: ${eval.qualityEvaluation.issueTypes.incomplete}`);
        if (eval.qualityEvaluation.issues.length > 0) {
          console.log(`  Issues (${eval.qualityEvaluation.issues.length}):`);
          eval.qualityEvaluation.issues.forEach(issue => console.log(`    - ${issue}`));
        }
      });
      
      // Overall quality summary
      const avgQualityScore = qualityEvaluations.reduce((sum, eval) => sum + eval.qualityEvaluation.qualityScore, 0) / qualityEvaluations.length;
      const totalIssues = qualityEvaluations.reduce((sum, eval) => sum + eval.qualityEvaluation.issues.length, 0);
      const correctCount = qualityEvaluations.filter(eval => eval.qualityEvaluation.isCorrect).length;
      
      console.log('\n📊 Quality Summary:');
      console.log(`  Average Quality Score: ${avgQualityScore.toFixed(1)}/100`);
      console.log(`  Correct Outputs: ${correctCount}/${qualityEvaluations.length} (${(correctCount/qualityEvaluations.length*100).toFixed(1)}%)`);
      console.log(`  Total Quality Issues: ${totalIssues}`);
    }
  }

  // Error analysis
  const failed = results.filter(r => r.status === 'failed');
  if (failed.length > 0) {
    console.log('\n❌ Error Analysis:');
    failed.forEach(failure => {
      console.log(`Test: ${failure.testName}`);
      console.log(`  Error: ${failure.error}`);
    });
  }

  return {
    totalTests,
    successfulTests,
    failedTests,
    successRate: totalTests > 0 ? (successfulTests/totalTests*100).toFixed(1) : 0
  };
}

// Function to compare two result sets
function compareResults(baselinePath, improvedPath) {
  console.log('\n🔍 Before vs After Comparison:');
  
  const baseline = analyzeResultsFile(baselinePath, 'BEFORE (Baseline)');
  const improved = analyzeResultsFile(improvedPath, 'AFTER (Improved)');
  
  if (baseline && improved) {
    console.log('\n📈 Improvement Metrics:');
    const successRateChange = (parseFloat(improved.successRate) - parseFloat(baseline.successRate)).toFixed(1);
    console.log(`Success Rate: ${baseline.successRate}% → ${improved.successRate}% (${successRateChange > 0 ? '+' : ''}${successRateChange}%)`);
    
    const testCountChange = improved.totalTests - baseline.totalTests;
    console.log(`Test Count: ${baseline.totalTests} → ${improved.totalTests} (${testCountChange > 0 ? '+' : ''}${testCountChange})`);
    
    if (successRateChange > 0) {
      console.log('✅ Improvement detected!');
    } else if (successRateChange < 0) {
      console.log('⚠️ Performance degradation detected');
    } else {
      console.log('➡️ No significant change in success rate');
    }
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  // Single file analysis
  analyzeResultsFile('./test-results.json', 'Test Results Analysis');
} else if (args.length === 2) {
  // Comparison mode
  compareResults(args[0], args[1]);
} else {
  console.log('Usage:');
  console.log('  node analyze-results.js                    # Analyze current results');
  console.log('  node analyze-results.js baseline.json improved.json  # Compare before/after');
}