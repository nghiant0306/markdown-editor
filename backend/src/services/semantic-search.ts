import { ollamaClient } from './ollama-client';

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export interface IndexedFile {
  path: string;
  content: string;
  chunks: FileChunk[];
}

export interface FileChunk {
  id: string;
  text: string;
  startLine: number;
  endLine: number;
  embedding?: number[];
}

export class SemanticSearch {
  private index: Map<string, FileChunk> = new Map();
  private fileIndex: Map<string, IndexedFile> = new Map();
  private chunkSize: number;
  private topK: number;
  private searchCache: Map<string, SearchResult[]> = new Map(); // 🚀 Search cache
  private embeddingCache: Map<string, number[]> = new Map(); // 🚀 Embedding cache for texts
  private queryEmbeddingCache: Map<string, number[]> = new Map(); // 🚀 Query embedding cache
  private maxCacheSize: number = 50; // Limit cache to 50 queries
  private maxEmbeddingCacheSize: number = 200; // Limit embedding cache to 200 entries

  constructor(chunkSize = 50, topK = 10) {
    this.chunkSize = chunkSize;
    this.topK = topK;
  }

  /**
   * Get or compute embedding for text (with caching)
   */
  private async getEmbedding(text: string, isQuery: boolean = false): Promise<number[]> {
    const cache = isQuery ? this.queryEmbeddingCache : this.embeddingCache;
    
    // Check cache first
    if (cache.has(text)) {
      return cache.get(text)!;
    }

    // Compute embedding
    const embedding = await ollamaClient.embed(text);

    // Cache it
    if (cache.size >= this.maxEmbeddingCacheSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(text, embedding);

    return embedding;
  }

  /**
   * Index a file for semantic search (with parallel embedding and caching)
   */
  async indexFile(filePath: string, content: string): Promise<void> {
    const chunks = this.splitIntoChunks(filePath, content);

    // Generate embeddings in parallel (batch of 8 at a time)
    const batchSize = 8;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Run up to 8 embeddings in parallel
      await Promise.allSettled(
        batch.map(async (chunk) => {
          try {
            chunk.embedding = await this.getEmbedding(chunk.text, false);
            this.index.set(chunk.id, chunk);
          } catch (error) {
            console.error(`Failed to embed chunk ${chunk.id}:`, error);
          }
        })
      );
    }

    this.fileIndex.set(filePath, {
      path: filePath,
      content,
      chunks,
    });

    console.log(
      `✅ Indexed '${filePath}' - ${chunks.length} chunks, ${this.index.size} total`
    );
  }

  /**
   * Search for relevant code chunks (with caching)
   */
  async search(query: string, topK?: number): Promise<SearchResult[]> {
    const k = topK || this.topK;

    if (this.index.size === 0) {
      console.warn('⚠️ Index is empty. Please index files first.');
      return [];
    }

    // 🚀 Check search cache first
    const cacheKey = `${query}:${k}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      console.log('⚡ Search cache HIT - returning cached results');
      return cached;
    }

    try {
      // Generate embedding for query (with cache)
      const queryEmbedding = await this.getEmbedding(query, true);

      // Calculate similarity scores for all chunks
      const scores: Array<{ id: string; score: number }> = [];

      for (const [id, chunk] of this.index.entries()) {
        if (chunk.embedding) {
          const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
          scores.push({ id, score });
        }
      }

      // Sort by score and get top K
      scores.sort((a, b) => b.score - a.score);
      const topResults = scores.slice(0, k);

      // Build search results
      const results: SearchResult[] = topResults
        .map(({ id, score }) => {
          const chunk = this.index.get(id)!;
          return {
            id,
            content: chunk.text,
            score,
            metadata: {
              filePath: id.split(':')[0],
              startLine: chunk.startLine,
              endLine: chunk.endLine,
            },
          };
        })
        .filter(r => r.score > 0.3); // Filter low similarity scores

      // 🚀 Cache the results
      if (this.searchCache.size >= this.maxCacheSize) {
        const iterator = this.searchCache.keys().next();
        if (!iterator.done && iterator.value) {
          this.searchCache.delete(iterator.value); // Remove oldest entry
        }
      }
      this.searchCache.set(cacheKey, results);

      return results;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  /**
   * Clear specific file from index
   */
  clearFile(filePath: string): void {
    const indexed = this.fileIndex.get(filePath);
    if (indexed) {
      for (const chunk of indexed.chunks) {
        this.index.delete(chunk.id);
      }
      this.fileIndex.delete(filePath);
      console.log(`✅ Cleared '${filePath}' from index`);
    }
    // 🚀 Clear search cache when index changes
    this.searchCache.clear();
  }

  /**
   * Clear entire index
   */
  clearAll(): void {
    this.index.clear();
    this.fileIndex.clear();
    this.searchCache.clear(); // 🚀 Clear search cache
    this.embeddingCache.clear(); // 🚀 Clear embedding cache
    this.queryEmbeddingCache.clear(); // 🚀 Clear query embedding cache
    console.log('✅ Cleared entire index and caches');
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      totalChunks: this.index.size,
      totalFiles: this.fileIndex.size,
      averageChunkSize: this.chunkSize,
    };
  }

  /**
   * Split content into chunks
   */
  private splitIntoChunks(filePath: string, content: string): FileChunk[] {
    const lines = content.split('\n');
    const chunks: FileChunk[] = [];

    for (let i = 0; i < lines.length; i += this.chunkSize) {
      const chunkLines = lines.slice(i, Math.min(i + this.chunkSize, lines.length));
      const chunkText = chunkLines.join('\n');

      if (chunkText.trim()) {
        chunks.push({
          id: `${filePath}:${i}`,
          text: chunkText,
          startLine: i,
          endLine: Math.min(i + this.chunkSize - 1, lines.length - 1),
        });
      }
    }

    return chunks;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }
}

// Export singleton instance
export const semanticSearch = new SemanticSearch(
  parseInt(process.env.SEARCH_CHUNK_SIZE || '50'),
  parseInt(process.env.SEARCH_TOP_K || '10')
);
