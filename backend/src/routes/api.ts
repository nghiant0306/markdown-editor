import { Router, Request, Response } from 'express';
import { codeAgent } from '../services/code-agent';
import { ollamaClient } from '../services/ollama-client';
import { semanticSearch } from '../services/semantic-search';
import { fileEditor } from '../services/file-editor';
import { requestQueue } from '../services/request-queue';

const router = Router();

/**
 * POST /api/chat-fast
 * Direct chat without context (fastest path)
 */
router.post('/chat-fast', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('⚡ Fast chat:', message);

    // 🚀 Use request queue to limit concurrency
    const response = await requestQueue.add(async () => {
      // Direct call to Ollama, no context gathering
      // 🚀 Lower temperature for faster, more deterministic responses
      return await ollamaClient.generate({
        prompt: message,
        temperature: 0.3,
      });
    });

    res.json({
      response: response.response,
      diffs: [],
      error: undefined,
    });
  } catch (error: any) {
    console.error('Fast chat error:', error);
    res.status(500).json({
      error: error.message,
      response: '',
      diffs: [],
    });
  }
});

/**
 * POST /api/chat
 * Send message to AI agent (with context)
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, projectPath, includeGitContext = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 🚀 Use request queue to limit concurrency
    const response = await requestQueue.add(async () => {
      return await codeAgent.process({
        message,
        projectPath: projectPath || process.cwd(),
        includeGitContext,
      });
    });

    res.json(response);
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error.message,
      response: '',
      diffs: [],
    });
  }
});

/**
 * POST /api/chat-stream
 * Send message and stream response in real-time (Server-Sent Events)
 */
router.post('/chat-stream', async (req: Request, res: Response) => {
  try {
    const { message, projectPath, includeGitContext = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('🌊 Streaming chat:', message);

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial chunk
    res.write('data: {"status":"processing"}\n\n');

    // Start processing in background
    codeAgent.process({
      message,
      projectPath: projectPath || process.cwd(),
      includeGitContext,
    }).then((response) => {
      // Stream response in chunks (100 chars per chunk for demo)
      const responseText = response.response;
      const chunkSize = 100;
      
      for (let i = 0; i < responseText.length; i += chunkSize) {
        const chunk = responseText.substring(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ chunk, progress: Math.round((i / responseText.length) * 100) })}\n\n`);
      }

      // Send final response with diffs
      res.write(`data: ${JSON.stringify({ 
        response: responseText,
        diffs: response.diffs,
        status: 'complete'
      })}\n\n`);
      res.end();
    }).catch((error: any) => {
      res.write(`data: ${JSON.stringify({ error: error.message, status: 'error' })}\n\n`);
      res.end();
    });
  } catch (error: any) {
    console.error('Chat stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/search
 * Search project with semantic search
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, topK = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // 🚀 Use request queue for limiting concurrency
    const results = await requestQueue.add(async () => {
      return await semanticSearch.search(query, topK);
    });

    res.json({
      query,
      results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/index
 * Index project files
 */
router.post('/index', async (req: Request, res: Response) => {
  try {
    console.log('📁 Starting project indexing...');

    const projectFiles = await fileEditor.scanProject();
    console.log(`Found ${projectFiles.length} files`);

    let indexed = 0;
    const errors: string[] = [];

    for (const file of projectFiles) {
      try {
        const content = await fileEditor.readFile(file);
        await semanticSearch.indexFile(file, content.content);
        indexed++;

        if (indexed % 10 === 0) {
          console.log(`✅ Indexed ${indexed}/${projectFiles.length}`);
        }
      } catch (error: any) {
        errors.push(`${file}: ${error.message}`);
      }
    }

    const stats = semanticSearch.getStats();

    res.json({
      message: 'Indexing complete',
      indexed,
      total: projectFiles.length,
      errors: errors.length > 0 ? errors : undefined,
      stats,
    });
  } catch (error: any) {
    console.error('Indexing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/apply-diff
 * Apply generated diffs to files
 */
router.post('/apply-diff', async (req: Request, res: Response) => {
  try {
    const { diffs } = req.body;

    if (!diffs || !Array.isArray(diffs)) {
      return res.status(400).json({ error: 'Diffs array is required' });
    }

    await codeAgent.applyDiffs(diffs);

    res.json({
      success: true,
      appliedCount: diffs.length,
    });
  } catch (error: any) {
    console.error('Apply diff error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/project-state
 * Get current project state
 */
router.get('/project-state', async (req: Request, res: Response) => {
  try {
    const state = await codeAgent.getProjectState();

    if (!state) {
      return res.status(500).json({ error: 'Failed to get project state' });
    }

    res.json(state);
  } catch (error: any) {
    console.error('Project state error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/file/read
 * Read file content
 */
router.post('/file/read', async (req: Request, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const content = await fileEditor.readFile(filePath);
    res.json(content);
  } catch (error: any) {
    console.error('File read error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/file/write
 * Write file content
 */
router.post('/file/write', async (req: Request, res: Response) => {
  try {
    const { filePath, content } = req.body;

    if (!filePath || !content) {
      return res.status(400).json({ error: 'filePath and content are required' });
    }

    await fileEditor.writeFile(filePath, content);
    res.json({ success: true, filePath });
  } catch (error: any) {
    console.error('File write error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/health
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await codeAgent.getProjectState();

    res.json({
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

/**
 * 🚀 GET /api/stats/queue
 * Get request queue statistics
 */
router.get('/stats/queue', (req: Request, res: Response) => {
  try {
    const stats = requestQueue.getStats();
    
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
