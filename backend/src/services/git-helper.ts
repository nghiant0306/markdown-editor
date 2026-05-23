import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
}

export interface FileChange {
  file: string;
  status: 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?';
  additions?: number;
  deletions?: number;
}

export class GitHelper {
  private git: SimpleGit;
  private projectPath: string;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.git = simpleGit(projectPath);
  }

  /**
   * Initialize git repo if not already initialized
   */
  async init(): Promise<void> {
    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        await this.git.init();
        console.log('✅ Initialized git repository');
      }
    } catch (error) {
      console.error('Git init failed:', error);
    }
  }

  /**
   * Commit changes with a message
   */
  async commit(message: string, files?: string[]): Promise<string> {
    try {
      if (files && files.length > 0) {
        await this.git.add(files);
      } else {
        await this.git.add('.');
      }

      const result = await this.git.commit(message);
      console.log(`✅ Committed: ${message}`);
      return result.commit;
    } catch (error: any) {
      if (error.message?.includes('nothing to commit')) {
        console.log('⚠️ Nothing to commit');
        return '';
      }
      throw new Error(`Commit failed: ${error.message}`);
    }
  }

  /**
   * Auto-commit changes made by AI
   */
  async autoCommit(changes: string[]): Promise<string> {
    const timestamp = new Date().toISOString();
    const message = `AI: Auto-commit ${timestamp}\n\nChanged files:\n${changes.map(f => `- ${f}`).join('\n')}`;
    return this.commit(message, changes);
  }

  /**
   * Get commit history
   */
  async getHistory(count = 20): Promise<CommitInfo[]> {
    try {
      const log = await this.git.log([`-${count}`]);
      return log.all.map(commit => ({
        hash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: new Date(commit.date).toISOString(),
        files: [], // Will need to fetch separately if needed
      }));
    } catch (error: any) {
      throw new Error(`Failed to get history: ${error.message}`);
    }
  }

  /**
   * Get current branch
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch (error: any) {
      throw new Error(`Failed to get current branch: ${error.message}`);
    }
  }

  /**
   * Get list of branches
   */
  async listBranches(): Promise<string[]> {
    try {
      const branchSummary = await this.git.branch();
      return branchSummary.all;
    } catch (error: any) {
      throw new Error(`Failed to list branches: ${error.message}`);
    }
  }

  /**
   * Get list of modified files
   */
  async getChangedFiles(): Promise<FileChange[]> {
    try {
      const status = await this.git.status();
      const changes: FileChange[] = [];

      status.created.forEach(f => changes.push({ file: f, status: 'A' }));
      status.deleted.forEach(f => changes.push({ file: f, status: 'D' }));
      status.modified.forEach(f => changes.push({ file: f, status: 'M' }));
      status.renamed.forEach(f => changes.push({ file: f.from, status: 'R' }));

      return changes;
    } catch (error: any) {
      throw new Error(`Failed to get changed files: ${error.message}`);
    }
  }

  /**
   * Get diff for a specific file
   */
  async getDiff(filePath?: string): Promise<string> {
    try {
      if (filePath) {
        return await this.git.diff([filePath]);
      } else {
        return await this.git.diff();
      }
    } catch (error: any) {
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }

  /**
   * Get diff between two commits
   */
  async getDiffBetweenCommits(hash1: string, hash2: string): Promise<string> {
    try {
      return await this.git.diff([`${hash1}..${hash2}`]);
    } catch (error: any) {
      throw new Error(`Failed to get diff between commits: ${error.message}`);
    }
  }

  /**
   * Revert to a specific commit
   */
  async revertToCommit(hash: string): Promise<void> {
    try {
      await this.git.revert(hash);
      console.log(`✅ Reverted to commit ${hash}`);
    } catch (error: any) {
      throw new Error(`Failed to revert: ${error.message}`);
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName: string): Promise<void> {
    try {
      await this.git.checkoutLocalBranch(branchName);
      console.log(`✅ Created branch '${branchName}'`);
    } catch (error: any) {
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
   * Switch to a branch
   */
  async switchBranch(branchName: string): Promise<void> {
    try {
      await this.git.checkout(branchName);
      console.log(`✅ Switched to branch '${branchName}'`);
    } catch (error: any) {
      throw new Error(`Failed to switch branch: ${error.message}`);
    }
  }

  /**
   * Check if repo is clean (no uncommitted changes)
   */
  async isClean(): Promise<boolean> {
    try {
      const status = await this.git.status();
      return status.isClean();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get repository status
   */
  async getStatus() {
    try {
      return await this.git.status();
    } catch (error: any) {
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }
}

// Export singleton instance
export const gitHelper = new GitHelper(process.cwd());
