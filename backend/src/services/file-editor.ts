import * as fs from 'fs-extra';
import * as path from 'path';

export interface FileContent {
  path: string;
  content: string;
  language: string;
}

export interface FileDiff {
  filePath: string;
  original: string;
  modified: string;
  patch: string;
}

export class FileEditor {
  private projectPath: string;
  private allowedExtensions = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.java',
    '.cs',
    '.go',
    '.rs',
    '.cpp',
    '.c',
    '.h',
    '.json',
    '.yaml',
    '.yml',
    '.xml',
    '.md',
    '.html',
    '.css',
    '.scss',
    '.less',
  ];

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<FileContent> {
    try {
      const fullPath = this.resolvePath(filePath);
      this.validatePath(fullPath);

      const content = await fs.readFile(fullPath, 'utf-8');
      const language = this.getLanguage(filePath);

      return { path: filePath, content, language };
    } catch (error: any) {
      throw new Error(`Failed to read file '${filePath}': ${error.message}`);
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = this.resolvePath(filePath);
      this.validatePath(fullPath);

      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf-8');
      console.log(`✅ Wrote file '${filePath}'`);
    } catch (error: any) {
      throw new Error(`Failed to write file '${filePath}': ${error.message}`);
    }
  }

  /**
   * Apply a diff to a file
   */
  async applyDiff(filePath: string, patch: string): Promise<void> {
    try {
      const original = await this.readFile(filePath);
      const modified = this.applyPatch(original.content, patch);

      // Validate syntax if possible
      this.validateSyntax(filePath, modified);

      await this.writeFile(filePath, modified);
    } catch (error: any) {
      throw new Error(`Failed to apply diff to '${filePath}': ${error.message}`);
    }
  }

  /**
   * Get directory contents
   */
  async listDirectory(dirPath: string): Promise<string[]> {
    try {
      const fullPath = this.resolvePath(dirPath);
      this.validatePath(fullPath);

      if (!fs.existsSync(fullPath)) {
        return [];
      }

      const entries = await fs.readdir(fullPath);
      return entries;
    } catch (error: any) {
      throw new Error(`Failed to list directory '${dirPath}': ${error.message}`);
    }
  }

  /**
   * Check if path exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(filePath);
      return await fs.pathExists(fullPath);
    } catch {
      return false;
    }
  }

  /**
   * Get file statistics
   */
  async getStats(filePath: string) {
    try {
      const fullPath = this.resolvePath(filePath);
      this.validatePath(fullPath);

      const stat = await fs.stat(fullPath);
      return {
        size: stat.size,
        created: stat.birthtime,
        modified: stat.mtime,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
      };
    } catch (error: any) {
      throw new Error(`Failed to get stats for '${filePath}': ${error.message}`);
    }
  }

  /**
   * Scan project files
   */
  async scanProject(): Promise<string[]> {
    const files: string[] = [];

    const scan = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir);

        for (const entry of entries) {
          // Skip ignored directories
          if (['.git', 'node_modules', '.next', 'dist', 'build', 'out'].includes(entry)) {
            continue;
          }

          const fullPath = path.join(dir, entry);
          const stat = await fs.stat(fullPath);

          if (stat.isDirectory()) {
            await scan(fullPath);
          } else if (this.isAllowedFile(entry)) {
            const relativePath = path.relative(this.projectPath, fullPath);
            files.push(relativePath);
          }
        }
      } catch (error) {
        // Skip access errors
      }
    };

    await scan(this.projectPath);
    return files;
  }

  /**
   * Resolve full path
   */
  private resolvePath(filePath: string): string {
    return path.resolve(this.projectPath, filePath);
  }

  /**
   * Validate path is within project
   */
  private validatePath(fullPath: string): void {
    const resolved = path.resolve(fullPath);
    const relative = path.relative(this.projectPath, resolved);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Access denied: Path outside project directory');
    }
  }

  /**
   * Get language from file extension
   */
  private getLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.md': 'markdown',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
    };
    return map[ext] || 'text';
  }

  /**
   * Check if file should be indexed
   */
  private isAllowedFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.allowedExtensions.includes(ext);
  }

  /**
   * Validate syntax (basic check)
   */
  private validateSyntax(filePath: string, content: string): void {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.json') {
      try {
        JSON.parse(content);
      } catch (e) {
        throw new Error('Invalid JSON syntax');
      }
    }

    // Add more validation as needed
  }

  /**
   * Apply unified diff patch (simplified)
   */
  private applyPatch(original: string, patch: string): string {
    const lines = original.split('\n');
    const patchLines = patch.split('\n');

    let lineNum = 0;

    for (const patchLine of patchLines) {
      if (patchLine.startsWith('+') && !patchLine.startsWith('+++')) {
        lines.splice(lineNum++, 0, patchLine.substring(1));
      } else if (patchLine.startsWith('-') && !patchLine.startsWith('---')) {
        lines.splice(lineNum, 1);
      } else if (!patchLine.startsWith('@')) {
        lineNum++;
      }
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const fileEditor = new FileEditor(process.cwd());
