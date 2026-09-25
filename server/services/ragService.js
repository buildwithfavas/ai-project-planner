/**
 * RAG SERVICE (Embedding -> Vector Storage -> Cosine Similarity -> Retrieval)
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

// In-memory Vector Store (stores chunks with their embedding vectors)
let vectorStore = [];

/**
 * Mathematical Cosine Similarity between two vectors: A . B / (||A|| * ||B||)
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 1. EMBED & STORE: Indexes all policy chunks into vectors on server startup
 */
async function initializeVectorStore(ai) {
  if (vectorStore.length === POLICY_CHUNKS.length) return; // already fully indexed

  console.log('⚡ [RAG] Generating embeddings for policy knowledge base...');
  try {
    const tempStore = [];
    for (const chunk of POLICY_CHUNKS) {
      let retries = 0;
      let values = null;
      while (retries < 3 && !values) {
        try {
          const response = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: `${chunk.topic}: ${chunk.content}`,
          });
          values = response.embedding?.values || response.embeddings?.[0]?.values;
        } catch (embedErr) {
          retries++;
          if (retries >= 3) throw embedErr;
          console.warn(`[RAG] Embedding retry ${retries}/3 for ${chunk.id}: ${embedErr.message}`);
          await new Promise(r => setTimeout(r, 1000 * retries));
        }
      }
      tempStore.push({
        ...chunk,
        embedding: values
      });
    }
    vectorStore = tempStore;
    console.log(`✅ [RAG] Vector store ready. ${vectorStore.length} policy chunks indexed.`);
  } catch (error) {
    console.error('❌ [RAG] Failed to index vector store:', error.message);
  }
}

/**
 * 2. SIMILARITY SEARCH & RETRIEVE:
 * Embeds user query, performs vector similarity search, returns top-K matching policies
 */
async function retrieveRelevantPolicies(ai, query) {
  try {
    // If not initialized yet, initialize first
    if (vectorStore.length === 0) {
      await initializeVectorStore(ai);
    }

    // Fallback if vectorStore is still empty
    if (vectorStore.length === 0) {
      return POLICY_CHUNKS.map(c => `- ${c.topic}: ${c.content}`).join('\n');
    }

    // Embed the query text
    const queryResponse = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: query,
    });
    const queryVector = queryResponse.embedding?.values || queryResponse.embeddings?.[0]?.values;

    if (!queryVector) {
      return POLICY_CHUNKS.map(c => `- ${c.topic}: ${c.content}`).join('\n');
    }

    // Calculate cosine similarity against all chunks in vector store
    const scoredChunks = vectorStore.map(chunk => ({
      topic: chunk.topic,
      content: chunk.content,
      similarity: cosineSimilarity(queryVector, chunk.embedding)
    }));

    // Sort descending by similarity
    scoredChunks.sort((a, b) => b.similarity - a.similarity);

    // Dynamic threshold: Only keep policies with >= 50% match
    const SIMILARITY_THRESHOLD = 0.50;
    let selectedPolicies = scoredChunks.filter(chunk => chunk.similarity >= SIMILARITY_THRESHOLD);

    // Fallback: If query was brief/vague, take top 2
    if (selectedPolicies.length === 0) {
      selectedPolicies = scoredChunks.slice(0, 2);
    }

    // Safety cap: Max 4 policies to keep context compact
    if (selectedPolicies.length > 4) {
      selectedPolicies = selectedPolicies.slice(0, 4);
    }

    console.log(`🔍 [RAG] Dynamically selected ${selectedPolicies.length} policies for this plan:`);
    selectedPolicies.forEach(r => console.log(`   - [${(r.similarity * 100).toFixed(1)}% match] ${r.topic}`));

    return selectedPolicies.map(r => `- ${r.topic}: ${r.content}`).join('\n');

  } catch (error) {
    console.warn('⚠️ [RAG] Vector search failed, falling back to all policies:', error.message);
    // Fallback if embedding quota fails
    return POLICY_CHUNKS.map(c => `- ${c.topic}: ${c.content}`).join('\n');
  }
}

module.exports = {
  initializeVectorStore,
  retrieveRelevantPolicies
};
