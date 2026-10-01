const mongoose = require('mongoose');
const Chat = require('../models/Chat');

const SUMMARY_TRIGGER_INTERVAL = 4; // Generate/update summary every 4 messages

/**
 * 1. Get or initialize an active chat session document in MongoDB
 */
async function getOrCreateChatSession({ sessionId, projectId = null }) {
  if (!sessionId) {
    throw new Error('sessionId is required for chat operations');
  }

  if (mongoose.connection.readyState !== 1) {
    return null; // Gracefully continue if MongoDB is in offline mode
  }

  let chat = await Chat.findOne({ sessionId });
  if (!chat) {
    chat = await Chat.create({
      sessionId,
      projectId: projectId && mongoose.Types.ObjectId.isValid(projectId) ? projectId : null,
      messages: [],
      summary: '',
      messageCount: 0,
      lastSummarizedCount: 0
    });
  } else if (projectId && !chat.projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    chat.projectId = projectId;
    await chat.save();
  }

  return chat;
}

/**
 * 2. Record a message and trigger rolling summary if interval reached
 */
async function recordChatMessage({ sessionId, projectId = null, role, content, callLLM = null }) {
  if (mongoose.connection.readyState !== 1) {
    return { summary: '', messageCount: 0 };
  }

  try {
    const chat = await getOrCreateChatSession({ sessionId, projectId });
    if (!chat) return { summary: '', messageCount: 0 };

    chat.messages.push({
      role,
      content,
      timestamp: new Date()
    });
    chat.messageCount = chat.messages.length;

    // Trigger rolling conversation summarization if we've accumulated new messages
    const unsummarizedCount = chat.messageCount - chat.lastSummarizedCount;
    if (callLLM && unsummarizedCount >= SUMMARY_TRIGGER_INTERVAL) {
      try {
        const recentMessagesText = chat.messages
          .slice(-SUMMARY_TRIGGER_INTERVAL)
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n');

        const summaryPrompt = `You are a conversation summarizer for a software architecture assistant.
Current rolling memory summary:
${chat.summary || 'No previous summary.'}

Recent dialogue to incorporate:
${recentMessagesText}

Instructions:
Update and output a concise 2-4 sentence summary of the key technical requirements, decisions made, and developer task priorities discussed so far. Do NOT add conversational preamble.`;

        const summaryResult = await callLLM({
          systemPrompt: 'You summarize developer chat history into concise architectural memory context.',
          userPrompt: summaryPrompt,
          temperature: 0.1,
          format: null,
          maxTokens: 300,
          context: 'CHAT_SUMMARIZATION'
        });

        if (summaryResult && summaryResult.text) {
          chat.summary = summaryResult.text.trim();
          chat.lastSummarizedCount = chat.messageCount;
          console.log(`🧠 [Chat Memory] Updated conversation summary for session "${sessionId}"`);
        }
      } catch (sumErr) {
        console.warn('⚠️ [Chat Memory] Summarization failed (non-blocking):', sumErr.message);
      }
    }

    await chat.save();
    return {
      summary: chat.summary,
      messageCount: chat.messageCount,
      messages: chat.messages
    };
  } catch (err) {
    console.warn('⚠️ [Chat Service] Error recording message to MongoDB:', err.message);
    return { summary: '', messageCount: 0 };
  }
}

/**
 * 3. Retrieve conversation context & memory for AI Assistant
 */
async function getChatContext({ sessionId, projectId = null }) {
  if (mongoose.connection.readyState !== 1) {
    return { summary: '', recentMessages: [], fullMessages: [] };
  }

  try {
    const chat = await Chat.findOne({ sessionId });
    if (!chat) {
      return { summary: '', recentMessages: [], fullMessages: [] };
    }

    // Return last 6 messages plus the rolling summary
    const recentMessages = chat.messages.slice(-6).map(m => ({
      role: m.role,
      text: m.content,
      timestamp: m.timestamp
    }));

    return {
      summary: chat.summary || '',
      recentMessages,
      fullMessages: chat.messages
    };
  } catch (err) {
    console.warn('⚠️ [Chat Service] Error fetching chat context:', err.message);
    return { summary: '', recentMessages: [], fullMessages: [] };
  }
}

/**
 * 4. Get chat history for frontend display
 */
async function getSessionHistory(sessionId) {
  if (mongoose.connection.readyState !== 1) {
    return { success: true, messages: [], summary: '' };
  }

  const chat = await Chat.findOne({ sessionId });
  if (!chat) {
    return { success: true, messages: [], summary: '' };
  }

  return {
    success: true,
    sessionId: chat.sessionId,
    projectId: chat.projectId,
    summary: chat.summary,
    messages: chat.messages.map(m => ({
      role: m.role,
      text: m.content,
      timestamp: m.timestamp
    }))
  };
}

module.exports = {
  getOrCreateChatSession,
  recordChatMessage,
  getChatContext,
  getSessionHistory
};
