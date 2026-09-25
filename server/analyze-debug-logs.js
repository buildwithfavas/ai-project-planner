const fs = require('fs');
const path = require('path');

console.log('🔍 Debug Log Analysis\n');

// Read debug logs
const debugLogPath = path.join(__dirname, 'debug-logs.json');
const metricsPath = path.join(__dirname, 'improvement-metrics.json');

if (fs.existsSync(debugLogPath)) {
  console.log('📋 Debug Events:');
  const logLines = fs.readFileSync(debugLogPath, 'utf8').split('\n').filter(line => line.trim());
  
  const events = logLines.map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  }).filter(Boolean);
  
  // Categorize events
  const eventTypes = {};
  const errorCategories = {};
  
  events.forEach(event => {
    eventTypes[event.event] = (eventTypes[event.event] || 0) + 1;
    if (event.category && event.category !== 'info') {
      errorCategories[event.category] = (errorCategories[event.category] || 0) + 1;
    }
  });
  
  console.log('Event Types:');
  Object.entries(eventTypes).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  console.log('\nError Categories:');
  Object.entries(errorCategories).forEach(([category, count]) => {
    console.log(`  ${category}: ${count}`);
  });
  
  // Recent errors
  console.log('\nRecent Errors (last 5):');
  const recentErrors = events.filter(e => e.category && e.category !== 'info').slice(-5);
  recentErrors.forEach(error => {
    console.log(`  [${error.timestamp}] ${error.event}: ${error.details.error}`);
  });
} else {
  console.log('No debug logs found yet. Run some tests first.');
}

if (fs.existsSync(metricsPath)) {
  console.log('\n📊 Improvement Metrics:');
  const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
  console.log(JSON.stringify(metrics, null, 2));
} else {
  console.log('\nNo improvement metrics found yet. Run some tests first.');
}