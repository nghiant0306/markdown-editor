import React, { useState, useCallback } from 'react';
import { FileText, Folder, FolderOpen, ChevronRight, ChevronDown, FolderOpen as FolderPlus } from 'lucide-react';
import './FileExplorer.css';

interface OpenFile {
  id: string;
  name: string;
  content: string;
  isDirty: boolean;
}

interface TreeItem {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  handle: any;
  children?: TreeItem[];
  loaded?: boolean;
}

interface FileExplorerProps {
  openFiles: OpenFile[];
  currentFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCloseFile: (fileId: string) => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onOpenFileWithContent?: (name: string, content: string, handle?: any, fileRef?: File) => void;
  encoding: string;
  onEncodingChange: (enc: string) => void;
}

const TEXT_EXTENSIONS = new Set([
  'md', 'markdown', 'txt', 'text', 'log', 'readme', 'license', 'changelog',
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'esm',
  'json', 'jsonc', 'json5', 'ndjson',
  'css', 'scss', 'less', 'sass', 'styl',
  'html', 'htm', 'xml', 'svg', 'xhtml', 'xsl', 'xslt',
  'yaml', 'yml', 'toml', 'ini', 'env', 'cfg', 'conf', 'config', 'properties',
  'sh', 'bash', 'zsh', 'fish', 'ps1', 'psm1', 'psd1', 'bat', 'cmd',
  'py', 'pyw', 'ipynb',
  'rb', 'rake', 'gemspec',
  'go',
  'rs',
  'java', 'kt', 'kts', 'groovy', 'gradle',
  'c', 'cpp', 'cc', 'cxx', 'c++', 'h', 'hpp', 'hxx',
  'cs', 'csx', 'vb',
  'php', 'php3', 'php4', 'php5', 'php7', 'phtml',
  'swift', 'm', 'mm',
  'sql', 'ddl', 'dml',
  'graphql', 'gql',
  'vue', 'svelte', 'astro', 'jsx',
  'r', 'rmd',
  'lua',
  'dart',
  'ex', 'exs',         // Elixir
  'erl', 'hrl',        // Erlang
  'hs', 'lhs',         // Haskell
  'ml', 'mli',         // OCaml
  'fs', 'fsx', 'fsi',  // F#
  'scala', 'sc',
  'clj', 'cljs', 'cljc', // Clojure
  'pl', 'pm', 'pod',   // Perl
  'awk', 'sed',
  'tf', 'tfvars',      // Terraform
  'dockerfile', 'makefile', 'rakefile', 'gemfile', 'podfile',
  'cbl', 'cob', 'cpy', 'pco', // COBOL
  'jcl', 'proc',       // JCL
  'asm', 's',          // Assembly
  'pas', 'pp',         // Pascal
  'f', 'f90', 'f95', 'f03', 'for', // Fortran
  'ada', 'adb', 'ads', // Ada
  'vhd', 'vhdl',       // VHDL
  'v', 'sv',           // Verilog / SystemVerilog
  'proto',             // Protobuf
  'thrift',
  'avro',
  'wasm', 'wat',
  'diff', 'patch',
  'csv', 'tsv', 'dsv',
  'gitignore', 'gitattributes', 'gitmodules', 'editorconfig', 'eslintrc', 'prettierrc', 'babelrc',
]);

const NAMED_TEXT_FILES = new Set([
  'makefile', 'dockerfile', 'rakefile', 'gemfile', 'podfile', 'procfile',
  'jenkinsfile', 'vagrantfile', 'brewfile',
  '.gitignore', '.gitattributes', '.gitmodules', '.editorconfig',
  '.eslintrc', '.prettierrc', '.babelrc', '.npmrc', '.nvmrc', '.yarnrc',
  '.env', '.env.local', '.env.development', '.env.production',
  'license', 'readme', 'changelog', 'authors', 'contributing', 'notice',
]);

const isTextFile = (name: string): boolean => {
  if (NAMED_TEXT_FILES.has(name.toLowerCase())) return true;
  const parts = name.split('.');
  if (parts.length === 1) return true; // no extension = likely text
  const ext = parts.pop()?.toLowerCase() || '';
  return TEXT_EXTENSIONS.has(ext);
};

const getFileColor = (name: string): string => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['md', 'markdown'].includes(ext)) return '#667eea';
  if (['ts', 'tsx'].includes(ext)) return '#3178c6';
  if (['js', 'jsx', 'mjs'].includes(ext)) return '#d4a017';
  if (['json', 'jsonc'].includes(ext)) return '#ffa500';
  if (['css', 'scss', 'less', 'sass'].includes(ext)) return '#264de4';
  if (['html', 'htm'].includes(ext)) return '#e34c26';
  if (['py'].includes(ext)) return '#3572a5';
  if (['svg', 'xml'].includes(ext)) return '#ff9800';
  if (['sh', 'bash', 'zsh', 'ps1'].includes(ext)) return '#4caf50';
  if (['sql'].includes(ext)) return '#f06292';
  return '#888';
};

const IGNORED = new Set(['node_modules', '.git', '.next', 'dist', 'build', '__pycache__', '.cache']);

const FileExplorer: React.FC<FileExplorerProps> = ({
  openFiles,
  currentFileId,
  onSelectFile,
  onCloseFile,
  onNewFile,
  onOpenFile,
  onOpenFileWithContent,
  encoding,
  onEncodingChange,
}) => {
  const [rootHandle, setRootHandle] = useState<any>(null);
  const [rootName, setRootName] = useState('');
  const [treeItems, setTreeItems] = useState<TreeItem[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [isCreatingNewFile, setIsCreatingNewFile] = useState(false);
  const [newFileName, setNewFileName] = useState('Untitled.md');
  const encodingRef = React.useRef(encoding);
  React.useEffect(() => { encodingRef.current = encoding; }, [encoding]);

  const loadDirectory = useCallback(async (dirHandle: any, basePath: string): Promise<TreeItem[]> => {
    const items: TreeItem[] = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (name.startsWith('.') || IGNORED.has(name)) continue;
      items.push({ name, path: `${basePath}/${name}`, kind: handle.kind, handle });
    }
    items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return items;
  }, []);

  const handleOpenFolder = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Folder browsing requires Chrome or Edge browser.');
      return;
    }
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
      const children = await loadDirectory(handle, handle.name);
      setRootHandle(handle);
      setRootName(handle.name);
      setTreeItems(children);
      setExpandedPaths(new Set());
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error(err);
    }
  }, [loadDirectory]);

  const handleCreateNewFile = useCallback(async () => {
    if (!rootHandle || !newFileName.trim()) {
      alert('Please enter a file name');
      return;
    }
    try {
      // Create the file in the root folder
      const fileHandle = await rootHandle.getFileHandle(newFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write('');
      await writable.close();

      const content = '';

      // Add to opened files
      onOpenFileWithContent?.(newFileName, content, fileHandle);

      // Refresh the tree
      const children = await loadDirectory(rootHandle, rootName);
      setTreeItems(children);
      setIsCreatingNewFile(false);
      setNewFileName('Untitled.md');
    } catch (err: any) {
      alert(`Error creating file: ${err?.message || err}`);
      setIsCreatingNewFile(false);
    }
  }, [rootHandle, newFileName, rootName, loadDirectory, onOpenFileWithContent]);

  const handleToggleFolder = useCallback(async (item: TreeItem, allItems: TreeItem[], setItems: React.Dispatch<React.SetStateAction<TreeItem[]>>) => {
    const path = item.path;
    const newExpanded = new Set(expandedPaths);

    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
      if (!item.loaded) {
        setLoadingPaths(prev => new Set(prev).add(path));
        const children = await loadDirectory(item.handle, path);
        item.children = children;
        item.loaded = true;
        setLoadingPaths(prev => { const n = new Set(prev); n.delete(path); return n; });
        setItems(prev => [...prev]); // force re-render
      }
    }
    setExpandedPaths(newExpanded);
  }, [expandedPaths, loadDirectory]);

  const handleFileClick = useCallback(async (item: TreeItem) => {
    if (!isTextFile(item.name)) {
      alert(`Cannot open binary file: ${item.name}`);
      return;
    }
    try {
      const file = await item.handle.getFile();
      const buffer = await file.arrayBuffer();
      const enc = encodingRef.current;
      const content = new TextDecoder(enc).decode(buffer);
      onOpenFileWithContent?.(item.name, content, item.handle);
    } catch (err: any) {
      alert(`Error reading file: ${err?.message || err}`);
    }
  }, [onOpenFileWithContent]);

  const renderTree = (items: TreeItem[], depth = 0): React.ReactNode =>
    items.map(item => {
      const isExpanded = expandedPaths.has(item.path);
      const isLoading = loadingPaths.has(item.path);
      const paddingLeft = 8 + depth * 14;

      if (item.kind === 'directory') {
        return (
          <div key={item.path}>
            <div
              className="tree-item tree-folder"
              style={{ paddingLeft }}
              onClick={() => handleToggleFolder(item, treeItems, setTreeItems)}
            >
              <span className="tree-arrow">
                {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </span>
              {isExpanded
                ? <FolderOpen size={13} className="tree-icon folder-icon" />
                : <Folder size={13} className="tree-icon folder-icon" />}
              <span className="tree-name">{item.name}</span>
              {isLoading && <span className="tree-loading">•••</span>}
            </div>
            {isExpanded && item.children && (
              <div>{renderTree(item.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      const canOpen = isTextFile(item.name);
      return (
        <div
          key={item.path}
          className={`tree-item tree-file${canOpen ? '' : ' tree-file-binary'}`}
          style={{ paddingLeft: paddingLeft + 16 }}
          onClick={() => canOpen && handleFileClick(item)}
          title={canOpen ? item.name : `Binary: ${item.name}`}
        >
          <FileText size={13} className="tree-icon" style={{ color: getFileColor(item.name) }} />
          <span className="tree-name">{item.name}</span>
        </div>
      );
    });

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <div className="fe-tabs">
          <button className="fe-tab active">Explorer</button>
        </div>
        <div className="file-explorer-actions">
          <button 
            className="file-explorer-btn" 
            title="New File" 
            onClick={() => {
              if (rootHandle) {
                setIsCreatingNewFile(true);
                setNewFileName('Untitled.md');
              } else {
                onNewFile();
              }
            }}
          >
            +
          </button>
          <button className="file-explorer-btn" title="Open Folder" onClick={handleOpenFolder}><FolderPlus size={14} /></button>
        </div>
      </div>
      <div className="fe-encoding-bar">
        <label className="fe-encoding-label">Encoding:</label>
        <select
          className="fe-encoding-select"
          value={encoding}
          onChange={e => onEncodingChange(e.target.value)}
        >
          <option value="UTF-8">UTF-8</option>
          <option value="Shift_JIS">Shift-JIS</option>
          <option value="EUC-JP">EUC-JP</option>
          <option value="ISO-2022-JP">ISO-2022-JP</option>
          <option value="windows-1252">Windows-1252</option>
          <option value="ISO-8859-1">ISO-8859-1</option>
          <option value="UTF-16">UTF-16</option>
        </select>
      </div>

      <div className="file-explorer-content">
        {
          rootHandle
            ? <div className="tree-view">
                <div className="tree-root-label">
                  <Folder size={13} className="folder-icon" />
                  <span>{rootName}</span>
                </div>
                {openFiles.length > 0 && (
                  <div className="open-files-section">
                    {openFiles.map(file => (
                      <div
                        key={file.id}
                        className={`open-file-item ${currentFileId === file.id ? 'active' : ''}`}
                        onClick={() => onSelectFile(file.id)}
                        title={file.name}
                      >
                        <FileText size={13} className="tree-icon" style={{ color: getFileColor(file.name) }} />
                        <span className="file-item-name">{file.name}</span>
                        {file.isDirty && <span className="edit-indicator-small">E</span>}
                        <button
                          className="file-item-close"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseFile(file.id);
                          }}
                          title="Close"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {isCreatingNewFile && (
                  <div className="tree-new-file-input">
                    <FileText size={13} className="tree-icon" style={{ color: '#667eea' }} />
                    <input
                      type="text"
                      className="new-file-input"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateNewFile();
                        } else if (e.key === 'Escape') {
                          setIsCreatingNewFile(false);
                        }
                      }}
                      onBlur={() => setIsCreatingNewFile(false)}
                      autoFocus
                    />
                  </div>
                )}
                {renderTree(treeItems)}
              </div>
            : <div className="file-explorer-empty">
                <p>No folder open</p>
                <button className="open-folder-btn" onClick={handleOpenFolder}>
                  <FolderPlus size={14} />
                  <span>Open Folder</span>
                </button>
                <p className="file-explorer-hint">Chrome / Edge only</p>
              </div>
        }
      </div>
    </div>
  );
};

export default FileExplorer;
