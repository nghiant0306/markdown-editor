import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import { ollamaClient } from './services/ollama-client';
import { gitHelper } from './services/git-helper';

// Load environment variables
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(cors());
app.use(compression()); // Add gzip compression
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Minimal logging middleware (only for debugging)
if (process.env.DEBUG_LOGGING === 'true') {
  app.use((req, res, next) => {
    console.log(`\n📡 ${req.method} ${req.path}`);
    next();
  });
}

// Initialize services
async function initializeServices() {
  console.log('🚀 Initializing backend services...\n');

  // Check Ollama health
  console.log('🔍 Checking Ollama connection...');
  const isOllamaHealthy = await ollamaClient.isHealthy();
  if (!isOllamaHealthy) {
    console.error(
      '❌ Ollama is not running. Please start Ollama:\n' +
      '   Windows/Mac: Open Ollama app\n' +
      '   Linux: Run `ollama serve`'
    );
    process.exit(1);
  }
  console.log('✅ Ollama connected\n');

  // 🚀 Warm up model to reduce first-request latency
  console.log('🔥 Warming up AI model...');
  try {
    await ollamaClient.warmupModel();
  } catch (error) {
    console.warn('⚠️  Model warmup encountered an issue:', error);
  }

  // Initialize git
  console.log('🔍 Initializing Git repository...');
  try {
    await gitHelper.init();
    console.log('✅ Git initialized\n');
  } catch (error) {
    console.warn('⚠️  Git initialization warning:', error);
  }
}

// Routes
app.use('/api', apiRoutes);

// Root endpoint - show available endpoints
app.get('/', (req, res) => {
  res.json({
    name: 'Markdown Editor Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      chat: 'POST /api/chat',
      chatFast: 'POST /api/chat-fast',
      search: 'POST /api/search',
      index: 'POST /api/index',
      applyDiff: 'POST /api/apply-diff',
      projectState: 'GET /api/project-state',
      fileRead: 'POST /api/file/read',
      fileWrite: 'POST /api/file/write',
      health: 'GET /api/health',
    },
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    error: err.message,
    status: 'error',
  });
});

// Start server
async function start() {
  try {
    await initializeServices();

    app.listen(PORT, HOST as string, () => {
      console.log(`\n✅ Backend server running!`);
      console.log(`📡 http://${HOST}:${PORT}`);
      console.log(`\n📖 API Documentation:`);
      console.log(`   http://${HOST}:${PORT}/\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

start();
