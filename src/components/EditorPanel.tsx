import { useCallback, CSSProperties } from 'react';
import './EditorPanel.css';

interface EditorPanelProps {
  content: string;
  onChange: (content: string) => void;
  zoom: number;
  style?: CSSProperties;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ content, onChange, zoom, style }) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className="editor-panel" style={style}>
      <div className="editor-header">
        <span>Editor</span>
      </div>
      <textarea
        className="editor-textarea"
        value={content}
        onChange={handleChange}
        spellCheck="false"
        style={{
          fontSize: `${10 * (zoom / 100)}px`,
          lineHeight: `${1.6}`,
        }}
        placeholder="Enter your markdown here..."
      />
    </div>
  );
};

export default EditorPanel;
