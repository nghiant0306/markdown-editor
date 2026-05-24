import { HelpCircle, Sidebar, FileText, Eye, MessageSquare } from 'lucide-react';
import './Toolbar.css';

interface ToolbarProps {
  showExplorer?: boolean;
  onToggleExplorer?: () => void;
  showEditor?: boolean;
  onToggleEditor?: () => void;
  showPreview?: boolean;
  onTogglePreview?: () => void;
  showChat?: boolean;
  onToggleChat?: () => void;
  showHelp?: boolean;
  onToggleHelp?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  showExplorer = true,
  onToggleExplorer,
  showEditor = true,
  onToggleEditor,
  showPreview = true,
  onTogglePreview,
  showChat = true,
  onToggleChat,
  showHelp = false,
  onToggleHelp,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-spacer"></div>
      <div className="toolbar-group">
        <button 
          className={`toolbar-btn toggle-btn ${showExplorer ? 'active' : ''}`}
          onClick={onToggleExplorer}
          title="Toggle Explorer"
        >
          <Sidebar size={14} />
        </button>
        <button 
          className={`toolbar-btn toggle-btn ${showEditor ? 'active' : ''}`}
          onClick={onToggleEditor}
          title="Toggle Editor"
        >
          <FileText size={14} />
        </button>
        <button 
          className={`toolbar-btn toggle-btn ${showPreview ? 'active' : ''}`}
          onClick={onTogglePreview}
          title="Toggle Preview"
        >
          <Eye size={14} />
        </button>
        <button 
          className={`toolbar-btn toggle-btn ${showChat ? 'active' : ''}`}
          onClick={onToggleChat}
          title="Toggle Chat"
        >
          <MessageSquare size={14} />
        </button>
      </div>
      <div className="toolbar-spacer"></div>
      <div className="toolbar-group">
        <button 
          className="toolbar-btn help-btn"
          onClick={onToggleHelp}
          title="Show Markdown Help"
        >
          <HelpCircle size={14} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
