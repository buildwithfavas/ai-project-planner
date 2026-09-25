require('dotenv').config();
const express = require('express');
const cors = require('cors');



const { connectDB } = require('./config/db');
const { ai } = require('./config/gemini');
const { initializeVectorStore } = require('./services/ragService');
const projectRoutes = require('./routes/projectRoutes');
const { errorHandler, AppError } = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Initialize Database & RAG Vector Store on server startup
connectDB();
initializeVectorStore(ai);


// 2. Global Middlewares
app.use(cors());
app.use(express.json());

// 3. Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'AI Project Planner & Workload Dispatcher API'
  });
});

// 4. Mount Modular API Routes
app.use('/api/project', projectRoutes);

// 5. Handle Undefined Routes (404 Fallback)
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// 6. Global Centralized Error Handler (MUST BE LAST)
app.use(errorHandler);

// 7. Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});
