import { FileText } from 'lucide-react';
import './MenuBar.css';

interface MenuBarProps {}

const MenuBar: React.FC<MenuBarProps> = () => {
  return (
    <div className="menu-bar">
      <div className="menu-logo">
        <FileText size={16} />
        <span>Markdown Editor</span>
      </div>
      <div className="menu-actions"></div>
    </div>
  );
};

export default MenuBar;
