import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import './App.css';
import MenuBar from './components/MenuBar';
import Toolbar from './components/Toolbar';
import EditorPanel from './components/EditorPanel';
import PreviewPanel from './components/PreviewPanel';
import StatusBar from './components/StatusBar';
import ContextMenu from './components/ContextMenu';
import FileExplorer from './components/FileExplorer';
import HelpPanel from './components/HelpPanel';
import { FindReplacePanel } from './components/FindReplacePanel';
import { GoToLinePanel } from './components/GoToLinePanel';
import ChatPanel from './components/ChatPanel';
import SettingsModal from './components/SettingsModal';

interface EditorState {
  content: string;
  filename: string;
  isDirty: boolean;
  zoom: number;
}

interface OpenFile {
  id: string;
  name: string;
  content: string;
  isDirty: boolean;
  handle?: any;   // FileSystemFileHandle for Explorer files
  fileRef?: File; // File object for dialog-opened files
}

const App: React.FC = () => {
  const [editorState, setEditorState] = useState<EditorState>({
    content: `# Welcome to Markdown Editor

Start typing your markdown here...

## Features
- Live preview
- Zoom in/out
- Multiple formatting options
- File management
- **Right-click on images to zoom!**

## Test Image - Try Right-Click Here!

![Test Image](/test-image.svg)

This is a test image. Try right-clicking on it!

## More Features
- Markdown support
- Live preview pane
- Resizable panels
- Mermaid diagrams

---

### Instructions:
1. Use toolbar **Image Zoom** controls to zoom in/out (50% to 1600%)
2. Or double-click on images/diagrams to zoom in/out
3. Press Reset button to go back to 100%
`,
    filename: 'Untitled.md',
    isDirty: false,
    zoom: 100,
  });

  const [splitPosition, setSplitPosition] = useState(50); // percentage
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [explorerWidth, setExplorerWidth] = useState(280);
  const [encoding, setEncoding] = useState('UTF-8');
  const [scrollSyncRatio, setScrollSyncRatio] = useState<number | null>(null);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [findReplaceShowReplace, setFindReplaceShowReplace] = useState(false);
  const [findMatches, setFindMatches] = useState<Array<{ start: number; end: number }>>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [replacedMatches, setReplacedMatches] = useState<Array<{ start: number; end: number }>>([]);
  const [goToLineOpen, setGoToLineOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewMaximized, setPreviewMaximized] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const scrollSyncSourceRef = useRef<'editor' | 'preview' | null>(null);
  const scrollingOnDiagramRef = useRef(false);
  const scrollingOnDiagramTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const isResizingExplorer = useRef(false);
  const explorerStartX = useRef(0);
  const explorerStartWidth = useRef(280);
  const openFilesRef = useRef(openFiles);
  useEffect(() => { openFilesRef.current = openFiles; }, [openFiles]);
  const encodingRef = useRef(encoding);
  useEffect(() => { encodingRef.current = encoding; }, [encoding]);

  const handleContentChange = useCallback((newContent: string) => {
    setEditorState(prev => ({
      ...prev,
      content: newContent,
      isDirty: true,
    }));
    
    // Update the corresponding file in openFiles
    if (currentFileId) {
      setOpenFiles(prev => 
        prev.map(f => 
          f.id === currentFileId 
            ? { ...f, content: newContent, isDirty: true }
            : f
        )
      );
    }
  }, [currentFileId]);

  const handleSave = useCallback(() => {
    // If there's a currently open file from openFiles, save that one
    if (currentFileId && openFilesRef.current.length > 0) {
      const currentFile = openFilesRef.current.find(f => f.id === currentFileId);
      if (currentFile) {
        // Try to save directly to file if handle is available (File System Access API)
        if (currentFile.handle) {
          currentFile.handle.createWritable().then((writable: any) => {
            writable.write(currentFile.content);
            writable.close();
            // Clear the isDirty flag for this file
            setOpenFiles(prev => 
              prev.map(f => 
                f.id === currentFileId 
                  ? { ...f, isDirty: false }
                  : f
              )
            );
          }).catch((err: any) => {
            console.error('Error saving file:', err);
            alert('Error saving file: ' + err?.message);
          });
          return;
        }
        
        // Fallback: Download the file
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(currentFile.content));
        element.setAttribute('download', currentFile.name);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        
        // Clear the isDirty flag for this file
        setOpenFiles(prev => 
          prev.map(f => 
            f.id === currentFileId 
              ? { ...f, isDirty: false }
              : f
          )
        );
        return;
      }
    }
    
    // Otherwise, save the main editor state (fallback for backward compatibility)
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(editorState.content));
    element.setAttribute('download', editorState.filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setEditorState(prev => ({ ...prev, isDirty: false }));
  }, [currentFileId, editorState]);

  const handleDownloadHtml = useCallback(() => {
    const previewEl = document.querySelector('.preview-content');
    if (!previewEl) return;

    const htmlContent = previewEl.innerHTML;
    const baseName = editorState.filename.replace(/\.(md|markdown|txt)$/i, '');
    const filename = baseName + '.html';

    const fullHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${baseName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      max-width: 960px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    h1 { font-size: 1.8em; font-weight: 700; margin: 0.6em 0 0.4em; border-bottom: 2px solid #e0e0e0; padding-bottom: 0.3em; color: #2c3e50; }
    h2 { font-size: 1.5em; font-weight: 600; margin: 0.6em 0 0.4em; border-bottom: 1px solid #eee; padding-bottom: 0.2em; color: #34495e; }
    h3 { font-size: 1.25em; font-weight: 600; margin: 0.5em 0 0.3em; color: #34495e; }
    h4 { font-size: 1.1em; font-weight: 600; margin: 0.5em 0 0.3em; color: #34495e; }
    h5 { font-size: 1.0em; font-weight: 600; margin: 0.4em 0 0.3em; color: #34495e; }
    h6 { font-size: 0.9em; font-weight: 600; margin: 0.4em 0 0.3em; color: #7f8c8d; }
    p { margin: 0.6em 0; word-wrap: break-word; }
    ul, ol { margin: 0.5em 0; padding-left: 1.5em; }
    li { margin: 0.3em 0; line-height: 1.6; }
    hr { border: none; border-top: 1px solid #ddd; margin: 1.2em 0; }
    blockquote { margin: 0.7em 0; padding: 0.4em 1em; border-left: 4px solid #667eea; color: #6c757d; background-color: #f8f9fa; border-radius: 0 4px 4px 0; }
    a { color: #667eea; text-decoration: none; border-bottom: 1px solid #667eea; }
    a:hover { color: #764ba2; }
    table { border-collapse: collapse; width: 100%; margin: 0.8em 0; border: 1px solid #e0e0e0; }
    th, td { border: 1px solid #e0e0e0; padding: 7px 12px; text-align: left; word-wrap: break-word; }
    th { background-color: #f5f5f5; font-weight: 600; color: #333; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    code { background-color: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 3px; padding: 1px 5px; font-family: 'Monaco', 'Menlo', 'Consolas', monospace; font-size: 0.9em; color: #e83e8c; }
    pre { background-color: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 4px; padding: 14px; margin: 0.8em 0; overflow-x: auto; line-height: 1.5; }
    pre code { background: none; border: none; padding: 0; color: #333; font-size: inherit; }
    strong, b { font-weight: 600; color: #2c3e50; }
    em, i { font-style: italic; color: #555; }
    img { max-width: 100%; height: auto; display: block; margin: 8px 0; }
    input[type="checkbox"] { margin-right: 6px; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [editorState.filename]);

  const handleToggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  const handleFileExplorerNew = useCallback(() => {
    const newFileId = Date.now().toString();
    const newFile: OpenFile = {
      id: newFileId,
      name: `Untitled-${openFiles.length + 1}.md`,
      content: '',
      isDirty: false,
    };
    setOpenFiles(prev => [...prev, newFile]);
    setCurrentFileId(newFileId);
    // Update main editor state
    setEditorState(prev => ({
      ...prev,
      content: newFile.content,
      filename: newFile.name,
      isDirty: false,
    }));
  }, [openFiles.length]);

  const handleFileExplorerOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt,.ts,.tsx,.js,.jsx,.json,.css,.scss,.html,.htm,.xml,.yaml,.yml,.sh,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.sql,.log,.csv,.tsv';
    input.multiple = true;
    input.onchange = (e: any) => {
      const files = e.target.files;
      if (files) {
        Array.from(files).forEach((file: any) => {
          const reader = new FileReader();
          reader.onload = (event: any) => {
            const content = event.target.result;
            const newFileId = Date.now().toString() + Math.random();
            const newFile: OpenFile = {
              id: newFileId,
              name: file.name,
              content,
              isDirty: false,
            };
            setOpenFiles(prev => [...prev, newFile]);
            setCurrentFileId(newFileId);
            // Update main editor state
            setEditorState(prev => ({
              ...prev,
              content: newFile.content,
              filename: newFile.name,
              isDirty: false,
            }));
          };
          reader.readAsText(file);
        });
      }
    };
    input.click();
  }, []);

  const handleOpenFileWithContent = useCallback((name: string, content: string, handle?: any, fileRef?: File) => {
    const newFileId = Date.now().toString() + Math.random();
    setOpenFiles(prev => {
      const filtered = prev.filter(f => f.name !== name);
      return [...filtered, { id: newFileId, name, content, isDirty: false, handle, fileRef }];
    });
    setCurrentFileId(newFileId);
    setEditorState(e => ({ ...e, content, filename: name, isDirty: false }));
  }, []);

  const handleSelectFile = useCallback((fileId: string) => {
    setCurrentFileId(fileId);
    const file = openFilesRef.current.find(f => f.id === fileId);
    if (!file) return;

    const loadAndShow = (content: string) => {
      // Update stored content with freshly decoded version
      setOpenFiles(prev => prev.map(f => f.id === fileId ? { ...f, content } : f));
      setEditorState(prev => ({ ...prev, content, filename: file.name, isDirty: false }));
    };

    if (file.handle) {
      // Re-read from disk with current encoding
      file.handle.getFile().then((f: File) => f.arrayBuffer()).then((buf: ArrayBuffer) => {
        const content = new TextDecoder(encodingRef.current).decode(buf);
        loadAndShow(content);
      }).catch(() => {
        // Fallback to cached content if permission lost
        setEditorState(prev => ({ ...prev, content: file.content, filename: file.name, isDirty: file.isDirty }));
      });
    } else if (file.fileRef) {
      // Re-read File object with current encoding
      file.fileRef.arrayBuffer().then((buf: ArrayBuffer) => {
        const content = new TextDecoder(encodingRef.current).decode(buf);
        loadAndShow(content);
      }).catch(() => {
        setEditorState(prev => ({ ...prev, content: file.content, filename: file.name, isDirty: file.isDirty }));
      });
    } else {
      setEditorState(prev => ({ ...prev, content: file.content, filename: file.name, isDirty: file.isDirty }));
    }
  }, []);

  const handleCloseFile = useCallback((fileId: string) => {
    setOpenFiles(prev => prev.filter(f => f.id !== fileId));
    if (currentFileId === fileId) {
      // Switch to another file or create new one
      const remainingFiles = openFiles.filter(f => f.id !== fileId);
      if (remainingFiles.length > 0) {
        handleSelectFile(remainingFiles[0].id);
      } else {
        handleFileExplorerNew();
      }
    }
  }, [currentFileId, openFiles, handleSelectFile, handleFileExplorerNew]);

  const handleMouseDownDivider = useCallback(() => {
    isResizing.current = true;
  }, []);

  // Check if file is a source code file (not markdown/html/json/xml)
  const isCodeFile = useMemo(() => {
    const ext = editorState.filename.split('.').pop()?.toLowerCase() || '';
    const previewExtensions = new Set(['md', 'markdown', 'html', 'htm', 'json', 'jsonc', 'json5', 'xml', 'svg', 'xhtml', 'xsl', 'xslt', 'csv', 'tsv', 'txt', 'text', 'log', 'ini', 'cfg', 'conf', 'properties', 'env']);
    return !previewExtensions.has(ext);
  }, [editorState.filename]);

  // Auto-hide preview for code files
  useEffect(() => {
    if (isCodeFile) {
      setShowPreview(false);
    }
  }, [isCodeFile]);

  const previewMode = useMemo((): 'markdown' | 'html' | 'json' | 'xml' => {
    const ext = editorState.filename.split('.').pop()?.toLowerCase() || '';
    if (ext === 'html' || ext === 'htm') return 'html';
    if (ext === 'json' || ext === 'jsonc' || ext === 'json5') return 'json';
    if (ext === 'xml' || ext === 'svg' || ext === 'xhtml' || ext === 'xsl' || ext === 'xslt') return 'xml';
    return 'markdown';
  }, [editorState.filename]);

  const csvToMarkdownTable = useCallback((raw: string, delimiter: string): string => {
    const parseRow = (line: string): string[] => {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
          else { inQuotes = !inQuotes; }
        } else if (ch === delimiter && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      cells.push(current.trim());
      return cells;
    };
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length === 0) return '';
    const rows = lines.map(parseRow);
    const colCount = Math.max(...rows.map(r => r.length));
    const padded = rows.map(r => { while (r.length < colCount) r.push(''); return r; });
    const escape = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const toRow = (cells: string[]) => '| ' + cells.map(escape).join(' | ') + ' |';
    const sep = toRow(Array(colCount).fill('---'));
    return [toRow(padded[0]), sep, ...padded.slice(1).map(toRow)].join('\n');
  }, []);

  const previewContent = useMemo(() => {
    const ext = editorState.filename.split('.').pop()?.toLowerCase() || '';
    const markdownExts = new Set(['md', 'markdown']);
    const plainTextExts = new Set(['txt', 'text', 'log', 'ini', 'cfg', 'conf', 'properties', 'env']);
    if (markdownExts.has(ext) || ext === '') return editorState.content;
    if (ext === 'html' || ext === 'htm') return editorState.content;
    if (ext === 'json' || ext === 'jsonc' || ext === 'json5') return editorState.content;
    if (ext === 'xml' || ext === 'svg' || ext === 'xhtml' || ext === 'xsl' || ext === 'xslt') return editorState.content;
    if (ext === 'csv') return csvToMarkdownTable(editorState.content, ',');
    if (ext === 'tsv') return csvToMarkdownTable(editorState.content, '\t');
    if (plainTextExts.has(ext)) return '```\n' + editorState.content + '\n```';
    const EXT_TO_LANG: Record<string, string> = {
      // COBOL / legacy
      cbl: 'cobol', cob: 'cobol', cpy: 'cobol', pco: 'cobol',
      jcl: 'jcl',
      // Web
      js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
      ts: 'typescript', tsx: 'typescript',
      html: 'html', htm: 'html', xml: 'xml', svg: 'xml',
      css: 'css', scss: 'scss', less: 'less',
      // Backend
      py: 'python', pyw: 'python',
      rb: 'ruby',
      php: 'php',
      java: 'java',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      swift: 'swift',
      kt: 'kotlin',
      scala: 'scala',
      // C family
      c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
      // Shell
      sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'bash',
      ps1: 'powershell', psm1: 'powershell',
      bat: 'dos', cmd: 'dos',
      // Data
      json: 'json', jsonc: 'json',
      yaml: 'yaml', yml: 'yaml',
      toml: 'ini', ini: 'ini', cfg: 'ini',
      sql: 'sql',
      graphql: 'graphql', gql: 'graphql',
      // Other
      dockerfile: 'dockerfile',
      makefile: 'makefile',
      r: 'r', lua: 'lua', dart: 'dart',
      pl: 'perl', pm: 'perl',
      hs: 'haskell',
      ex: 'elixir', exs: 'elixir',
      tf: 'hcl', tfvars: 'hcl',
      proto: 'protobuf',
      diff: 'diff', patch: 'diff',
    };
    const lang = EXT_TO_LANG[ext] || ext;
    return '```' + lang + '\n' + editorState.content + '\n```';
  }, [editorState.content, editorState.filename, csvToMarkdownTable]);

  const handleImageContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Context menu triggered at:', e.clientX, e.clientY);
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  }, []);

  const handleEditorScroll = useCallback((ratio: number) => {
    scrollSyncSourceRef.current = 'editor';
    setScrollSyncRatio(ratio);
  }, []);

  const handlePreviewScroll = useCallback((ratio: number) => {
    // Skip scroll sync if currently scrolling on a zoomed diagram
    if (scrollingOnDiagramRef.current) {
      return;
    }
    scrollSyncSourceRef.current = 'preview';
    setScrollSyncRatio(ratio);
  }, []);

  const handleDiagramScroll = useCallback(() => {
    // Mark that we're scrolling on a diagram
    scrollingOnDiagramRef.current = true;
    
    // Clear existing timeout
    if (scrollingOnDiagramTimeoutRef.current) {
      clearTimeout(scrollingOnDiagramTimeoutRef.current);
    }
    
    // Reset flag after 500ms of inactivity
    scrollingOnDiagramTimeoutRef.current = setTimeout(() => {
      scrollingOnDiagramRef.current = false;
    }, 500);
  }, []);

  const handleFind = useCallback((findText: string, caseSensitive: boolean) => {
    if (!findText) {
      setFindMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
    const matches: Array<{ start: number; end: number }> = [];
    let match;
    while ((match = regex.exec(editorState.content)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length });
    }
    setFindMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
  }, [editorState.content]);

  const handleReplace = useCallback((findText: string, replaceText: string, caseSensitive: boolean, replaceAll: boolean) => {
    if (!findText) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
    let newContent: string;
    if (replaceAll) {
      newContent = editorState.content.replace(regex, replaceText);
      // After Replace All, highlight the replaced text
      handleContentChange(newContent);
      // Find and highlight the replacement text positions
      const replaceRegex = new RegExp(replaceText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const replacedPositions: Array<{ start: number; end: number }> = [];
      let match;
      while ((match = replaceRegex.exec(newContent)) !== null) {
        replacedPositions.push({ start: match.index, end: match.index + match[0].length });
      }
      setReplacedMatches(replacedPositions);
      setFindMatches([]);
      setCurrentMatchIndex(-1);
    } else {
      if (currentMatchIndex >= 0 && findMatches.length > 0) {
        const match = findMatches[currentMatchIndex];
        newContent = editorState.content.substring(0, match.start) + replaceText + editorState.content.substring(match.end);
        handleContentChange(newContent);
        // Calculate matches in new content
        const matches: Array<{ start: number; end: number }> = [];
        let m;
        while ((m = regex.exec(newContent)) !== null) {
          matches.push({ start: m.index, end: m.index + m[0].length });
        }
        setFindMatches(matches);
        setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
        setReplacedMatches([]);
      } else {
        return;
      }
    }
  }, [editorState.content, currentMatchIndex, findMatches, handleContentChange]);

  const handleToggleComment = useCallback(() => {
    const lines = editorState.content.split('\n');
    const isMarkdown = editorState.filename.toLowerCase().endsWith('.md') || editorState.filename.toLowerCase().endsWith('.markdown');
    const commentPrefix = isMarkdown ? '> ' : '// ';
    
    let newContent: string;
    // Check if first line is already commented
    const isCommented = lines.some(line => line.trimStart().startsWith(commentPrefix));
    
    if (isCommented) {
      // Uncomment
      newContent = lines.map(line => {
        if (line.trimStart().startsWith(commentPrefix)) {
          return line.replace(commentPrefix, '');
        }
        return line;
      }).join('\n');
    } else {
      // Comment
      newContent = lines.map(line => commentPrefix + line).join('\n');
    }
    
    handleContentChange(newContent);
  }, [editorState.content, editorState.filename, handleContentChange]);

  const handleGoToLine = useCallback((lineNumber: number) => {
    const lines = editorState.content.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) return;
    
    const lineHeight = 20; // Approximate line height in pixels
    const scrollTop = (lineNumber - 1) * lineHeight;
    if (editorContainerRef.current) {
      editorContainerRef.current.scrollTop = Math.max(0, scrollTop - 100); // Scroll with 100px offset from top
    }
  }, [editorState.content]);

  useEffect(() => {
    // Global contextmenu handler for images and mermaid diagrams
    const handleGlobalContextMenu = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      console.log('=== CONTEXTMENU EVENT FIRED ===');
      console.log('Event:', e);
      const target = mouseEvent.target as HTMLElement;
      console.log('Target element:', target);
      console.log('Target tagName:', target.tagName);
      console.log('Target class:', target.className);
      
      // Check if clicked on an image or mermaid diagram
      const isImage = target.tagName === 'IMG';
      const mermaidDiagram = target.closest('.mermaid-diagram');
      const mermaidSvg = target.closest('svg.mermaid');
      const isMermaid = mermaidDiagram || mermaidSvg;
      
      console.log('isImage:', isImage, 'isMermaid:', isMermaid);
      console.log('mermaidDiagram:', mermaidDiagram, 'mermaidSvg:', mermaidSvg);
      
      if (isImage || isMermaid) {
        console.log('✓ Showing context menu at:', mouseEvent.clientX, mouseEvent.clientY);
        mouseEvent.preventDefault();
        setContextMenu({ visible: true, x: mouseEvent.clientX, y: mouseEvent.clientY });
      } else {
        console.log('✗ Not an image or mermaid, ignoring');
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingExplorer.current) {
        const delta = e.clientX - explorerStartX.current;
        const newWidth = Math.min(Math.max(explorerStartWidth.current + delta, 150), 600);
        setExplorerWidth(newWidth);
        return;
      }
      if (!isResizing.current || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;

      // Limit to 20-80% to prevent panels from being too small
      if (newPosition >= 20 && newPosition <= 80) {
        // Temporarily clear scroll sync to prevent auto-scroll during resize
        setScrollSyncRatio(null);
        setSplitPosition(newPosition);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      isResizingExplorer.current = false;
    };

    console.log('Attaching context menu listener to document (capture phase)');
    document.addEventListener('contextmenu', handleGlobalContextMenu, true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Also log that event listeners are attached
    window.addEventListener('contextmenu', () => {
      console.log('Window contextmenu event detected');
    }, true);
    
    return () => {
      console.log('Removing context menu listener from document');
      document.removeEventListener('contextmenu', handleGlobalContextMenu, true);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F: Find
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setFindReplaceOpen(true);
        setFindReplaceShowReplace(false);
        setGoToLineOpen(false);
      }
      // Ctrl+H or Cmd+H: Find & Replace
      else if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setFindReplaceOpen(true);
        setFindReplaceShowReplace(true);
        setGoToLineOpen(false);
      }
      // Ctrl+S or Cmd+S: Save
      else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+/ or Cmd+/: Toggle comment
      else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        handleToggleComment();
      }
      // Ctrl+G or Cmd+G: Go to line
      else if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        setGoToLineOpen(true);
        setFindReplaceOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleToggleComment]);

  return (
    <div className="app">
      <MenuBar />
      <Toolbar
        showHelp={showHelp}
        onToggleHelp={handleToggleHelp}
      />
      <div className="editor-container" ref={containerRef}>
        <div 
          className="file-explorer-panel" 
          style={{ 
            width: explorerWidth,
            display: previewMaximized ? 'none' : 'block'
          }}
        >
          <FileExplorer
              openFiles={openFiles}
              currentFileId={currentFileId}
              onSelectFile={handleSelectFile}
              onCloseFile={handleCloseFile}
              onNewFile={handleFileExplorerNew}
              onOpenFile={handleFileExplorerOpen}
              onOpenFileWithContent={handleOpenFileWithContent}
              encoding={encoding}
              onEncodingChange={setEncoding}
          />
        </div>
        <div
          className="resize-divider"
          onMouseDown={(e) => {
            isResizingExplorer.current = true;
            explorerStartX.current = e.clientX;
            explorerStartWidth.current = explorerWidth;
          }}
          style={{ display: previewMaximized ? 'none' : 'block' }}
        />
        {/* Fullscreen Preview */}
        {previewMaximized && (
          <PreviewPanel
            content={previewContent}
            filename={editorState.filename}
            style={{ flex: 1 }}
            onImageContextMenu={handleImageContextMenu}
            previewMode={previewMode}
            onScroll={handlePreviewScroll}
            syncScrollRatio={undefined}
            onDownloadHtml={handleDownloadHtml}
            onDiagramScroll={handleDiagramScroll}
            previewMaximized={previewMaximized}
            onToggleMaximize={() => setPreviewMaximized(false)}
          />
        )}
        {/* Normal Split View */}
        <div 
          className="editor-workspace" 
          style={{ 
            flex: 1, 
            display: previewMaximized ? 'none' : 'flex'
          }}
        >
          <EditorPanel
            content={editorState.content}
            onChange={handleContentChange}
            zoom={editorState.zoom}
            filename={editorState.filename}
            style={{ flex: `0 0 ${showPreview ? splitPosition : 100}%` }}
            onScroll={handleEditorScroll}
            syncScrollRatio={scrollSyncSourceRef.current === 'preview' ? scrollSyncRatio : undefined}
            matches={findMatches}
            currentMatchIndex={currentMatchIndex}
            replacedMatches={replacedMatches}
            containerRef={editorContainerRef}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview(!showPreview)}
          />
          {showPreview && (
            <>
              <div 
                className="resize-divider"
                onMouseDown={handleMouseDownDivider}
              />
              <PreviewPanel
                content={previewContent}
                filename={editorState.filename}
                style={{ flex: `0 0 ${100 - splitPosition}%` }}
                onImageContextMenu={handleImageContextMenu}
                previewMode={previewMode}
                onScroll={handlePreviewScroll}
                syncScrollRatio={scrollSyncSourceRef.current === 'editor' ? scrollSyncRatio : undefined}
                onDownloadHtml={handleDownloadHtml}
                onDiagramScroll={handleDiagramScroll}
                previewMaximized={previewMaximized}
                onToggleMaximize={() => setPreviewMaximized(true)}
              />
            </>
          )}
        </div>
        {/* Chat Panel Sidebar */}
        {!previewMaximized && (
          <div className="chat-panel-sidebar" style={{ width: 320 }}>
            <ChatPanel
              selectedFile={editorState.filename}
              fileContent={editorState.content}
              onOpenSettings={() => setShowSettingsModal(true)}
            />
          </div>
        )}
        {(findReplaceOpen || goToLineOpen) && (
          <div className="right-panel-container">
            {findReplaceOpen && (
              <FindReplacePanel
                isOpen={findReplaceOpen}
                showReplace={findReplaceShowReplace}
                onClose={() => setFindReplaceOpen(false)}
                onFind={handleFind}
                onReplace={handleReplace}
                matchCount={findMatches.length}
                currentMatch={currentMatchIndex + 1}
                onPrevMatch={() => setCurrentMatchIndex(Math.max(0, currentMatchIndex - 1))}
                onNextMatch={() => setCurrentMatchIndex(Math.min(findMatches.length - 1, currentMatchIndex + 1))}
              />
            )}
            {goToLineOpen && (
              <GoToLinePanel
                isOpen={goToLineOpen}
                onClose={() => setGoToLineOpen(false)}
                onGoToLine={handleGoToLine}
                totalLines={editorState.content.split('\n').length}
              />
            )}
          </div>
        )}
      </div>
      <StatusBar
        filename={editorState.filename}
        isDirty={editorState.isDirty}
        zoom={editorState.zoom}
      />
      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu({ ...contextMenu, visible: false })}
      />
      <HelpPanel
        visible={showHelp}
        onClose={handleToggleHelp}
      />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};

export default App;
