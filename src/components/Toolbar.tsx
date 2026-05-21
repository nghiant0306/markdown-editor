import { HelpCircle } from 'lucide-react';
import './Toolbar.css';

interface ToolbarProps {
  showHelp?: boolean;
  onToggleHelp?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  showHelp = false,
  onToggleHelp,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-spacer"></div>
      <div className="toolbar-group">
        <button 
          className="toolbar-btn help-btn"
          onClick={onToggleHelp}
          title="Show Markdown Help"
        >
          <HelpCircle size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
