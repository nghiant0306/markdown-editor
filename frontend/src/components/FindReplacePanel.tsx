import React, { useRef, useEffect, useState } from 'react';
import './FindReplacePanel.css';

interface FindReplacePanelProps {
  isOpen: boolean;
  showReplace: boolean;
  onClose: () => void;
  onFind: (findText: string, caseSensitive: boolean) => void;
  onReplace: (findText: string, replaceText: string, caseSensitive: boolean, replaceAll: boolean) => void;
  matchCount?: number;
  currentMatch?: number;
  onPrevMatch?: () => void;
  onNextMatch?: () => void;
}

export const FindReplacePanel: React.FC<FindReplacePanelProps> = ({
  isOpen,
  showReplace,
  onClose,
  onFind,
  onReplace,
  matchCount = 0,
  currentMatch = 0,
  onPrevMatch,
  onNextMatch,
}) => {
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  useEffect(() => {
    if (isOpen && findInputRef.current) {
      setTimeout(() => findInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.altKey && e.key === 'p') {
      // Alt+P: Previous match
      if (onPrevMatch) {
        onPrevMatch();
      }
      e.preventDefault();
    } else if (e.altKey && e.key === 'n') {
      // Alt+N: Next match
      if (onNextMatch) {
        onNextMatch();
      }
      e.preventDefault();
    } else if (e.altKey && e.key === 'r' && !e.shiftKey) {
      // Alt+R: Replace
      handleReplace();
      e.preventDefault();
    } else if (e.altKey && e.shiftKey && e.key === 'R') {
      // Alt+Shift+R: Replace All
      handleReplaceAll();
      e.preventDefault();
    } else if (e.key === 'Enter') {
      if (e.shiftKey && onPrevMatch) {
        onPrevMatch();
      } else if (onNextMatch) {
        onNextMatch();
      }
      e.preventDefault();
    }
  };

  const handleFind = () => {
    onFind(findText, caseSensitive);
  };

  const handleReplace = () => {
    onReplace(findText, replaceText, caseSensitive, false);
  };

  const handleReplaceAll = () => {
    onReplace(findText, replaceText, caseSensitive, true);
  };

  const displayCount = findText.length > 0 ? `${currentMatch} of ${matchCount}` : '';

  return (
    <div className="find-replace-panel">
      <div className="find-replace-header">
        <h3>Find & Replace</h3>
        <button className="find-replace-close" onClick={onClose} title="Close (Esc)">
          ✕
        </button>
      </div>

      <div className="find-replace-content">
        {/* Find row */}
        <div className="find-replace-row">
          <label className="find-replace-label">Find</label>
          <div className="find-replace-input-group">
            <input
              ref={findInputRef}
              type="text"
              placeholder="Find..."
              value={findText}
              onChange={(e) => {
                setFindText(e.target.value);
                handleFind();
              }}
              onKeyDown={handleKeyDown}
              className="find-replace-input"
            />
            {findText && <span className="find-replace-count">{displayCount}</span>}
          </div>
          {!showReplace && (
            <div className="find-replace-button-group">
              <button onClick={onPrevMatch} className="find-replace-btn find-replace-nav-btn" title="Previous match (Alt+P)">
                <u>P</u>rev
              </button>
              <button onClick={onNextMatch} className="find-replace-btn find-replace-nav-btn" title="Next match (Alt+N)">
                <u>N</u>ext
              </button>
            </div>
          )}
        </div>

        {/* Replace row */}
        {showReplace && (
          <div className="find-replace-row">
            <label className="find-replace-label">Replace</label>
            <input
              ref={replaceInputRef}
              type="text"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="find-replace-input"
            />
            <button onClick={handleReplace} className="find-replace-btn find-replace-replace-btn" title="Replace (Alt+R)">
              <u>R</u>eplace
            </button>
            <button onClick={handleReplaceAll} className="find-replace-btn find-replace-replace-all-btn" title="Replace All (Alt+Shift+R)">
              <u>R</u>eplace All
            </button>
          </div>
        )}

        {/* Options row */}
        <div className="find-replace-options">
          <label className="find-replace-checkbox">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => {
                setCaseSensitive(e.target.checked);
                handleFind();
              }}
            />
            <span>Match Case</span>
          </label>
        </div>
      </div>
    </div>
  );
};
