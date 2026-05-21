import { FileText, Save, Folder, Plus, Download } from 'lucide-react';
import './MenuBar.css';

interface MenuBarProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onDownloadHtml: () => void;
  isDirty: boolean;
}

const MenuBar: React.FC<MenuBarProps> = ({ onNew, onOpen, onSave, onDownloadHtml, isDirty }) => {
  return (
    <div className="menu-bar">
      <div className="menu-logo">
        <FileText size={16} />
        <span>Markdown Editor</span>
      </div>
      <div className="menu-actions">
        <button className="menu-btn" onClick={onNew} title="New File (Ctrl+N)">
          <Plus size={14} />
          <span>New</span>
        </button>
        <button className="menu-btn" onClick={onOpen} title="Open File (Ctrl+O)">
          <Folder size={14} />
          <span>Open</span>
        </button>
        <button 
          className={`menu-btn ${isDirty ? 'dirty' : ''}`}
          onClick={onSave} 
          title="Save File (Ctrl+S)"
        >
          <Save size={14} />
          <span>Save</span>
          {isDirty && <span className="unsaved-indicator">●</span>}
        </button>
        <button className="menu-btn export-btn" onClick={onDownloadHtml} title="Export as HTML">
          <Download size={14} />
          <span>Export HTML</span>
        </button>
      </div>
    </div>
  );
};

export default MenuBar;
