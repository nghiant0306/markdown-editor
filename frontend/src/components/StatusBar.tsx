import { FileText } from 'lucide-react';
import './StatusBar.css';
import './StatusBar.css';

interface StatusBarProps {
  filename: string;
  isDirty: boolean;
  zoom: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ filename, isDirty, zoom }) => {
  return (
    <div className="status-bar">
      <div className="status-left">
        <FileText size={16} />
        <span>{filename}</span>
        {isDirty && <span className="dirty-indicator">●</span>}
      </div>
      <div className="status-right">
        <span>Zoom: {zoom}%</span>
      </div>
    </div>
  );
};

export default StatusBar;
