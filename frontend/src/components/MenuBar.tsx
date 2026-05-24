import './MenuBar.css';

interface MenuBarProps {}

const MenuBar: React.FC<MenuBarProps> = () => {
  return (
    <div className="menu-bar">
      <div className="menu-actions"></div>
    </div>
  );
};

export default MenuBar;
