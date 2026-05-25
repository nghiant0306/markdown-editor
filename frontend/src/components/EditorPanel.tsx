import { useCallback, useMemo, CSSProperties, useRef, useEffect, useState } from 'react';
import SimpleEditor from 'react-simple-code-editor';
import { createLowlight, common } from 'lowlight';
import './EditorPanel.css';

interface EditorPanelProps {
  content: string;
  onChange: (content: string) => void;
  zoom: number;
  filename?: string;
  style?: CSSProperties;
  onScroll?: (ratio: number) => void;
  syncScrollRatio?: number;
  matches?: Array<{ start: number; end: number }>;
  currentMatchIndex?: number;
  replacedMatches?: Array<{ start: number; end: number }>;
  containerRef?: React.RefObject<HTMLDivElement>;
  showPreview?: boolean;
  onTogglePreview?: () => void;
}

// Shared language map (extension → lowlight language name)
const EXT_TO_LANG: Record<string, string> = {
  cbl: 'cobol', cob: 'cobol', cpy: 'cobol', pco: 'cobol',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  html: 'html', htm: 'html', xml: 'xml',
  css: 'css', scss: 'scss', less: 'less',
  py: 'python', pyw: 'python',
  rb: 'ruby', php: 'php', java: 'java', cs: 'csharp',
  go: 'go', rs: 'rust', swift: 'swift', kt: 'kotlin',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp',
  sh: 'bash', bash: 'bash', zsh: 'bash', ps1: 'powershell',
  json: 'json', yaml: 'yaml', yml: 'yaml', sql: 'sql',
  r: 'r', lua: 'lua', dart: 'dart',
};

// Custom COBOL definition (same as PreviewPanel)
const cobol = (hljs: any) => ({
  name: 'COBOL', case_insensitive: true,
  keywords: {
    keyword:
      'IDENTIFICATION DIVISION PROGRAM-ID AUTHOR DATE-WRITTEN ENVIRONMENT CONFIGURATION ' +
      'SOURCE-COMPUTER OBJECT-COMPUTER INPUT-OUTPUT SECTION FILE-CONTROL SELECT ASSIGN ' +
      'DATA FILE WORKING-STORAGE LOCAL-STORAGE LINKAGE FD PIC PICTURE VALUE OCCURS ' +
      'REDEFINES INDEXED DEPENDING ON RENAMES COPY REPLACING ' +
      'PROCEDURE PERFORM UNTIL VARYING FROM BY AFTER BEFORE ' +
      'MOVE TO COMPUTE ADD SUBTRACT MULTIPLY DIVIDE GIVING REMAINDER ' +
      'IF ELSE END-IF EVALUATE WHEN OTHER END-EVALUATE ' +
      'READ WRITE REWRITE DELETE OPEN CLOSE START ' +
      'CALL USING RETURNING EXIT STOP RUN GOBACK ' +
      'DISPLAY ACCEPT STRING UNSTRING INSPECT TALLYING REPLACING ' +
      'INITIALIZE SET SEARCH ALL GO THRU THROUGH NOT AND OR ' +
      'ZERO ZEROS ZEROES SPACE SPACES HIGH-VALUE LOW-VALUE TRUE FALSE',
  },
  contains: [
    hljs.COMMENT('\\*', '$'),
    { className: 'string', begin: "'", end: "'", illegal: '\\n' },
    { className: 'string', begin: '"', end: '"', illegal: '\\n' },
    { className: 'number', begin: '\\b\\d+(\\.\\d+)?\\b' },
  ],
});

const lowlight = createLowlight({ ...common, cobol });

// Convert lowlight hast output to HTML string
function hastToHtml(node: any): string {
  if (node.type === 'text') {
    return node.value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  if (node.type === 'element') {
    const cls = (node.properties?.className || []).join(' ');
    const inner = (node.children || []).map(hastToHtml).join('');
    return cls ? `<span class="${cls}">${inner}</span>` : inner;
  }
  if (node.type === 'root') {
    return (node.children || []).map(hastToHtml).join('');
  }
  return '';
}

const EditorPanel: React.FC<EditorPanelProps> = ({ 
  content, 
  onChange, 
  zoom, 
  filename = '', 
  style, 
  onScroll, 
  syncScrollRatio = 0,
  matches = [],
  currentMatchIndex = 0,
  replacedMatches = [],
  containerRef: externalContainerRef,
  showPreview = true,
  onTogglePreview
}) => {
  const language = useMemo(() => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    return EXT_TO_LANG[ext] || '';
  }, [filename]);

  const highlight = useCallback((code: string) => {
    try {
      const result = language && lowlight.registered(language)
        ? lowlight.highlight(language, code)
        : lowlight.highlightAuto(code);
      return hastToHtml(result);
    } catch {
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [language]);

  const fontSize = `${10 * (zoom / 100)}px`;
  const lineCount = content.split('\n').length;
  const lineNumberDigits = Math.ceil(Math.log10(lineCount || 1));
  const lineNumberWidth = `${Math.max(32, lineNumberDigits * 7 + 16)}px`;
  const localContainerRef = useRef<HTMLDivElement>(null);
  const effectiveContainerRef = externalContainerRef || localContainerRef;
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const previousFilenameRef = useRef(filename);
  const lastScrollEmitTimeRef = useRef(0); // Throttle scroll emissions

  // Sync scroll between line numbers and editor, emit onScroll (throttled via RAF)
  useEffect(() => {
    const container = effectiveContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Mark user is scrolling
      userScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        userScrollingRef.current = false;
      }, 300);
      
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = container.scrollTop;
      }
      // Only emit if NOT syncing from parent AND enough time since last emit
      const now = Date.now();
      if (!isSyncingRef.current && now - lastScrollEmitTimeRef.current > 200 && onScroll) {
        lastScrollEmitTimeRef.current = now; // Update last emit time
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          const ratio = container.scrollHeight > container.clientHeight
            ? container.scrollTop / (container.scrollHeight - container.clientHeight)
            : 0;
          onScroll(ratio);
        });
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [onScroll, effectiveContainerRef]);

  // Apply scroll from parent sync - but skip if user is actively scrolling
  useEffect(() => {
    const container = effectiveContainerRef.current;
    if (!container || syncScrollRatio === undefined || syncScrollRatio === null || userScrollingRef.current) return;
    
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return; // No scrollbar needed
    
    isSyncingRef.current = true;
    const scrollTop = Math.max(0, Math.min(syncScrollRatio * maxScroll, maxScroll));
    container.scrollTop = scrollTop;
    setTimeout(() => { isSyncingRef.current = false; }, 250);
  }, [syncScrollRatio, effectiveContainerRef]);

  // Calculate actual positions using DOM measurements for accurate highlighting
  const calculateHighlightPositions = useCallback(() => {
    const container = effectiveContainerRef.current;
    if (!container) return [];

    const preElement = container.querySelector('pre');
    if (!preElement) return [];

    // Get the actual text content and compute positions
    const allRects: Array<Array<{ top: number; left: number; width: number; height: number }> | null> = [];
    
    for (const match of matches) {
      try {
        // Create a temporary selection to measure the matched text
        const range = document.createRange();
        
        // Find the text nodes in the pre element
        const walker = document.createTreeWalker(preElement, NodeFilter.SHOW_TEXT, null);
        let currentPos = 0;
        let startNode: Text | null = null;
        let endNode: Text | null = null;
        let startOffset = 0;
        let endOffset = 0;
        let node: Text | null = null;
        let nodes: Array<{ node: Text; startPos: number; endPos: number }> = [];

        // Walk through all text nodes and collect them with positions
        while ((node = walker.nextNode() as Text)) {
          const nodeStart = currentPos;
          const nodeEnd = currentPos + node.textContent!.length;
          nodes.push({ node, startPos: nodeStart, endPos: nodeEnd });
          currentPos = nodeEnd;
        }

        // Find start and end nodes
        for (const { node: n, startPos, endPos } of nodes) {
          if (startNode === null && endPos > match.start) {
            startNode = n;
            startOffset = match.start - startPos;
          }
          if (endPos >= match.end) {
            endNode = n;
            endOffset = match.end - startPos;
            break;
          }
        }

        if (startNode && endNode) {
          range.setStart(startNode, startOffset);
          range.setEnd(endNode, endOffset);
          
          const rects = Array.from(range.getClientRects());
          if (rects.length > 0) {
            const containerRect = container.getBoundingClientRect();
            allRects.push(rects.map(rect => ({
              top: rect.top - containerRect.top + container.scrollTop,
              left: rect.left - containerRect.left + container.scrollLeft,
              width: rect.width,
              height: rect.height,
            })));
          } else {
            allRects.push(null);
          }
        } else {
          allRects.push(null);
        }
      } catch (e) {
        allRects.push(null);
      }
    }
    
    return allRects;
  }, [matches, effectiveContainerRef]);

  const [highlightRects, setHighlightRects] = useState<any[]>([]);
  const [replacedHighlightRects, setReplacedHighlightRects] = useState<any[]>([]);

  // Update highlight positions when content or matches change
  useEffect(() => {
    const timer = setTimeout(() => {
      setHighlightRects(calculateHighlightPositions());
    }, 50);
    return () => clearTimeout(timer);
  }, [matches, calculateHighlightPositions]);

  // Calculate and update highlight positions for replaced matches
  useEffect(() => {
    if (replacedMatches.length === 0) {
      setReplacedHighlightRects([]);
      return;
    }

    const timer = setTimeout(() => {
      const container = effectiveContainerRef.current;
      if (!container) return;

      const preElement = container.querySelector('pre');
      if (!preElement) return;

      const allRects: Array<Array<{ top: number; left: number; width: number; height: number }> | null> = [];
      
      for (const match of replacedMatches) {
        try {
          const range = document.createRange();
          const walker = document.createTreeWalker(preElement, NodeFilter.SHOW_TEXT, null);
          let currentPos = 0;
          let startNode: Text | null = null;
          let endNode: Text | null = null;
          let startOffset = 0;
          let endOffset = 0;
          let node: Text | null = null;
          let nodes: Array<{ node: Text; startPos: number; endPos: number }> = [];

          while ((node = walker.nextNode() as Text)) {
            const nodeStart = currentPos;
            const nodeEnd = currentPos + node.textContent!.length;
            nodes.push({ node, startPos: nodeStart, endPos: nodeEnd });
            currentPos = nodeEnd;
          }

          for (const { node: n, startPos, endPos } of nodes) {
            if (startNode === null && endPos > match.start) {
              startNode = n;
              startOffset = match.start - startPos;
            }
            if (endPos >= match.end) {
              endNode = n;
              endOffset = match.end - startPos;
              break;
            }
          }

          if (startNode && endNode) {
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            
            const rects = Array.from(range.getClientRects());
            if (rects.length > 0) {
              const containerRect = container.getBoundingClientRect();
              allRects.push(rects.map(rect => ({
                top: rect.top - containerRect.top + container.scrollTop,
                left: rect.left - containerRect.left + container.scrollLeft,
                width: rect.width,
                height: rect.height,
              })));
            } else {
              allRects.push(null);
            }
          } else {
            allRects.push(null);
          }
        } catch (e) {
          allRects.push(null);
        }
      }
      
      setReplacedHighlightRects(allRects);
    }, 50);
    return () => clearTimeout(timer);
  }, [replacedMatches, effectiveContainerRef]);

  // Scroll to current match
  useEffect(() => {
    const container = effectiveContainerRef.current;
    if (!container || matches.length === 0 || currentMatchIndex === undefined) return;
    
    const match = matches[currentMatchIndex];
    if (!match) return;

    // Calculate line number and scroll to it
    const textBeforeMatch = content.substring(0, match.start);
    const lineNumber = textBeforeMatch.split('\n').length - 1;
    const lineHeight = parseInt(fontSize, 10) * 1.5; // Approximate line height
    const scrollTarget = lineNumber * lineHeight;
    
    isSyncingRef.current = true;
    container.scrollTop = Math.max(0, Math.min(scrollTarget, container.scrollHeight - container.clientHeight));
    setTimeout(() => { isSyncingRef.current = false; }, 250);
  }, [matches, currentMatchIndex, content, fontSize, effectiveContainerRef]);

  // Reset scroll to top only when switching to a different file
  useEffect(() => {
    if (filename !== previousFilenameRef.current) {
      previousFilenameRef.current = filename;
      const container = effectiveContainerRef.current;
      if (!container) return;
      
      // Reset scroll to top only on actual file change
      container.scrollTop = 0;
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = 0;
      }
    }
  }, [filename, effectiveContainerRef]);

  return (
    <div className="editor-panel" style={style}>
      <div className="editor-header">
      </div>
      <div className="editor-code-wrap">
        <div className="editor-line-numbers" ref={lineNumbersRef} style={{ fontSize, width: lineNumberWidth }}>
          {Array.from({ length: lineCount }, (_, i) => i + 1).map(lineNum => (
            <div key={lineNum} className="editor-line-number">{lineNum}</div>
          ))}
        </div>
        <div className="editor-code-container" ref={effectiveContainerRef}>
          {/* Render match highlights using actual DOM positions */}
          {highlightRects.length > 0 && (
            <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
              {highlightRects.map((rectArray, matchIdx) => 
                rectArray && Array.isArray(rectArray) ? rectArray.map((rect, rectIdx) => (
                  <div
                    key={`${matchIdx}-${rectIdx}`}
                    className={`editor-match-highlight ${matchIdx === currentMatchIndex ? 'editor-match-current' : ''}`}
                    style={{
                      top: `${rect.top}px`,
                      left: `${rect.left}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                    }}
                  />
                )) : null
              )}
            </div>
          )}
          {/* Render replaced highlights with success color */}
          {replacedHighlightRects.length > 0 && (
            <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 1 }}>
              {replacedHighlightRects.map((rectArray, matchIdx) => 
                rectArray && Array.isArray(rectArray) ? rectArray.map((rect, rectIdx) => (
                  <div
                    key={`replaced-${matchIdx}-${rectIdx}`}
                    className="editor-match-replaced"
                    style={{
                      top: `${rect.top}px`,
                      left: `${rect.left}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                    }}
                  />
                )) : null
              )}
            </div>
          )}
          <SimpleEditor
            value={content}
            onValueChange={onChange}
            highlight={highlight}
            tabSize={4}
            insertSpaces
            style={{
              fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
              fontSize,
              lineHeight: '1.6',
              minHeight: '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
