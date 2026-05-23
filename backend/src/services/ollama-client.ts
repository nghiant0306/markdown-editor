import axios, { AxiosInstance } from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

export interface OllamaGenerateRequest {
  prompt: string;
  model?: string;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  context?: number[];
}

export interface OllamaGenerateResponse {
  response: string;
  context?: number[];
  done: boolean;
}

export interface OllamaEmbeddingRequest {
  prompt: string;
  model?: string;
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;
  private embedModel: string;
  private client: AxiosInstance;
  private responseCache: Map<string, string> = new Map(); // 🚀 Response cache
  private maxCacheSize: number = 100; // Limit cache to 100 entries
  private lastRequest: string | null = null; // 🚀 Request deduplication
  private lastRequestTime: number = 0;
  private lastResponse: string | null = null;
  private isModelWarmed: boolean = false; // 🚀 Track if model is warmed up
  private retryConfig = {
    maxRetries: 3,
    initialDelay: 100,
    maxDelay: 5000,
  };

  constructor(
    baseUrl = 'http://localhost:11434',
    defaultModel = 'qwen2.5-coder:1.5b-instruct-q4_K_M',
    embedModel = 'nomic-embed-text'
  ) {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.embedModel = embedModel;

    // Setup HTTP connection pooling for better performance (optimized for 1.5B model)
    const httpAgent = new HttpAgent({
      keepAlive: true,
      maxSockets: 10,       // 🚀 Reduced from 50 for 1.5B model
      maxFreeSockets: 5,    // 🚀 Reduced from 10
      timeout: 60000,
    });

    const httpsAgent = new HttpsAgent({
      keepAlive: true,
      maxSockets: 10,       // 🚀 Reduced from 50 for 1.5B model
      maxFreeSockets: 5,    // 🚀 Reduced from 10
      timeout: 60000,
    });

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 120000, // 120 seconds for large models
      httpAgent,
      httpsAgent,
    });
  }

  /**
   * Get code generation model from environment (simplified)
   */
  async getAvailableCodeModel(): Promise<string> {
    console.log(`✅ Using model from env: ${this.defaultModel}`);
    return this.defaultModel;
  }

  /**
   * Check if Ollama service is running and accessible
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('Ollama health check failed:', error);
      return false;
    }
  }

  /**
   * Warm up model to reduce first-request latency
   */
  async warmupModel(): Promise<void> {
    if (this.isModelWarmed) {
      return;
    }

    try {
      console.log('🔥 Warming up model...');
      const model = await this.getAvailableCodeModel();
      
      // Send a small test prompt to load model into memory
      await this.client.post('/api/generate', {
        model,
        prompt: 'hello',
        stream: false,
        temperature: 0.1,
      }, {
        timeout: 60000, // First load can take time
      });

      this.isModelWarmed = true;
      console.log('✅ Model warmed up');
    } catch (error) {
      console.warn('⚠️  Model warmup failed:', error);
      // Don't fail if warmup fails
    }
  }

  /**
   * Retry logic for failed requests
   */
  private async retryRequest<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any;
    let delay = this.retryConfig.initialDelay;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }

        // Retry on server errors (5xx) or network errors
        if (attempt < this.retryConfig.maxRetries) {
          console.warn(`⚠️  Request failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, this.retryConfig.maxDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Generate text using Ollama (with response caching, deduplication & retry logic)
   */
  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    try {
      // Use requested model or auto-detect available one
      const modelToUse = request.model || (await this.getAvailableCodeModel());
      const cacheKey = `${modelToUse}:${request.prompt}`;

      // 🚀 Check for duplicate request (within 2 seconds)
      const now = Date.now();
      if (this.lastRequest === cacheKey && (now - this.lastRequestTime) < 2000 && this.lastResponse) {
        console.log('⚡ Duplicate request detected - returning cached response');
        return { response: this.lastResponse, done: true };
      }

      // 🚀 Check response cache first
      const cached = this.responseCache.get(cacheKey);
      if (cached) {
        this.lastRequest = cacheKey;
        this.lastRequestTime = now;
        this.lastResponse = cached;
        console.log('⚡ Cache HIT - returning cached response');
        return { response: cached, done: true };
      }

      // 🚀 Use retry logic for generation
      const response = await this.retryRequest(async () => {
        return await this.client.post('/api/generate', {
          model: modelToUse,
          prompt: request.prompt,
          stream: request.stream !== undefined ? request.stream : false,
          temperature: request.temperature !== undefined ? request.temperature : 0.3,
          top_p: request.top_p !== undefined ? request.top_p : 0.9,
          context: request.context,
        }, {
          timeout: 120000, // 120 seconds timeout for large models
        });
      });

      // 🚀 Cache the response
      if (this.responseCache.size >= this.maxCacheSize) {
        const iterator = this.responseCache.keys().next();
        if (!iterator.done && iterator.value) {
          this.responseCache.delete(iterator.value); // Remove oldest entry
        }
      }
      const responseText = response.data.response || '';
      this.responseCache.set(cacheKey, responseText);
      
      // 🚀 Store as last request for deduplication
      this.lastRequest = cacheKey;
      this.lastRequestTime = now;
      this.lastResponse = responseText;

      return response.data as OllamaGenerateResponse;
    } catch (error: any) {
      throw new Error(`Ollama generation failed: ${error.message}`);
    }
  }

  /**
   * Get embedding model from environment (simplified)
   */
  async getAvailableEmbedModel(): Promise<string> {
    console.log(`✅ Using embedding model from env: ${this.embedModel}`);
    return this.embedModel;
  }

  /**
   * Generate embeddings for text (with retry logic)
   */
  async embed(text: string): Promise<number[]> {
    try {
      // Use auto-detected embedding model
      const modelToUse = await this.getAvailableEmbedModel();

      // 🚀 Use retry logic for embedding
      const response = await this.retryRequest(async () => {
        return await this.client.post('/api/embeddings', {
          model: modelToUse,
          prompt: text,
        }, {
          timeout: 30000, // 30 seconds timeout for embeddings
        });
      });

      return response.data.embedding as number[];
    } catch (error: any) {
      throw new Error(`Ollama embedding failed: ${error.message}`);
    }
  }

  /**
   * Generate with streaming (for real-time responses)
   */
  async generateStream(
    request: OllamaGenerateRequest,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: request.model || this.defaultModel,
          prompt: request.prompt,
          stream: true,
          temperature: request.temperature !== undefined ? request.temperature : 0.3,
          top_p: request.top_p !== undefined ? request.top_p : 0.9,
        },
        {
          responseType: 'stream',
        }
      );

      let fullResponse = '';

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim());
            for (const line of lines) {
              const json = JSON.parse(line);
              if (json.response) {
                fullResponse += json.response;
                onChunk(json.response);
              }
            }
          } catch (e) {
            // Handle partial JSON
          }
        });

        response.data.on('end', () => {
          resolve(fullResponse);
        });

        response.data.on('error', reject);
      });
    } catch (error: any) {
      throw new Error(`Ollama streaming failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const ollamaClient = new OllamaClient(
  process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  process.env.OLLAMA_MODEL || 'qwen2.5-coder:1.5b-instruct-q4_K_M',
  process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'
);
