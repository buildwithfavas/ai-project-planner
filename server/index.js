require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { initializeVectorStore } = require('./services/ragService');
const projectRoutes = require('./routes/projectRoutes');
const { errorHandler, AppError } = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();
initializeVectorStore();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'AI Project Planner & Workload Dispatcher API',
    uptime: process.uptime()
  });
});

app.use('/api/project', projectRoutes);
app.use('/api/planner', projectRoutes);

app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
});

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
