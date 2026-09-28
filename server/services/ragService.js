/**
 * RAG SERVICE (Embedding -> In-Memory Vector Storage -> Cosine Similarity -> Policy Retrieval)
 */

// 1. Knowledge Chunks (Domain-specific policies)
const POLICY_CHUNKS = [
  {
    id: 'backend_rules',
    topic: 'Backend & API Assignment',
    content: 'Assign backend, REST API, authentication, server-side logic, and microservices tasks to Backend Developers skilled in Node.js, Express, and databases.'
  },
  {
    id: 'frontend_rules',
    topic: 'Frontend & UI Assignment',
    content: 'Assign UI/UX, responsive layouts, components, state management, and styling tasks to Frontend Developers skilled in React, Tailwind, and JavaScript.'
  },
  {
    id: 'database_rules',
    topic: 'Database & DevOps Assignment',
    content: 'Assign schema design, indexing, queries, migrations, caching (Redis), Docker, and deployment tasks to Database and DevOps engineers.'
  },
  {
    id: 'qa_rules',
    topic: 'QA & Testing Assignment',
    content: 'Assign unit tests, integration tests, E2E testing (Cypress/Jest), and QA verification to QA/Testing engineers.'
  },
  {
    id: 'capacity_rules',
    topic: 'Workload & Capacity Limit',
    content: 'Strict rule: Developers with 3 or more active tasks are at maximum capacity and must never be assigned new tasks. Balance workload across available developers.'
  },
  {
    id: 'leave_rules',
    topic: 'Leave & Availability',
    content: 'Developers marked as on leave or unavailable must be completely excluded from receiving any task assignments.'
  },
  {
    id: 'priority_rules',
    topic: 'High-Priority Task Assignment',
    content: 'High-priority or critical path tasks should be assigned to the most experienced eligible developer available with lowest active workload.'
  }
];

// In-memory Vector Store
let vectorStore = [];
let isInitializing = false;

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
 * Helper to embed a single chunk with exponential backoff retry
 */
async function embedChunkWithRetry(ai, chunk, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: `${chunk.topic}: ${chunk.content}`,
      });
      const values = response.embedding?.values || response.embeddings?.[0]?.values;
      if (values) return { ...chunk, embedding: values };
    } catch (err) {
      if (attempt === maxRetries) {
        console.warn(`⚠️ [RAG] Failed embedding chunk ${chunk.id} after ${maxRetries} attempts:`, err.message);
        return null;
      }
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  return null;
}

/**
 * 1. EMBED & STORE: Indexes all policy chunks concurrently on server startup
 */
async function initializeVectorStore(ai) {
  if (vectorStore.length === POLICY_CHUNKS.length || isInitializing) return;
  isInitializing = true;

  console.log('⚡ [RAG] Generating embeddings for policy knowledge base (parallel)...');
  try {
    const results = await Promise.all(
      POLICY_CHUNKS.map(chunk => embedChunkWithRetry(ai, chunk))
    );

    vectorStore = results.filter(Boolean);
    console.log(`✅ [RAG] Vector store ready. ${vectorStore.length}/${POLICY_CHUNKS.length} policy chunks indexed.`);
  } catch (error) {
    console.error('❌ [RAG] Failed to index vector store:', error.message);
  } finally {
    isInitializing = false;
  }
}

/**
 * 2. SIMILARITY SEARCH & RETRIEVE:
 * Embeds user query, performs vector similarity search, returns top-K matching policies
 */
async function retrieveRelevantPolicies(ai, query) {
  try {
    // Ensure store is populated
    if (vectorStore.length === 0 && !isInitializing) {
      await initializeVectorStore(ai);
    }

    // Fallback if vector store is unavailable
    if (vectorStore.length === 0) {
      return POLICY_CHUNKS.map(c => `- ${c.topic}: ${c.content}`).join('\n');
    }

    // Embed the incoming query
    const queryResponse = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: query,
    });
    const queryVector = queryResponse.embedding?.values || queryResponse.embeddings?.[0]?.values;

    if (!queryVector) {
      return POLICY_CHUNKS.map(c => `- ${c.topic}: ${c.content}`).join('\n');
    }

    // Score and rank all chunks
    const scoredChunks = vectorStore.map(chunk => ({
      topic: chunk.topic,
      content: chunk.content,
      similarity: cosineSimilarity(queryVector, chunk.embedding)
    }));

    scoredChunks.sort((a, b) => b.similarity - a.similarity);

    // Filter by threshold or take top matches
    const SIMILARITY_THRESHOLD = 0.50;
    let selected = scoredChunks.filter(c => c.similarity >= SIMILARITY_THRESHOLD);

    if (selected.length === 0) {
      selected = scoredChunks.slice(0, 2);
    } else if (selected.length > 4) {
      selected = selected.slice(0, 4);
    }

    console.log(`🔍 [RAG] Selected ${selected.length} policies for query:`);
    selected.forEach(r => console.log(`   - [${(r.similarity * 100).toFixed(1)}% match] ${r.topic}`));

    return selected.map(r => `- ${r.topic}: ${r.content}`).join('\n');
  } catch (error) {
    console.warn('⚠️ [RAG] Vector search fallback to default policies:', error.message);
    return POLICY_CHUNKS.map(c => `- ${c.topic}: ${c.content}`).join('\n');
  }
}

module.exports = {
  initializeVectorStore,
  retrieveRelevantPolicies
};
