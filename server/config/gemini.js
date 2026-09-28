const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL: GEMINI_API_KEY is not set in environment variables.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

module.exports = { ai };
