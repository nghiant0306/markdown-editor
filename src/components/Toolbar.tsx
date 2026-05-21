import { FileText, HelpCircle, MessageCircle } from 'lucide-react';
import './Toolbar.css';

interface ToolbarProps {
  showFileExplorer?: boolean;
  onToggleFileExplorer?: () => void;
  showHelp?: boolean;
  onToggleHelp?: () => void;
  showChat?: boolean;
  onToggleChat?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  showFileExplorer = false,
  onToggleFileExplorer,
  showHelp = false,
  onToggleHelp,
  showChat = false,
  onToggleChat,
}) => {
  return (
    <div className="toolbar">

      <div className="toolbar-group">
        <button 
          className={`toolbar-btn ${showFileExplorer ? 'active' : ''}`}
          onClick={onToggleFileExplorer}
          title={showFileExplorer ? 'Hide Files' : 'Show Files'}
        >
          <FileText size={18} />
          <span>{showFileExplorer ? 'Files' : 'Files'}</span>
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <button 
          className={`toolbar-btn chat-btn ${showChat ? 'active' : ''}`}
          onClick={onToggleChat}
          title="Show AI Assistant"
        >
          <MessageCircle size={18} />
          <span>Chat</span>
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <button 
          className="toolbar-btn help-btn"
          onClick={onToggleHelp}
          title="Show Markdown Help"
        >
          <HelpCircle size={18} />
          <span>Help</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
