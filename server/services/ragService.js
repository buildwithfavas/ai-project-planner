const fs = require('fs');
const path = require('path');

const DATA_DIR_PATH = path.join(__dirname, '../data');

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'but', 'if', 'then', 'else', 'when', 'up', 'down', 'out', 'all'
]);

let vectorStore = [];
let vocabulary = [];

function loadPoliciesFromFile() {
  const allDocuments = [];
  try {
    if (fs.existsSync(DATA_DIR_PATH)) {
      const files = fs.readdirSync(DATA_DIR_PATH).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(DATA_DIR_PATH, file);
        const fileData = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(fileData);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            allDocuments.push({ ...item, sourceFile: file });
          });
        }
      }
      return allDocuments;
    }
  } catch (error) {
    console.warn(`⚠️ [RAG] Could not read knowledge files from ${DATA_DIR_PATH}: ${error.message}`);
  }
  return allDocuments;
}

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOPWORDS.has(token));
}


function createVector(tokens, vocab) {
  const tokenCounts = {};
  for (const t of tokens) {
    tokenCounts[t] = (tokenCounts[t] || 0) + 1;
  }
  return vocab.map(term => tokenCounts[term] || 0);
}

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

async function initializeVectorStore() {
  const policies = loadPoliciesFromFile();
  if (policies.length === 0) {
    console.warn('⚠️ [RAG] No policies found to initialize Vector Store.');
    return;
  }

  const allTokens = [];
  policies.forEach(policy => {
    const docTokens = tokenize(`${policy.topic} ${policy.content}`);
    allTokens.push(...docTokens);
  });

  vocabulary = Array.from(new Set(allTokens));

  vectorStore = policies.map(policy => {
    const tokens = tokenize(`${policy.topic} ${policy.content}`);
    const embedding = createVector(tokens, vocabulary);
    return {
      ...policy,
      tokens,
      embedding
    };
  });

  console.log(`✅ [RAG Vector Store] Initialized ${vectorStore.length} policy embeddings (Vocab Size: ${vocabulary.length} terms).`);
}

async function retrieveRelevantPolicies(query = '', topK = 4) {
  if (!vectorStore || vectorStore.length === 0) {
    await initializeVectorStore();
  }

  if (!query || vectorStore.length === 0) {
    const policies = loadPoliciesFromFile();
    return policies.map(c => `- ${c.topic}: ${c.content}`).join('\n');
  }

  const queryTokens = tokenize(query);
  const queryVector = createVector(queryTokens, vocabulary);

  const scoredPolicies = vectorStore.map(doc => {
    const score = cosineSimilarity(queryVector, doc.embedding);
    return {
      topic: doc.topic,
      content: doc.content,
      score: parseFloat(score.toFixed(4)),
      isGuardrail: doc.id === 'capacity_rules' || doc.id === 'leave_rules' // Mandatory organization guardrails
    };
  });

  // Sort by similarity score descending
  scoredPolicies.sort((a, b) => b.score - a.score);

  console.log(`🔍 [RAG Vector Search] Similarity scores for query: "${query.slice(0, 60)}..."`);
  scoredPolicies.forEach(p => {
    console.log(`   🎯 [Score: ${p.score.toFixed(3)}] ${p.topic}`);
  });

  // Keep top-K matching policies plus mandatory guardrails
  const selectedPolicies = [];
  const seenTopics = new Set();

  for (const p of scoredPolicies) {
    if (selectedPolicies.length < topK || p.isGuardrail) {
      if (!seenTopics.has(p.topic)) {
        selectedPolicies.push(p);
        seenTopics.add(p.topic);
      }
    }
  }

  return selectedPolicies.map(c => `- ${c.topic} (Relevance Score: ${c.score}): ${c.content}`).join('\n');
}

module.exports = {
  loadPoliciesFromFile,
  initializeVectorStore,
  retrieveRelevantPolicies,
  cosineSimilarity,
  tokenize,
  createVector
};
