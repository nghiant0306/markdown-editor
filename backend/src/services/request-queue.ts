/**
 * Request Queue Service - Manages concurrent request limits using PQueue-like pattern
 * Prevents overwhelming the system and reduces timeout errors
 */

export interface QueuedTask<T> {
  fn: () => Promise<T>;
  priority?: number;
}

export class RequestQueue {
  private queue: QueuedTask<any>[] = [];
  private activeRequests: number = 0;
  private maxConcurrency: number;
  private processInterval: NodeJS.Timeout | null = null;

  constructor(maxConcurrency = 8) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Add a task to the queue
   */
  async add<T>(fn: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn: async () => {
          try {
            const result = await fn();
            resolve(result);
            return result;
          } catch (error) {
            reject(error);
            throw error;
          }
        },
        priority,
      });

      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Start processing
      this.process();
    });
  }

  /**
   * Process queued tasks
   */
  private process(): void {
    if (this.processInterval) {
      return; // Already processing
    }

    this.processInterval = setInterval(() => {
      while (this.activeRequests < this.maxConcurrency && this.queue.length > 0) {
        const task = this.queue.shift();
        if (task) {
          this.activeRequests++;
          task
            .fn()
            .finally(() => {
              this.activeRequests--;
            });
        }
      }

      // Stop processing if queue is empty
      if (this.queue.length === 0 && this.activeRequests === 0) {
        if (this.processInterval) {
          clearInterval(this.processInterval);
          this.processInterval = null;
        }
      }
    }, 10);
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrency: this.maxConcurrency,
      totalCapacity: this.activeRequests + this.queue.length,
    };
  }

  /**
   * Adjust concurrency limit
   */
  setConcurrency(limit: number): void {
    this.maxConcurrency = Math.max(1, limit);
  }

  /**
   * Clear all pending tasks
   */
  clear(): void {
    this.queue = [];
  }
}

// Export singleton instance
export const requestQueue = new RequestQueue(8); // Default to 8 concurrent requests
