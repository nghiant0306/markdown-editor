import React, { useState } from 'react';
import { FileText, Folder, X, Plus } from 'lucide-react';
import './FileExplorer.css';

interface OpenFile {
  id: string;
  name: string;
  content: string;
  isDirty: boolean;
}

interface FileExplorerProps {
  openFiles: OpenFile[];
  currentFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCloseFile: (fileId: string) => void;
  onNewFile: () => void;
  onOpenFile: () => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  openFiles,
  currentFileId,
  onSelectFile,
  onCloseFile,
  onNewFile,
  onOpenFile,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <h3>Files</h3>
        <div className="file-explorer-actions">
          <button
            className="file-explorer-btn"
            title="New File"
            onClick={onNewFile}
          >
            <Plus size={16} />
          </button>
          <button
            className="file-explorer-btn"
            title="Open File"
            onClick={onOpenFile}
          >
            <Folder size={16} />
          </button>
        </div>
      </div>

      <div className="file-explorer-content">
        {openFiles.length === 0 ? (
          <div className="file-explorer-empty">
            <p>No files open</p>
            <p className="file-explorer-hint">Click + or 📁 to open files</p>
          </div>
        ) : (
          <div className="file-list">
            {openFiles.map((file) => (
              <div
                key={file.id}
                className={`file-item ${
                  currentFileId === file.id ? 'active' : ''
                }`}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="file-item-content">
                  <FileText size={16} className="file-icon" />
                  <span className="file-name">
                    {file.name}
                    {file.isDirty && <span className="file-dirty">●</span>}
                  </span>
                </div>
                <button
                  className="file-close-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseFile(file.id);
                  }}
                  title="Close file"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
