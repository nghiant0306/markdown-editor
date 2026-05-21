import { useCallback, useMemo, CSSProperties, useRef, useEffect } from 'react';
import SimpleEditor from 'react-simple-code-editor';
import { createLowlight, common } from 'lowlight';
import './EditorPanel.css';

interface EditorPanelProps {
  content: string;
  onChange: (content: string) => void;
  zoom: number;
  filename?: string;
  style?: CSSProperties;
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

const EditorPanel: React.FC<EditorPanelProps> = ({ content, onChange, zoom, filename = '', style }) => {
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync scroll between line numbers and editor
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handleScroll = () => {
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = wrapper.scrollTop;
      }
    };
    wrapper.addEventListener('scroll', handleScroll);
    return () => wrapper.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="editor-panel" style={style}>
      <div className="editor-header">
        <span>Editor</span>
      </div>
      <div className="editor-code-wrap" ref={wrapperRef}>
        <div className="editor-line-numbers" ref={lineNumbersRef} style={{ fontSize, width: lineNumberWidth }}>
          {Array.from({ length: lineCount }, (_, i) => i + 1).map(lineNum => (
            <div key={lineNum} className="editor-line-number">{lineNum}</div>
          ))}
        </div>
        <div className="editor-code-container">
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
