import { useEffect, useMemo, useRef, useState, CSSProperties } from 'react';
import { Download, Maximize2, Minimize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import rehypeHighlight from 'rehype-highlight';
import { common } from 'lowlight';
import 'highlight.js/styles/atom-one-light.css';
import 'katex/dist/katex.min.css';
import './PreviewPanel.css';

// Custom COBOL language definition for highlight.js
const cobol = (hljs: any) => ({
  name: 'COBOL',
  case_insensitive: true,
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
      'INITIALIZE SET SEARCH ALL ' +
      'GO THRU THROUGH ALTER ' +
      'NOT AND OR ' +
      'ZERO ZEROS ZEROES SPACE SPACES HIGH-VALUE LOW-VALUE QUOTE QUOTES ' +
      'TRUE FALSE',
    type: 'PIC PICTURE COMP COMP-1 COMP-2 COMP-3 COMP-4 COMP-5 BINARY PACKED-DECIMAL DISPLAY',
  },
  contains: [
    hljs.COMMENT('\\*', '$'),
    hljs.COMMENT('^......\\*', '$'),
    { className: 'string', begin: '\'', end: '\'', illegal: '\\n' },
    { className: 'string', begin: '"', end: '"', illegal: '\\n' },
    { className: 'number', begin: '\\b\\d+(\\.\\d+)?\\b' },
    { className: 'symbol', begin: '^[0-9]{6}' }, // sequence numbers
  ],
});

// Simple JCL language definition
const jcl = (hljs: any) => ({
  name: 'JCL',
  case_insensitive: true,
  contains: [
    hljs.COMMENT('//\\*', '$'),
    { className: 'keyword', begin: '^\\s*//\\S+\\s+(JOB|EXEC|DD|PROC|PEND|SET|IF|THEN|ELSE|ENDIF|INCLUDE|JCLLIB|COMMAND|OUTPUT|XMIT)', end: '$' },
    { className: 'string', begin: '\'', end: '\'', contains: [{ begin: '\'\'', relevance: 0 }] },
    { className: 'symbol', begin: '^\\s*//\\S+', end: '\\s' },
    { className: 'attr', begin: 'DSN=|DISP=|SPACE=|DCB=|VOL=|UNIT=|SYSOUT=|PGM=' },
  ],
});

// ===================== JSON Viewer =====================
const JvValue: React.FC<{ v: any; depth: number }> = ({ v, depth }) => {
  if (v === null) return <span className="jv-null">null</span>;
  if (v === true || v === false) return <span className="jv-bool">{String(v)}</span>;
  if (typeof v === 'number') return <span className="jv-num">{v}</span>;
  if (typeof v === 'string') return <span className="jv-str">"{v}"</span>;
  return <JvNode data={v} depth={depth} />;
};

const JvNode: React.FC<{ data: any; depth: number }> = ({ data, depth }) => {
  const [open, setOpen] = useState(depth < 3);
  const isArr = Array.isArray(data);
  const entries: [string | number, any][] = isArr
    ? data.map((v: any, i: number) => [i, v])
    : Object.entries(data);
  const ob = isArr ? '[' : '{';
  const cb = isArr ? ']' : '}';
  if (entries.length === 0) return <span className="jv-brace">{ob}{cb}</span>;
  return (
    <span>
      <span className="jv-toggle" onClick={() => setOpen(o => !o)} role="button">{open ? '▾ ' : '▸ '}</span>
      <span className="jv-brace">{ob}</span>
      {open ? (
        <>
          <div className="jv-block">
            {entries.map(([k, v], i) => (
              <div key={String(k)} className="jv-row">
                {!isArr && <><span className="jv-key">"{k}"</span><span className="jv-colon">: </span></>}
                <JvValue v={v} depth={depth + 1} />
                {i < entries.length - 1 && <span className="jv-comma">,</span>}
              </div>
            ))}
          </div>
          <span className="jv-brace">{cb}</span>
        </>
      ) : (
        <><span className="jv-ellipsis" onClick={() => setOpen(true)} role="button"> …{entries.length} </span><span className="jv-brace">{cb}</span></>
      )}
    </span>
  );
};

const JsonViewer: React.FC<{ content: string }> = ({ content }) => {
  const result = useMemo(() => {
    try { return { data: JSON.parse(content), error: null }; }
    catch (e: any) { return { data: null, error: e.message }; }
  }, [content]);
  if (result.error) return <div className="jv-error">⚠ JSON parse error: {result.error}</div>;
  return (
    <div className="jv-root">
      {typeof result.data === 'object' && result.data !== null
        ? <JvNode data={result.data} depth={0} />
        : <JvValue v={result.data} depth={0} />}
    </div>
  );
};

// ===================== XML Viewer =====================
const XvNode: React.FC<{ node: Node; depth: number }> = ({ node, depth }) => {
  const [open, setOpen] = useState(depth < 3);
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim() ?? '';
    if (!text) return null;
    return <span className="xv-text">{text}</span>;
  }
  if (node.nodeType === Node.COMMENT_NODE) {
    return <div className="xv-comment">&lt;!-- {node.textContent} --&gt;</div>;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const attrs = Array.from(el.attributes);
  const children = Array.from(el.childNodes).filter(n =>
    n.nodeType !== Node.TEXT_NODE || (n.textContent?.trim() ?? '')
  );
  const tag = el.tagName;
  if (children.length === 0) {
    return (
      <div className="xv-el">
        &lt;<span className="xv-tag">{tag}</span>
        {attrs.map(a => <span key={a.name}> <span className="xv-attr">{a.name}</span>=<span className="xv-val">"{a.value}"</span></span>)}
        /&gt;
      </div>
    );
  }
  return (
    <div className="xv-el">
      <span className="xv-toggle" onClick={() => setOpen(o => !o)} role="button">{open ? '▾' : '▸'}</span>
      &lt;<span className="xv-tag">{tag}</span>
      {attrs.map(a => <span key={a.name}> <span className="xv-attr">{a.name}</span>=<span className="xv-val">"{a.value}"</span></span>)}
      &gt;
      {open ? (
        <>
          <div className="xv-block">
            {children.map((c, i) => <XvNode key={i} node={c} depth={depth + 1} />)}
          </div>
          &lt;/<span className="xv-tag">{tag}</span>&gt;
        </>
      ) : (
        <><span className="xv-ellipsis" onClick={() => setOpen(true)} role="button"> … </span>&lt;/<span className="xv-tag">{tag}</span>&gt;</>
      )}
    </div>
  );
};

const XmlViewer: React.FC<{ content: string }> = ({ content }) => {
  const result = useMemo(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'application/xml');
      const errEl = doc.querySelector('parsererror');
      if (errEl) return { doc: null, error: errEl.textContent };
      return { doc, error: null };
    } catch (e: any) { return { doc: null, error: e.message }; }
  }, [content]);
  if (result.error) return <div className="xv-error">⚠ XML parse error: {result.error}</div>;
  return (
    <div className="xv-root">
      {Array.from(result.doc!.childNodes).map((n: Node, i) => <XvNode key={i} node={n} depth={0} />)}
    </div>
  );
};

interface PreviewPanelProps {
  content: string;
  filename?: string; // Track when file changes
  style?: CSSProperties;
  onImageContextMenu?: (e: React.MouseEvent) => void;
  previewMode?: 'markdown' | 'html' | 'json' | 'xml';
  onScroll?: (ratio: number) => void;
  syncScrollRatio?: number;
  onDownloadHtml?: () => void;
  onDiagramScroll?: () => void;
  previewMaximized?: boolean;
  onToggleMaximize?: () => void;
}

let mermaidInitialized = false;

const initializeMermaid = () => {
  if (!mermaidInitialized) {
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      logLevel: 'error',
      suppressErrorRendering: true
    });
    mermaidInitialized = true;
  }
};

const MermaidBlock = ({ node, className, children, onContextMenu, onDiagramScroll, ...props }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);  // For manual DOM manipulation
  const wrapperRef = useRef<HTMLDivElement>(null);     // For React events
  const [scaledDimensions, setScaledDimensions] = useState<{ width: number; height: number } | undefined>(undefined);
  const [localZoom, setLocalZoom] = useState(100);
  const [badgePos, setBadgePos] = useState<{ x: number; y: number } | null>(null);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [isMoving, setIsMoving] = useState(false);  // Track if user is dragging/moving
  const [mode, setMode] = useState<'zoom' | 'move'>('zoom'); // Track interaction mode
  const [isHovering, setIsHovering] = useState(false); // Track hover state
  const [isZoomOutMode, setIsZoomOutMode] = useState(false); // Track zoom out mode (Space/Backspace)
  const [hasError, setHasError] = useState(false); // Track if mermaid rendering failed
  const badgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchPointsRef = useRef<number>(0);  // Track active touch points
  const dragStartRef = useRef<{ x: number; y: number } | null>(null); // Track drag start position
  const scrollStartRef = useRef<{ scrollLeft: number; scrollTop: number } | null>(null); // Track initial scroll position

  useEffect(() => {
    // Only process mermaid code blocks
    if (!className?.includes('language-mermaid') || !containerRef.current) {
      return;
    }

    // Capture ref value for cleanup function
    const container = containerRef.current;
    let isMounted = true;

    const renderMermaid = async () => {
      try {
        initializeMermaid();
        
        let code = '';
        
        if (node?.children?.[0]?.value) {
          code = node.children[0].value.trim();
        } else if (typeof children === 'string') {
          code = children.trim();
        } else if (Array.isArray(children) && children.length > 0) {
          code = children
            .map((child: any) => typeof child === 'string' ? child : (child?.props?.children || ''))
            .join('')
            .trim();
        }
        
        if (!code) {
          throw new Error('Empty Mermaid diagram code');
        }

        // Reset zoom when diagram changes
        if (isMounted) {
          setLocalZoom(100);
          setHasError(false); // Clear error state when rendering starts
        }

        // Use a unique ID for each render to avoid conflicts
        const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render mermaid diagram and get SVG string
        const { svg } = await mermaid.render(uniqueId, code);
        
        if (isMounted && containerRef.current) {
          // Completely remove old content
          while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
          }
          
          // Insert SVG as HTML - this container is NOT managed by React
          containerRef.current.innerHTML = svg;
          
          if (wrapperRef.current) {
            wrapperRef.current.classList.add('mermaid-success');
            wrapperRef.current.classList.remove('mermaid-error');
          }
          
          // Measure the rendered SVG to calculate scaled dimensions
          setTimeout(() => {
            if (isMounted && containerRef.current) {
              const svg = containerRef.current.querySelector('svg');
              if (svg) {
                const bbox = svg.getBBox?.() || { width: svg.clientWidth, height: svg.clientHeight };
                const naturalWidth = bbox.width || svg.clientWidth || 400;
                const naturalHeight = bbox.height || svg.clientHeight || 200;
                setScaledDimensions({ width: naturalWidth, height: naturalHeight });
              }
            }
          }, 0);
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (isMounted && containerRef.current) {
          setHasError(true); // Set error state
          containerRef.current.innerHTML = `<div class="mermaid-error-msg">Diagram Error: ${err.message}</div>`;
          if (wrapperRef.current) {
            wrapperRef.current.classList.add('mermaid-error');
            wrapperRef.current.classList.remove('mermaid-success');
          }
        }
      }
    };
    
    renderMermaid();

    // Cleanup function - remove all children when unmounting
    return () => {
      isMounted = false;
      // Use captured container value instead of ref
      if (container) {
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      }
    };
  }, [children, className, node]);

  // Keyboard event handler to switch between zoom and move modes
  useEffect(() => {
    if (!isHovering || hasError) return; // Don't process keyboard if there's an error


    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'z') {
        setMode('zoom');
        setIsZoomOutMode(false);
        console.log('Switched to ZOOM mode');
      } else if (key === 'v') {
        setMode('move');
        setIsZoomOutMode(false);
        console.log('Switched to MOVE mode');
      } else if (key === ' ' || key === 'backspace') {
        e.preventDefault();
        setIsZoomOutMode(true);
        console.log('ZOOM OUT mode activated');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === ' ' || key === 'backspace') {
        e.preventDefault();
        setIsZoomOutMode(false);
        console.log('ZOOM OUT mode deactivated');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isHovering, hasError]);

  // Scale the SVG element when zoom changes
  useEffect(() => {
    if (containerRef.current) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        const scaleRatio = localZoom / 100;
        svg.style.transform = `scale(${scaleRatio})`;
        svg.style.transformOrigin = 'top left';
        svg.style.transition = 'transform 0.2s ease';
      }
    }
  }, [localZoom]);

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('Mermaid context menu clicked!', e);
    if (onContextMenu) {
      onContextMenu(e);
    }
  };

  // Track multi-touch events to prevent zoom during pan/scroll
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchPointsRef.current = e.touches.length;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    touchPointsRef.current = e.touches.length;
    setIsMoving(false);
  };

  // Mouse enter - start hovering
  const handleMouseEnter = () => {
    if (!hasError) { // Only set hover state if there's no error
      setIsHovering(true);
    }
  };

  // Mouse leave - reset hover and stop moving
  const handleMouseLeave = () => {
    setIsHovering(false);
    setIsMoving(false);
    dragStartRef.current = null;
  };

  // Handle mouse down - start drag if in move mode
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasError) return; // Don't respond to mouse down if there's an error
    if (mode === 'move') {
      setIsMoving(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      if (wrapperRef.current) {
        scrollStartRef.current = {
          scrollLeft: wrapperRef.current.scrollLeft,
          scrollTop: wrapperRef.current.scrollTop,
        };
      }
    }
  };

  // Handle mouse move - drag diagram if in move mode
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMoving && dragStartRef.current && scrollStartRef.current && mode === 'move') {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      if (wrapperRef.current) {
        wrapperRef.current.scrollLeft = scrollStartRef.current.scrollLeft - deltaX;
        wrapperRef.current.scrollTop = scrollStartRef.current.scrollTop - deltaY;
      }
    }
  };

  const handleMouseUp = () => {
    setIsMoving(false);
    dragStartRef.current = null;
    scrollStartRef.current = null;
  };

  // Cycle through zoom levels: 100 -> 200 -> 400 -> 800 -> 100
  const zoomLevels = [100, 200, 400, 800];
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't zoom if there's an error
    if (hasError) return;
    
    // Only allow zoom if in zoom mode (not move mode)
    if (mode === 'move') return;

    e.preventDefault();
    e.stopPropagation();
    
    // Don't zoom if multi-touch is active
    if (touchPointsRef.current > 1) {
      return;
    }
    
    // Show badge near cursor
    const offsetX = 15;
    const offsetY = 15;
    setBadgePos({ x: e.clientX + offsetX, y: e.clientY + offsetY });
    setBadgeVisible(true);
    
    // Clear existing timeout
    if (badgeTimeoutRef.current) {
      clearTimeout(badgeTimeoutRef.current);
    }
    
    // Hide badge after 1.5 seconds
    badgeTimeoutRef.current = setTimeout(() => {
      setBadgeVisible(false);
    }, 1500);
    
    const currentIndex = zoomLevels.indexOf(localZoom);
    
    // If zoom out mode (Space/Backspace), go to previous level; otherwise go to next level
    let nextIndex;
    if (isZoomOutMode) {
      nextIndex = (currentIndex - 1 + zoomLevels.length) % zoomLevels.length;
      console.log('Mermaid zoomed OUT to:', zoomLevels[nextIndex] + '%');
    } else {
      nextIndex = (currentIndex + 1) % zoomLevels.length;
      console.log('Mermaid zoomed IN to:', zoomLevels[nextIndex] + '%');
    }
    
    setLocalZoom(zoomLevels[nextIndex]);
  };

  if (className?.includes('language-mermaid')) {
    // Calculate container size to accommodate scaled content
    const containerWidth = scaledDimensions ? scaledDimensions.width * (localZoom / 100) : undefined;
    const containerHeight = scaledDimensions ? scaledDimensions.height * (localZoom / 100) : undefined;
    
    // Determine cursor based on mode and hover state
    // When there's an error, use default cursor and allow text selection
    let cursorStyle = 'default';
    let userSelectStyle = hasError ? 'auto' : 'none'; // Allow text selection on error
    
    if (!hasError && isHovering) {
      if (isZoomOutMode) {
        cursorStyle = 'zoom-out'; // Shows magnifying glass with -
      } else if (mode === 'zoom') {
        cursorStyle = 'zoom-in'; // Shows magnifying glass with +
      } else if (mode === 'move') {
        cursorStyle = isMoving ? 'grabbing' : 'grab'; // Shows hand
      }
    }
    
    return (
      <div
        ref={wrapperRef}
        className="mermaid-diagram"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onScroll={onDiagramScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          minHeight: '200px',
          minWidth: '100%',
          width: containerWidth ? `${containerWidth}px` : undefined,
          height: containerHeight ? `${containerHeight}px` : undefined,
          transition: 'width 0.2s ease, height 0.2s ease',
          cursor: cursorStyle,
          userSelect: userSelectStyle as any,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Inner container for manual DOM manipulation - NOT managed by React */}
        <div
          ref={containerRef}
          style={{
            width: '100%',
          }}
        />
        
        {/* Floating zoom badge near cursor */}
        {badgeVisible && badgePos && (
          <div
            style={{
              position: 'fixed',
              left: `${badgePos.x}px`,
              top: `${badgePos.y}px`,
              backgroundColor: '#667eea',
              color: '#fff',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 'bold',
              zIndex: 10000,
              pointerEvents: 'none',
              userSelect: 'none',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              animation: 'fadeInOut 1.5s ease-in-out',
            }}
          >
            {localZoom}%
          </div>
        )}
      </div>
    );
  }

  // Regular code block with syntax highlighting
  return (
    <pre className={className}>
      <code>{children}</code>
    </pre>
  );
};

const SimpleImage = ({ src, alt, onContextMenu }: any) => {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current) {
      const handleContextMenu = (e: MouseEvent) => {
        console.log('Image contextmenu event fired!');
        e.preventDefault();
        if (onContextMenu) {
          const syntheticEvent = {
            ...e,
            clientX: e.clientX,
            clientY: e.clientY,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
          } as any;
          onContextMenu(syntheticEvent);
        }
      };

      const element = imgRef.current;
      if (element) {
        element.addEventListener('contextmenu', handleContextMenu);
      }
      return () => {
        if (element) {
          element.removeEventListener('contextmenu', handleContextMenu);
        }
      };
    }
  }, [onContextMenu]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      style={{
        maxWidth: '100%',
        height: 'auto',
        userSelect: 'none',
        display: 'block',
        margin: '10px 0',
      }}
    />
  );
};

const PreviewPanel: React.FC<PreviewPanelProps> = ({ content, filename = '', style, onImageContextMenu, previewMode = 'markdown', onScroll, syncScrollRatio = 0, onDownloadHtml, onDiagramScroll, previewMaximized = false, onToggleMaximize }) => {
  const previewContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeMermaid();
  }, []);

  // Attach native contextmenu listener to preview content div
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isImage = target.tagName === 'IMG';
      const isMermaid = target.closest('.mermaid-diagram') || target.closest('svg.mermaid');
      
      console.log('Native contextmenu event on preview-content:', {
        isImage,
        isMermaid,
        targetTagName: target.tagName,
        targetClass: target.className
      });
      
      if (isImage || isMermaid) {
        console.log('✓ Preventing default and calling onImageContextMenu');
        e.preventDefault();
        if (onImageContextMenu) {
          // Convert native event to React synthetic event
          const syntheticEvent = {
            ...e,
            clientX: e.clientX,
            clientY: e.clientY,
            preventDefault: () => e.preventDefault(),
            stopPropagation: () => e.stopPropagation(),
          } as any;
          onImageContextMenu(syntheticEvent);
        }
      }
    };

    const element = previewContentRef.current;
    if (element) {
      console.log('Attaching native contextmenu listener to preview-content div');
      element.addEventListener('contextmenu', handleContextMenu, true);
      return () => {
        console.log('Removing native contextmenu listener from preview-content div');
        element.removeEventListener('contextmenu', handleContextMenu, true);
      };
    }
  }, [onImageContextMenu]);

  const isSyncingRef = useRef(false);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const previousFilenameRef = useRef(filename);
  const lastScrollEmitTimeRef = useRef(0); // Throttle scroll emissions

  // Handle scroll events and emit onScroll callback (throttled via RAF)
  useEffect(() => {
    const element = previewContentRef.current;
    if (!element) return;
    const handleScroll = () => {
      // Mark user is scrolling
      userScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        userScrollingRef.current = false;
      }, 300);
      
      // Only emit if NOT syncing from parent AND enough time since last emit
      const now = Date.now();
      if (!isSyncingRef.current && now - lastScrollEmitTimeRef.current > 200 && onScroll) {
        lastScrollEmitTimeRef.current = now; // Update last emit time
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          const ratio = element.scrollHeight > element.clientHeight
            ? element.scrollTop / (element.scrollHeight - element.clientHeight)
            : 0;
          onScroll(ratio);
        });
      }
    };
    element.addEventListener('scroll', handleScroll);
    return () => {
      element.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [onScroll]);

  // Apply scroll from parent sync - but skip if user is actively scrolling
  useEffect(() => {
    const element = previewContentRef.current;
    if (!element || syncScrollRatio === undefined || syncScrollRatio === null || userScrollingRef.current) return;
    
    const maxScroll = element.scrollHeight - element.clientHeight;
    if (maxScroll <= 0) return; // No scrollbar needed
    
    isSyncingRef.current = true;
    const scrollTop = Math.max(0, Math.min(syncScrollRatio * maxScroll, maxScroll));
    element.scrollTop = scrollTop;
    setTimeout(() => { isSyncingRef.current = false; }, 250);
  }, [syncScrollRatio]);

  // Reset scroll to top only when switching to a different file
  useEffect(() => {
    if (filename !== previousFilenameRef.current) {
      previousFilenameRef.current = filename;
      const element = previewContentRef.current;
      if (!element) return;
      
      // Reset scroll to top only on actual file change
      element.scrollTop = 0;
    }
  }, [filename]);

  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath] as any[], []);
  const rehypePlugins = useMemo(() => [
    rehypeKatex,
    [rehypeHighlight, { languages: { ...common, cobol, jcl }, detect: true }],
  ], []);

  const components = useMemo(
    () => ({
      pre: (props: any) => {
        const node = props.node;
        const codeElement = props.children?.[0];
        const className = codeElement?.props?.className || '';
        const isMermaid = className.includes('language-mermaid');

        if (isMermaid) {
          // hast tree structure: pre.children[0] = code element, code.children[0] = text node
          let code = '';
          if (node?.children?.[0]?.children?.[0]?.value) {
            code = node.children[0].children[0].value;
          } else if (node?.children?.[0]?.value) {
            code = node.children[0].value;
          } else if (typeof codeElement?.props?.children === 'string') {
            code = codeElement.props.children;
          }

          if (code) {
            return (
              <MermaidBlock
                node={node}
                className={className}
                children={code}
                onContextMenu={onImageContextMenu}
                onDiagramScroll={onDiagramScroll}
              />
            );
          }
        }

        // Regular code block
        return <pre {...props}>{props.children}</pre>;
      },
      img: (props: any) => (
        <SimpleImage 
          {...props}
          onContextMenu={onImageContextMenu}
        />
      ),
    }),
    [onImageContextMenu, onDiagramScroll]
  );

  return (
    <div className="preview-panel" style={style}>
      <div className="preview-header">
        <span>Preview</span>
        <div className="preview-header-controls">
          {onToggleMaximize && (
            <button 
              className="preview-maximize-btn" 
              onClick={onToggleMaximize} 
              title={previewMaximized ? "Exit Fullscreen" : "Fullscreen"}
            >
              {previewMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          {onDownloadHtml && (
            <button className="preview-export-btn" onClick={onDownloadHtml} title="Export as HTML">
              <Download size={14} />
            </button>
          )}
        </div>
      </div>
      {previewMode === 'html' ? (
        <iframe
          className="preview-html-frame"
          srcDoc={content}
          title="HTML Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      ) : previewMode === 'json' ? (
        <div className="preview-content preview-viewer">
          <JsonViewer content={content} />
        </div>
      ) : previewMode === 'xml' ? (
        <div className="preview-content preview-viewer">
          <XmlViewer content={content} />
        </div>
      ) : (
        <div
          ref={previewContentRef}
          className="preview-content"
        >
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins as any}
            components={components}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
