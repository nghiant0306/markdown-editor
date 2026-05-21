import { useEffect, useMemo, useRef, useState, CSSProperties } from 'react';
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
  zoom: number;
  style?: CSSProperties;
  imageZoom?: number;
  onImageContextMenu?: (e: React.MouseEvent) => void;
  onImageZoomChange?: (direction: 'in' | 'out' | 'reset') => void;
  previewMode?: 'markdown' | 'html' | 'json' | 'xml';
  onScroll?: (ratio: number) => void;
  syncScrollRatio?: number;
}

let mermaidInitialized = false;

const initializeMermaid = () => {
  if (!mermaidInitialized) {
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      logLevel: 'debug'
    });
    mermaidInitialized = true;
  }
};

const MermaidBlock = ({ node, className, children, imageZoom = 100, onContextMenu, onImageZoomChange, ...props }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    // Only process mermaid code blocks
    if (!className?.includes('language-mermaid') || !ref.current) {
      return;
    }

    const renderMermaid = async () => {
      try {
        initializeMermaid();

        // Clean up any orphan element from a previous render with the same ID
        const orphan = document.getElementById(id.current);
        if (orphan) orphan.parentNode?.removeChild(orphan);
        
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
        
        const { svg } = await mermaid.render(id.current, code);
        if (ref.current) {
          ref.current.innerHTML = svg;
          ref.current.classList.add('mermaid-success');
          ref.current.classList.remove('mermaid-error');
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        if (ref.current) {
          ref.current.innerHTML = `<div class="mermaid-error-msg">Diagram Error: ${err.message}</div>`;
          ref.current.classList.add('mermaid-error');
          ref.current.classList.remove('mermaid-success');
        }
      }
    };
    
    renderMermaid();
  }, [children, className, node]);

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('Mermaid context menu clicked!', e);
    if (onContextMenu) {
      onContextMenu(e);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    console.log('Mermaid double-clicked, current zoom:', imageZoom);
    if (onImageZoomChange) {
      if (imageZoom > 100) {
        onImageZoomChange('reset');
      } else {
        onImageZoomChange('in');
      }
    }
  };

  if (className?.includes('language-mermaid')) {
    return (
      <div
        ref={ref}
        className="mermaid-diagram"
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        style={{
          minHeight: '200px',
          transform: `scale(${imageZoom / 100})`,
          transformOrigin: 'top left',
          transition: 'transform 0.2s ease',
          cursor: 'zoom-in',
          userSelect: 'none',
        }}
      />
    );
  }

  // Regular code block with syntax highlighting
  return (
    <pre className={className}>
      <code>{children}</code>
    </pre>
  );
};

const ImageWithZoom = ({ src, alt, onContextMenu, imageZoom, onImageZoomChange }: any) => {
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

      const handleDoubleClick = (e: MouseEvent) => {
        e.preventDefault();
        console.log('Image double-clicked, current zoom:', imageZoom);
        if (onImageZoomChange) {
          // If already zoomed, reset to 100%, otherwise zoom in by 20%
          if (imageZoom > 100) {
            onImageZoomChange('reset');
          } else {
            onImageZoomChange('in');
          }
        }
      };

      const element = imgRef.current;
      if (element) {
        element.addEventListener('contextmenu', handleContextMenu);
        element.addEventListener('dblclick', handleDoubleClick);
      }
      return () => {
        if (element) {
          element.removeEventListener('contextmenu', handleContextMenu);
          element.removeEventListener('dblclick', handleDoubleClick);
        }
      };
    }
  }, [onContextMenu, imageZoom, onImageZoomChange]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      style={{
        maxWidth: '100%',
        height: 'auto',
        cursor: 'zoom-in',
        userSelect: 'none',
        transform: `scale(${imageZoom / 100})`,
        transformOrigin: 'top left',
        transition: 'transform 0.2s ease',
        display: 'block',
        margin: '10px 0',
      }}
    />
  );
};

const PreviewPanel: React.FC<PreviewPanelProps> = ({ content, filename = '', zoom, style, imageZoom = 100, onImageContextMenu, onImageZoomChange, previewMode = 'markdown', onScroll, syncScrollRatio = 0 }) => {
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
  const rafRef = useRef<number | null>(null);
  const previousFilenameRef = useRef(filename);
  const lastScrollEmitTimeRef = useRef(0); // Throttle scroll emissions

  // Handle scroll events and emit onScroll callback (throttled via RAF)
  useEffect(() => {
    const element = previewContentRef.current;
    if (!element) return;
    const handleScroll = () => {
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
    };
  }, [onScroll]);

  // Apply scroll from parent sync
  useEffect(() => {
    const element = previewContentRef.current;
    if (!element || syncScrollRatio === undefined || syncScrollRatio === null) return;
    
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
                imageZoom={imageZoom}
                onContextMenu={onImageContextMenu}
                onImageZoomChange={onImageZoomChange}
              />
            );
          }
        }

        // Regular code block
        return <pre {...props}>{props.children}</pre>;
      },
      img: (props: any) => (
        <ImageWithZoom 
          {...props}
          imageZoom={imageZoom}
          onContextMenu={onImageContextMenu}
          onImageZoomChange={onImageZoomChange}
        />
      ),
    }),
    [imageZoom, onImageContextMenu, onImageZoomChange]
  );

  return (
    <div className="preview-panel" style={style}>
      <div className="preview-header">
        <span>Preview</span>
      </div>
      {previewMode === 'html' ? (
        <iframe
          className="preview-html-frame"
          srcDoc={content}
          title="HTML Preview"
          sandbox="allow-scripts allow-same-origin allow-forms"
          style={{ fontSize: `${10 * (zoom / 100)}px` }}
        />
      ) : previewMode === 'json' ? (
        <div className="preview-content preview-viewer" style={{ fontSize: `${10 * (zoom / 100)}px` }}>
          <JsonViewer content={content} />
        </div>
      ) : previewMode === 'xml' ? (
        <div className="preview-content preview-viewer" style={{ fontSize: `${10 * (zoom / 100)}px` }}>
          <XmlViewer content={content} />
        </div>
      ) : (
        <div
          ref={previewContentRef}
          className="preview-content"
          style={{
            fontSize: `${10 * (zoom / 100)}px`,
            lineHeight: `${1.6 * (zoom / 100)}em`,
          }}
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
