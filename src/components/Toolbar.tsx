import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, FileText, HelpCircle, MessageCircle } from 'lucide-react';
import './Toolbar.css';

interface ToolbarProps {
  zoom: number;
  onZoom: (direction: 'in' | 'out' | 'reset') => void;
  imageZoom?: number;
  onImageZoom?: (direction: 'in' | 'out' | 'reset') => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  showFileExplorer?: boolean;
  onToggleFileExplorer?: () => void;
  showHelp?: boolean;
  onToggleHelp?: () => void;
  showChat?: boolean;
  onToggleChat?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  zoom, 
  onZoom, 
  imageZoom = 100, 
  onImageZoom, 
  showPreview, 
  onTogglePreview,
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
        <span className="toolbar-label">Content:</span>
        <button 
          className="toolbar-btn"
          onClick={() => onZoom('out')}
          title="Zoom Out"
          disabled={zoom <= 50}
        >
          <ZoomOut size={18} />
        </button>
        <span className="zoom-display">{zoom}%</span>
        <button 
          className="toolbar-btn"
          onClick={() => onZoom('in')}
          title="Zoom In"
          disabled={zoom >= 200}
        >
          <ZoomIn size={18} />
        </button>
        <button 
          className="toolbar-btn"
          onClick={() => onZoom('reset')}
          title="Reset Zoom"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <span className="toolbar-label">Image:</span>
        <button 
          className="toolbar-btn"
          onClick={() => onImageZoom && onImageZoom('out')}
          title="Zoom Out Image"
          disabled={imageZoom <= 50}
        >
          <ZoomOut size={18} />
        </button>
        <span className="zoom-display">{imageZoom}%</span>
        <button 
          className="toolbar-btn"
          onClick={() => onImageZoom && onImageZoom('in')}
          title="Zoom In Image"
          disabled={imageZoom >= 1600}
        >
          <ZoomIn size={18} />
        </button>
        <button 
          className="toolbar-btn"
          onClick={() => onImageZoom && onImageZoom('reset')}
          title="Reset Image Zoom"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-group">
        <button 
          className={`toolbar-btn ${showPreview ? 'active' : ''}`}
          onClick={onTogglePreview}
          title={showPreview ? 'Hide Preview' : 'Show Preview'}
        >
          {showPreview ? <Eye size={18} /> : <EyeOff size={18} />}
          <span>{showPreview ? 'Preview' : 'Editor'}</span>
        </button>
      </div>

      <div className="toolbar-divider"></div>

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
