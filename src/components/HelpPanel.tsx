import React, { useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import mermaid from 'mermaid';
import 'highlight.js/styles/atom-one-light.css';
import 'katex/dist/katex.min.css';
import './HelpPanel.css';

interface HelpPanelProps {
  visible: boolean;
  onClose: () => void;
}

let mermaidInitialized = false;

const initializeMermaid = () => {
  if (!mermaidInitialized) {
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose'
    });
    mermaidInitialized = true;
  }
};

const MermaidBlockHelp = ({ code, title }: { code: string; title: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef(`mermaid-help-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (ref.current) {
      const render = async () => {
        try {
          initializeMermaid();
          const { svg } = await mermaid.render(id.current, code);
          if (ref.current) {
            ref.current.innerHTML = svg;
            ref.current.classList.add('mermaid-success');
          }
        } catch (err: any) {
          console.error('Mermaid render error:', err);
          if (ref.current) {
            ref.current.innerHTML = `<div class="mermaid-error-msg">Diagram Error: ${err.message}</div>`;
            ref.current.classList.add('mermaid-error');
          }
        }
      };
      render();
    }
  }, [code]);

  return (
    <div
      ref={ref}
      className="mermaid-diagram"
      style={{
        minHeight: '200px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    />
  );
};

const HelpPanel: React.FC<HelpPanelProps> = ({ visible, onClose }) => {
  // Initialize hooks at the top, before any returns
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);
  const rehypePlugins = useMemo(() => [rehypeKatex], []);

  if (!visible) return null;

  const examples = [
    {
      title: 'Bold & Italic Text',
      markdown: '**Bold text** or __bold text__\n\n*Italic text* or _italic text_\n\n~~Strikethrough~~'
    },
    {
      title: 'Headings',
      markdown: '# Heading 1\n## Heading 2\n### Heading 3\n#### Heading 4'
    },
    {
      title: 'Lists - Unordered',
      markdown: '- Item 1\n- Item 2\n  - Nested item\n  - Nested item 2\n- Item 3'
    },
    {
      title: 'Lists - Ordered',
      markdown: '1. First item\n2. Second item\n3. Third item'
    },
    {
      title: 'Links',
      markdown: '[Click here](https://example.com)\n\n[Link with title](https://example.com "Hover text")'
    },
    {
      title: 'Blockquotes',
      markdown: '> This is a blockquote\n> It can span multiple lines\n>\n> > Nested blockquotes work too'
    },
    {
      title: 'Tables',
      markdown: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n| Cell 3   | Cell 4   |'
    },
    {
      title: 'Inline Code & Code Block',
      markdown: 'Use `backticks` for inline code\n\n```javascript\nfunction hello() {\n  console.log(\'Hello World\');\n}\n```'
    },
    {
      title: 'Math Expression',
      markdown: 'Inline math: $E = mc^2$\n\nDisplay math:\n$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$'
    },
    {
      title: 'Horizontal Line',
      markdown: 'Above the line\n\n---\n\nBelow the line'
    }
  ];

  const mermaidExamples = [
    {
      title: 'Flowchart',
      code: 'flowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Process]\n    B -->|No| D[End]\n    C --> D'
    },
    {
      title: 'Sequence Diagram',
      code: 'sequenceDiagram\n    participant User\n    participant App\n    User->>App: Click Button\n    App->>User: Display Result'
    },
    {
      title: 'Pie Chart',
      code: 'pie title My Skills\n    "React" : 30\n    "TypeScript" : 25\n    "CSS" : 20\n    "Other" : 25'
    }
  ];

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-panel" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>Markdown Help - Live Preview</h2>
          <button className="help-close" onClick={onClose} title="Close Help">
            <X size={24} />
          </button>
        </div>
        <div className="help-content">
          <div className="help-intro">
            <h3>Markdown Syntax Guide</h3>
            <p>Click on each section to see how markdown code renders in real-time.</p>
          </div>

          {examples.map((example, index) => (
            <div key={index} className="help-example">
              <h3 className="example-title">{example.title}</h3>
              <div className="example-container">
                <div className="example-code">
                  <pre>{example.markdown}</pre>
                </div>
                <div className="example-preview">
                  <ReactMarkdown 
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                  >
                    {example.markdown}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          <div className="help-example">
            <h3 className="example-title">Mermaid Diagrams</h3>
            <p className="diagram-note">Interactive diagrams using Mermaid syntax:</p>
            
            {mermaidExamples.map((diagram, index) => (
              <div key={index} className="mermaid-help-example">
                <h4 className="mermaid-title">{diagram.title}</h4>
                <div className="mermaid-example-container">
                  <div className="mermaid-code">
                    <pre>{`\`\`\`mermaid\n${diagram.code}\n\`\`\``}</pre>
                  </div>
                  <div className="mermaid-preview">
                    <MermaidBlockHelp code={diagram.code} title={diagram.title} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="help-tips">
            <h3>💡 Quick Tips</h3>
            <ul>
              <li><strong>Image Zoom:</strong> 50% - 1600% (use toolbar controls)</li>
              <li><strong>Content Zoom:</strong> 50% - 200% (use toolbar controls)</li>
              <li><strong>Double-click images/diagrams</strong> to toggle zoom</li>
              <li><strong>Drag divider</strong> between editor and preview to resize</li>
              <li><strong>File Explorer:</strong> Click "Files" button to manage multiple files</li>
              <li><strong>Save files:</strong> Use "Save" button (downloads as .md file)</li>
              <li><strong>Mermaid Diagrams:</strong> Use triple backticks with "mermaid" language tag</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPanel;
