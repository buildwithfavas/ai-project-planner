require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
// const { ai } = require('./config/gemini');
const { initializeVectorStore } = require('./services/ragService');
const projectRoutes = require('./routes/projectRoutes');
const { errorHandler, AppError } = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Initialize Database on server startup
connectDB();
// initializeVectorStore(); // Vector store initialized with rule policies

// 2. Global Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 3. Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'AI Project Planner & Workload Dispatcher API',
    uptime: process.uptime()
  });
});

// 4. Mount Modular API Routes
app.use('/api/project', projectRoutes);
app.use('/api/planner', projectRoutes);

// 5. Handle Undefined Routes (404 Fallback)
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// 6. Global Centralized Error Handler (MUST BE LAST)
app.use(errorHandler);

// 7. Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

// 8. Graceful Shutdown
const handleGracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Closing HTTP server and database connections...`);
  server.close(async () => {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log('🍃 MongoDB connection closed.');
      }
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
