import { ollamaClient } from './ollama-client';
import { semanticSearch } from './semantic-search';
import { gitHelper } from './git-helper';
import { fileEditor } from './file-editor';

export interface CodeAgentRequest {
  message: string;
  projectPath?: string;
  includeGitContext?: boolean;
}

export interface CodeAgentResponse {
  response: string;
  diffs: Array<{
    filePath: string;
    patch: string;
  }>;
  error?: string;
}

export class CodeAgent {
  private isIndexed: boolean = false;
  private lastIndexTime: number = 0;
  private indexCacheMs: number = 60000; // Cache index for 60 seconds

  /**
   * Check if message is simple and doesn't need context
   */
  private isSimpleMessage(message: string): boolean {
    const simpleKeywords = ['hello', 'hi', 'hey', 'thanks', 'ok', 'sure', 'yes', 'no', 'what', 'how', 'why', 'when', 'where', 'who'];
    const lower = message.toLowerCase().trim();
    return simpleKeywords.some(keyword => lower === keyword || lower.startsWith(keyword + ' '));
  }

  /**
   * Check if message needs git context (complex questions about changes)
   */
  private needsGitContext(message: string): boolean {
    const gitKeywords = ['commit', 'change', 'recent', 'history', 'branch', 'git', 'version'];
    const lower = message.toLowerCase();
    return gitKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Check if message needs file indexing (code exploration)
   */
  private needsIndexing(message: string): boolean {
    const indexKeywords = ['find', 'search', 'where', 'function', 'class', 'component', 'file', 'export', 'import'];
    const lower = message.toLowerCase();
    return indexKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Process user request with full context
   */
  async process(request: CodeAgentRequest): Promise<CodeAgentResponse> {
    try {
      console.log('🤖 Processing request:', request.message);

      // For simple messages, use fast Ollama directly
      if (this.isSimpleMessage(request.message)) {
        console.log('⚡ Simple message detected - using fast path');
        const aiResponse = await ollamaClient.generate({
          prompt: request.message,
          temperature: 0.7,
        });

        return {
          response: aiResponse.response,
          diffs: [],
        };
      }

      // For complex messages, build minimal context (only if needed)
      let context = `User request: ${request.message}\n\n`;

      // 🚀 Add git context ONLY if explicitly requested AND message needs it
      if (request.includeGitContext === true && this.needsGitContext(request.message)) {
        try {
          console.log('📜 Fetching git history...');
          const history = await gitHelper.getHistory(2);
          if (history.length > 0) {
            context += `Recent changes:\n`;
            history.slice(0, 2).forEach(commit => {
              context += `- ${commit.message}\n`;
            });
            context += '\n';
          }
        } catch (error) {
          console.warn('⚠️  Failed to get git context');
        }
      }

      // 🚀 Index files ONLY when needed (code exploration questions)
      const now = Date.now();
      if (this.needsIndexing(request.message) && (!this.isIndexed || (now - this.lastIndexTime) > this.indexCacheMs)) {
        console.log('📁 Indexing project files (background)...');
        const projectFiles = await fileEditor.scanProject();

        // Index only first 20 files (not 30) in parallel
        const filesToIndex = projectFiles.slice(0, 20);
        
        // Index in parallel batches (don't wait for completion)
        const indexingPromise = Promise.allSettled(
          filesToIndex.map(async (file) => {
            try {
              const content = await fileEditor.readFile(file);
              await semanticSearch.indexFile(file, content.content);
            } catch (error) {
              // Silently skip errors
            }
          })
        );
        
        // Fire and forget - don't wait
        indexingPromise.catch(() => {});
        
        this.isIndexed = true;
        this.lastIndexTime = now;
      }

      // Generate response with minimal context
      console.log('🧠 Generating response...');

      const aiResponse = await ollamaClient.generate({
        prompt: context,
        temperature: 0.3,
      });

      // Parse diffs if present
      const diffs = this.extractDiffs(aiResponse.response);

      console.log(`✅ Generated response`);

      return {
        response: aiResponse.response,
        diffs,
      };
    } catch (error: any) {
      console.error('❌ Agent processing failed:', error);
      return {
        response: '',
        diffs: [],
        error: error.message,
      };
    }
  }

  /**
   * Apply generated diffs to files
   */
  async applyDiffs(
    diffs: Array<{
      filePath: string;
      patch: string;
    }>
  ): Promise<void> {
    console.log(`\n📝 Applying ${diffs.length} diffs...`);

    const changedFiles: string[] = [];

    for (const diff of diffs) {
      try {
        await fileEditor.applyDiff(diff.filePath, diff.patch);
        changedFiles.push(diff.filePath);
      } catch (error) {
        console.error(`Failed to apply diff to ${diff.filePath}:`, error);
        throw error;
      }
    }

    // Auto-commit changes
    if (changedFiles.length > 0 && process.env.AUTO_COMMIT_ENABLED === 'true') {
      try {
        await gitHelper.autoCommit(changedFiles);
      } catch (error) {
        console.warn('Failed to auto-commit:', error);
      }
    }

    console.log(`✅ Applied ${changedFiles.length} files`);
  }

  /**
   * Extract diffs from AI response
   */
  private extractDiffs(
    response: string
  ): Array<{ filePath: string; patch: string }> {
    const diffs: Array<{ filePath: string; patch: string }> = [];

    // Look for ```diff blocks
    const diffRegex = /```(?:diff|patch)\n([\s\S]*?)```/g;
    let match;

    while ((match = diffRegex.exec(response)) !== null) {
      const diffContent = match[1];

      // Try to extract filename from diff header
      const fileMatch = diffContent.match(/^--- a\/(.*?)\n\+\+\+ b\//m);
      const fileName = fileMatch ? fileMatch[1] : `generated-${diffs.length}.ts`;

      diffs.push({
        filePath: fileName,
        patch: diffContent,
      });
    }

    return diffs;
  }

  /**
   * Get current project state for display
   */
  async getProjectState() {
    try {
      const changed = await gitHelper.getChangedFiles();
      const branch = await gitHelper.getCurrentBranch();
      const stats = semanticSearch.getStats();

      return {
        branch,
        changedFiles: changed,
        indexStats: stats,
      };
    } catch (error: any) {
      console.error('Failed to get project state:', error);
      return null;
    }
  }
}

// Export singleton instance
export const codeAgent = new CodeAgent();
