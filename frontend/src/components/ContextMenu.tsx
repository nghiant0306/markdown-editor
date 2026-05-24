import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  visible: boolean;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  visible,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('ContextMenu visible:', visible, 'at', x, y);

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        console.log('Click outside context menu');
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', onClose);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('contextmenu', onClose);
      };
    }
  }, [visible, onClose, x, y]);

  if (!visible) {
    console.log('ContextMenu not visible, returning null');
    return null;
  }

  // Adjust position to keep menu on screen
  let adjustedX = x;
  let adjustedY = y;
  
  // Account for menu width (160px)
  if (x + 180 > window.innerWidth) {
    adjustedX = window.innerWidth - 180;
  }
  
  // Account for menu height (~100px)
  if (y + 100 > window.innerHeight) {
    adjustedY = window.innerHeight - 100;
  }

  console.log('ContextMenu rendering at', adjustedX, adjustedY);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        top: `${adjustedY}px`,
        left: `${adjustedX}px`,
        zIndex: 99999,
      }}
    >
    </div>
  );
};

export default ContextMenu;
