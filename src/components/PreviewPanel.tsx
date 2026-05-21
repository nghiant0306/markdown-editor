import { useEffect, useMemo, useRef, CSSProperties } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import 'highlight.js/styles/atom-one-light.css';
import 'katex/dist/katex.min.css';
import './PreviewPanel.css';

interface PreviewPanelProps {
  content: string;
  zoom: number;
  style?: CSSProperties;
  imageZoom?: number;
  onImageContextMenu?: (e: React.MouseEvent) => void;
  onImageZoomChange?: (direction: 'in' | 'out' | 'reset') => void;
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

      imgRef.current.addEventListener('contextmenu', handleContextMenu);
      imgRef.current.addEventListener('dblclick', handleDoubleClick);
      return () => {
        if (imgRef.current) {
          imgRef.current.removeEventListener('contextmenu', handleContextMenu);
          imgRef.current.removeEventListener('dblclick', handleDoubleClick);
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

const PreviewPanel: React.FC<PreviewPanelProps> = ({ content, zoom, style, imageZoom = 100, onImageContextMenu, onImageZoomChange }) => {
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

  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);
  const rehypePlugins = useMemo(() => [rehypeKatex], []);

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
          rehypePlugins={rehypePlugins}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default PreviewPanel;
