import React, { useRef, useEffect, useState } from 'react';
import './GoToLinePanel.css';

interface GoToLinePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLine: (lineNumber: number) => void;
  totalLines: number;
}

export const GoToLinePanel: React.FC<GoToLinePanelProps> = ({
  isOpen,
  onClose,
  onGoToLine,
  totalLines,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lineInput, setLineInput] = useState('');

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setLineInput('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      const lineNum = parseInt(lineInput, 10);
      if (!isNaN(lineNum) && lineNum >= 1 && lineNum <= totalLines) {
        onGoToLine(lineNum);
        onClose();
      }
      e.preventDefault();
    }
  };

  const lineNum = parseInt(lineInput, 10);
  const isValid = !isNaN(lineNum) && lineNum >= 1 && lineNum <= totalLines;

  return (
    <div className="go-to-line-panel">
      <div className="go-to-line-header">
        <h3>Go to Line</h3>
        <button className="go-to-line-close" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </div>
      <div className="go-to-line-content">
        <label className="go-to-line-label">Line Number</label>
        <div className="go-to-line-input-group">
          <input
            ref={inputRef}
            type="text"
            placeholder={`1-${totalLines}`}
            value={lineInput}
            onChange={(e) => setLineInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="go-to-line-input"
          />
          <span className="go-to-line-info">
            {lineInput ? `of ${totalLines}` : `of ${totalLines}`}
          </span>
        </div>
        <button
          className={`go-to-line-btn ${isValid ? 'valid' : 'invalid'}`}
          onClick={() => {
            if (isValid) {
              onGoToLine(lineNum);
              onClose();
            }
          }}
          disabled={!isValid}
        >
          Go to Line
        </button>
      </div>
    </div>
  );
};
