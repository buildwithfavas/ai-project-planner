const fs = require('fs');
const path = require('path');

// Path to external knowledge policies file
const POLICIES_FILE_PATH = path.join(__dirname, '../data/policies.json');

/**
 * Loads assignment policy chunks dynamically from the external JSON file
 */
function loadPoliciesFromFile() {
  try {
    if (fs.existsSync(POLICIES_FILE_PATH)) {
      const fileData = fs.readFileSync(POLICIES_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn(`⚠️ [RAG] Could not read policies from ${POLICIES_FILE_PATH}: ${error.message}`);
  }
  return [];
}

/**
 * Mathematical Cosine Similarity between two vectors: A . B / (||A|| * ||B||)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const len = vecA.length;
  for (let i = 0; i < len; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 1. EMBED & STORE (Optional / Mockable Vector Store Initialization)
 */
async function initializeVectorStore() {
  const policies = loadPoliciesFromFile();
  console.log(`✅ [RAG] Loaded ${policies.length} policy rules from data/policies.json`);
}

/**
 * 2. SIMILARITY SEARCH & RETRIEVE:
 * Reads policies dynamically from the external JSON file and formats them for the Executor Agent
 */
async function retrieveRelevantPolicies(ai = null, query = '') {
  const policies = loadPoliciesFromFile();
  console.log(`🔍 [RAG] Dynamically loaded ${policies.length} assignment policies from data/policies.json`);
  return policies.map(c => `- ${c.topic}: ${c.content}`).join('\n');
}

module.exports = {
  loadPoliciesFromFile,
  initializeVectorStore,
  retrieveRelevantPolicies
};
