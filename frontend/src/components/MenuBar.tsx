import { FileText, Eye, MessageSquare, Sidebar } from 'lucide-react';
import './MenuBar.css';

interface MenuBarProps {
  showExplorer: boolean;
  onToggleExplorer: () => void;
  showEditor: boolean;
  onToggleEditor: () => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  showChat: boolean;
  onToggleChat: () => void;
}

const MenuBar: React.FC<MenuBarProps> = ({
  showExplorer,
  onToggleExplorer,
  showEditor,
  onToggleEditor,
  showPreview,
  onTogglePreview,
  showChat,
  onToggleChat,
}) => {
  return (
    <div className="menu-bar">
      <div className="menu-actions">
        <button
          className={`menu-icon ${showExplorer ? 'active' : ''}`}
          onClick={onToggleExplorer}
          title="Toggle Explorer"
        >
          <Sidebar size={18} />
        </button>
        <button
          className={`menu-icon ${showEditor ? 'active' : ''}`}
          onClick={onToggleEditor}
          title="Toggle Editor"
        >
          <FileText size={18} />
        </button>
        <button
          className={`menu-icon ${showPreview ? 'active' : ''}`}
          onClick={onTogglePreview}
          title="Toggle Preview"
        >
          <Eye size={18} />
        </button>
        <button
          className={`menu-icon ${showChat ? 'active' : ''}`}
          onClick={onToggleChat}
          title="Toggle Chat"
        >
          <MessageSquare size={18} />
        </button>
      </div>
    </div>
  );
};

export default MenuBar;
