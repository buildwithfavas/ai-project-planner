require('dotenv').config();
const { ai } = require('./config/gemini');
const { initializeVectorStore, retrieveRelevantPolicies } = require('./services/ragService');

// Test dataset: [Query, Expected Top Policy Topic]
const TEST_CASES = [
  {
    name: 'Frontend Project Query',
    query: 'Building a responsive web UI with React, Tailwind CSS, components and animations',
    expectedTopic: 'Frontend & UI Assignment'
  },
  {
    name: 'Backend API Query',
    query: 'Building scalable REST APIs, authentication with JWT, Express server and microservices',
    expectedTopic: 'Backend & API Assignment'
  },
  {
    name: 'Database & DevOps Query',
    query: 'PostgreSQL schema migrations, Redis caching layer, Docker containers and Kubernetes deployment',
    expectedTopic: 'Database & DevOps Assignment'
  },
  {
    name: 'QA & Testing Query',
    query: 'Writing end-to-end Cypress test suites, Jest unit tests, regression and test coverage',
    expectedTopic: 'QA & Testing Assignment'
  }
];

async function runRAGAutomatedTests() {
  console.log('🧪 Starting Automated RAG Evaluation Suite...\n');

  // Step 1: Pre-index vector store
  await initializeVectorStore(ai);

  let passed = 0;

  for (const test of TEST_CASES) {
    console.log(`\n▶️ Test: ${test.name}`);
    console.log(`   Query: "${test.query.slice(0, 60)}..."`);

    // Retrieve policies
    const result = await retrieveRelevantPolicies(ai, test.query, 3);

    // Check if the expected topic is inside the retrieved text
    const isRelevant = result.toLowerCase().includes(test.expectedTopic.toLowerCase());

    if (isRelevant) {
      console.log(`   ✅ PASSED: Correctly retrieved "${test.expectedTopic}"`);
      passed++;
    } else {
      console.log(`   ❌ FAILED: Expected "${test.expectedTopic}" in top results`);
    }
  }

  console.log(`\n========================================`);
  console.log(`🎯 Test Results: ${passed}/${TEST_CASES.length} Passed (${(passed / TEST_CASES.length) * 100}%)`);
  console.log(`========================================`);
}

runRAGAutomatedTests();
