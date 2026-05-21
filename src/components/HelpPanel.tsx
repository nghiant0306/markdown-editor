import React, { useEffect, useRef, useMemo, useState } from 'react';
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('overview');

  if (!visible) return null;

  const sections = [
    { id: 'overview', title: '📖 Overview', icon: '📖' },
    { id: 'explorer', title: '📁 File Explorer', icon: '📁' },
    { id: 'editor', title: '✏️ Editor', icon: '✏️' },
    { id: 'preview', title: '👁️ Preview Panel', icon: '👁️' },
    { id: 'search', title: '🔍 Search & Replace', icon: '🔍' },
    { id: 'goto', title: '🎯 Go To Line', icon: '🎯' },
    { id: 'syntax', title: '📝 Markdown Syntax', icon: '📝' },
    { id: 'tips', title: '⚡ Quick Tips', icon: '⚡' }
  ];

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(`help-section-${sectionId}`);
    if (element && contentRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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
          <h2>Markdown Editor Guide</h2>
          <button className="help-close" onClick={onClose} title="Close Help">
            <X size={24} />
          </button>
        </div>
        <div className="help-container">
          <nav className="help-menu">
            <div className="help-menu-title">Contents</div>
            <ul className="help-menu-list">
              {sections.map(section => (
                <li key={section.id}>
                  <button 
                    className={`help-menu-item ${activeSection === section.id ? 'active' : ''}`}
                    onClick={() => scrollToSection(section.id)}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="help-content" ref={contentRef}>
            <div id="help-section-overview" className="help-intro">
              <h3>📖 Markdown Editor Guide</h3>
              <p>Learn how to use each feature of the editor. Click on the menu items to navigate.</p>
            </div>

            {/* File Explorer Section */}
            <div id="help-section-explorer" className="help-section">
              <h3 className="section-title">📁 File Explorer</h3>
            <div className="help-text">
              <p><strong>Overview:</strong> Manage your markdown files and folders in the left panel.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li><strong>Open Folder:</strong> Click the folder icon to open a project folder</li>
                <li><strong>Create New File:</strong> Click "+" button to create a new file in the current folder</li>
                <li><strong>Open File:</strong> Click file names in the tree to open them</li>
                <li><strong>File Tabs:</strong> Recently opened files appear at the top with close (×) buttons</li>
                <li><strong>Edit Indicator:</strong> Red "E" badge shows unsaved changes</li>
                <li><strong>Save File:</strong> Press <code>Ctrl+S</code> or use Save button to save current file</li>
                <li><strong>Switch Files:</strong> Click file names in tabs or tree to switch between open files</li>
              </ul>
            </div>
          </div>

          {/* Editor Section */}
          <div id="help-section-editor" className="help-section">
            <h3 className="section-title">✏️ Editor</h3>
            <div className="help-text">
              <p><strong>Overview:</strong> Write and edit markdown in the center-left panel.</p>
              <p><strong>Keyboard Shortcuts:</strong></p>
              <ul>
                <li><code>Ctrl+S</code> - Save current file</li>
                <li><code>Ctrl+F</code> - Open Find & Replace panel</li>
                <li><code>Ctrl+G</code> - Go to specific line number</li>
                <li><code>Tab</code> - Indent line(s)</li>
                <li><code>Shift+Tab</code> - Dedent line(s)</li>
              </ul>
              <p><strong>Features:</strong></p>
              <ul>
                <li>Syntax highlighting for code blocks</li>
                <li>Real-time preview on the right</li>
                <li>Line numbers on the left</li>
                <li>Scroll sync with preview (optional)</li>
              </ul>
            </div>
          </div>

          {/* Preview Section */}
          <div id="help-section-preview" className="help-section">
            <h3 className="section-title">👁️ Preview Panel</h3>
            <div className="help-text">
              <p><strong>Overview:</strong> Live preview of your markdown on the right panel.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li><strong>Image Zoom:</strong> Adjust image size with zoom buttons (50%-1600%)</li>
                <li><strong>Export HTML:</strong> Download rendered content as HTML file</li>
                <li><strong>View Modes:</strong> Toggle between Markdown, HTML, JSON, and XML views</li>
                <li><strong>Scroll Sync:</strong> Synchronized scrolling between editor and preview</li>
                <li><strong>Image Context Menu:</strong> Right-click images for quick zoom actions</li>
              </ul>
              <p><strong>Supported Markdown Features:</strong></p>
              <ul>
                <li>Headers, bold, italic, strikethrough</li>
                <li>Lists (ordered & unordered)</li>
                <li>Code blocks with syntax highlighting</li>
                <li>Tables with GitHub Flavored Markdown</li>
                <li>Math expressions with KaTeX</li>
                <li>Mermaid diagrams</li>
                <li>Links and images</li>
              </ul>
            </div>
          </div>

          {/* Search & Replace Section */}
          <div id="help-section-search" className="help-section">
            <h3 className="section-title">🔍 Search & Replace</h3>
            <div className="help-text">
              <p><strong>Overview:</strong> Find and replace text in your document.</p>
              <p><strong>How to Open:</strong></p>
              <ul>
                <li>Press <code>Ctrl+F</code> in the editor</li>
                <li>Or use the Find button in the toolbar</li>
              </ul>
              <p><strong>Features:</strong></p>
              <ul>
                <li><strong>Find:</strong> Type text to search - shows match count</li>
                <li><strong>Replace:</strong> Click "Replace" toggle to enable replace mode</li>
                <li><strong>Navigation:</strong> Use arrows to jump between matches</li>
                <li><strong>Replace Actions:</strong>
                  <ul>
                    <li><strong>Replace One:</strong> Replace current match</li>
                    <li><strong>Replace All:</strong> Replace all occurrences at once</li>
                  </ul>
                </li>
                <li><strong>Case Sensitive:</strong> Toggle for case-sensitive search</li>
                <li><strong>Match Highlighting:</strong> Current match highlighted in yellow, others in blue</li>
              </ul>
              <p><strong>Keyboard Shortcuts:</strong></p>
              <ul>
                <li><code>Enter</code> or <code>↓</code> - Next match</li>
                <li><code>Shift+Enter</code> or <code>↑</code> - Previous match</li>
                <li><code>Escape</code> - Close panel</li>
              </ul>
            </div>
          </div>

          {/* Go To Line Section */}
          <div id="help-section-goto" className="help-section">
            <h3 className="section-title">🎯 Go To Line</h3>
            <div className="help-text">
              <p><strong>Overview:</strong> Jump to a specific line number in the document.</p>
              <p><strong>How to Open:</strong></p>
              <ul>
                <li>Press <code>Ctrl+G</code> in the editor</li>
                <li>Or use the Go To Line button in the toolbar</li>
              </ul>
              <p><strong>How to Use:</strong></p>
              <ul>
                <li>Enter a line number (1 to total lines)</li>
                <li>Press <code>Enter</code> to jump to that line</li>
                <li>Press <code>Escape</code> to close</li>
              </ul>
              <p><strong>Tips:</strong></p>
              <ul>
                <li>Shows total line count in document</li>
                <li>Automatically closes after jumping</li>
                <li>Line numbers are 1-indexed (first line is 1, not 0)</li>
              </ul>
            </div>
          </div>

          {/* Markdown Examples */}
          <div id="help-section-syntax" className="help-section">
            <h3 className="section-title">📝 Markdown Syntax Examples</h3>
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

          <div id="help-section-tips" className="help-tips">
            <h3>⚡ Quick Tips</h3>
            <ul>
              <li><strong>File Management:</strong> Use File Explorer on the left to create and open files</li>
              <li><strong>Save Shortcut:</strong> Press <code>Ctrl+S</code> to quickly save your file</li>
              <li><strong>Edit Indicator:</strong> Red "E" badge shows which files have unsaved changes</li>
              <li><strong>Find & Replace:</strong> Press <code>Ctrl+F</code> to open the find panel</li>
              <li><strong>Jump to Line:</strong> Press <code>Ctrl+G</code> to go to a specific line</li>
              <li><strong>Image Zoom:</strong> Use zoom controls in preview header (50% - 1600%)</li>
              <li><strong>Resize Panels:</strong> Drag the divider between editor and preview to resize</li>
              <li><strong>Export:</strong> Click "Export HTML" button in preview header to download as HTML</li>
              <li><strong>Scroll Sync:</strong> Keep editor and preview scrolled together</li>
              <li><strong>Syntax Highlighting:</strong> Code blocks automatically highlight supported languages</li>
            </ul>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPanel;
