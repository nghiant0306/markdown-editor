import { useState, useCallback, useRef, useEffect } from 'react';
import './App.css';
import MenuBar from './components/MenuBar';
import Toolbar from './components/Toolbar';
import EditorPanel from './components/EditorPanel';
import PreviewPanel from './components/PreviewPanel';
import StatusBar from './components/StatusBar';
import ContextMenu from './components/ContextMenu';
import FileExplorer from './components/FileExplorer';
import HelpPanel from './components/HelpPanel';
import ChatPanel from './components/ChatPanel';

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

  const [showPreview, setShowPreview] = useState(true);
  const [splitPosition, setSplitPosition] = useState(50); // percentage
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [imageZoom, setImageZoom] = useState(100); // image zoom level
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

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

  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    setEditorState(prev => {
      let newZoom = prev.zoom;
      if (direction === 'in') {
        newZoom = Math.min(prev.zoom + 10, 200);
      } else if (direction === 'out') {
        newZoom = Math.max(prev.zoom - 10, 50);
      } else {
        newZoom = 100;
      }
      return { ...prev, zoom: newZoom };
    });
  }, []);

  const handleNew = useCallback(() => {
    if (editorState.isDirty) {
      const confirmed = window.confirm('Discard changes?');
      if (!confirmed) return;
    }
    setEditorState({
      content: '',
      filename: 'Untitled.md',
      isDirty: false,
      zoom: 100,
    });
  }, [editorState.isDirty]);

  const handleOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const content = event.target.result;
          setEditorState({
            content,
            filename: file.name,
            isDirty: false,
            zoom: 100,
          });
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const handleSave = useCallback(() => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(editorState.content));
    element.setAttribute('download', editorState.filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setEditorState(prev => ({ ...prev, isDirty: false }));
  }, [editorState]);

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

  const handleTogglePreview = useCallback(() => {
    setShowPreview(prev => !prev);
  }, []);

  const handleToggleFileExplorer = useCallback(() => {
    setShowFileExplorer(prev => !prev);
  }, []);

  const handleToggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  const handleToggleChat = useCallback(() => {
    setShowChat(prev => !prev);
  }, []);

  const handleApplyChatSuggestion = useCallback((suggestion: string) => {
    setEditorState(prev => ({
      ...prev,
      content: suggestion,
      isDirty: true,
    }));
    
    // Update the corresponding file in openFiles
    if (currentFileId) {
      setOpenFiles(prev => 
        prev.map(f => 
          f.id === currentFileId 
            ? { ...f, content: suggestion, isDirty: true }
            : f
        )
      );
    }
  }, [currentFileId]);

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
    input.accept = '.md,.markdown,.txt';
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

  const handleSelectFile = useCallback((fileId: string) => {
    setCurrentFileId(fileId);
    const file = openFiles.find(f => f.id === fileId);
    if (file) {
      setEditorState(prev => ({
        ...prev,
        content: file.content,
        filename: file.name,
        isDirty: file.isDirty,
      }));
    }
  }, [openFiles]);

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

  const handleImageContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Context menu triggered at:', e.clientX, e.clientY);
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY });
  }, []);

  const handleImageZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    setImageZoom(prev => {
      let newZoom;
      if (direction === 'reset') {
        newZoom = 100;
      } else if (direction === 'in') {
        newZoom = Math.min(prev + 50, 1600); // Increased max to 1600
      } else {
        newZoom = Math.max(prev - 20, 50);
      }
      console.log('Image zoom changed:', prev, '->', newZoom, 'direction:', direction);
      return newZoom;
    });
  }, []);

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
      if (!isResizing.current || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;

      // Limit to 20-80% to prevent panels from being too small
      if (newPosition >= 20 && newPosition <= 80) {
        setSplitPosition(newPosition);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
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

  return (
    <div className="app">
      <MenuBar 
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onDownloadHtml={handleDownloadHtml}
        isDirty={editorState.isDirty}
      />
      <Toolbar
        zoom={editorState.zoom}
        onZoom={handleZoom}
        imageZoom={imageZoom}
        onImageZoom={handleImageZoom}
        showPreview={showPreview}
        onTogglePreview={handleTogglePreview}
        showFileExplorer={showFileExplorer}
        onToggleFileExplorer={handleToggleFileExplorer}
        showHelp={showHelp}
        onToggleHelp={handleToggleHelp}
        showChat={showChat}
        onToggleChat={handleToggleChat}
      />
      <div className="editor-container" ref={containerRef}>
        {showFileExplorer && (
          <div className="file-explorer-panel">
            <FileExplorer
              openFiles={openFiles}
              currentFileId={currentFileId}
              onSelectFile={handleSelectFile}
              onCloseFile={handleCloseFile}
              onNewFile={handleFileExplorerNew}
              onOpenFile={handleFileExplorerOpen}
            />
          </div>
        )}
        <div className="editor-workspace" style={{ flex: 1, display: 'flex' }}>
          <EditorPanel
            content={editorState.content}
            onChange={handleContentChange}
            zoom={editorState.zoom}
            style={{ flex: `0 0 ${splitPosition}%` }}
          />
          {showPreview && (
            <>
              <div 
                className="resize-divider"
                onMouseDown={handleMouseDownDivider}
              />
              <PreviewPanel
                content={editorState.content}
                zoom={editorState.zoom}
                style={{ flex: `0 0 ${100 - splitPosition}%` }}
                imageZoom={imageZoom}
                onImageContextMenu={handleImageContextMenu}
                onImageZoomChange={handleImageZoom}
              />
            </>
          )}
        </div>
        {showChat && (
          <div className="chat-panel-container">
            <ChatPanel
              editorContent={editorState.content}
              filename={editorState.filename}
              onApplySuggestion={handleApplyChatSuggestion}
            />
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
        onZoomIn={() => handleImageZoom('in')}
        onZoomOut={() => handleImageZoom('out')}
      />
      <HelpPanel
        visible={showHelp}
        onClose={handleToggleHelp}
      />
    </div>
  );
};

export default App;
