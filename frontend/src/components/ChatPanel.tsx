import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, Trash2, Plus, X } from 'lucide-react';
import { 
  AIProvider, 
  ChatMessage as AIMessage, 
  AIServiceManager, 
  ChatHistoryManager,
} from '../services/AIServices';
import { useAgent } from '../hooks/useAgent';
import './ChatPanel.css';

interface ChatPanelProps {
  selectedFile?: string;
  fileContent?: string;
  onOpenSettings?: () => void;
}

type ProviderType = AIProvider | 'local-qwen';

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  selectedFile = 'untitled.md', 
  fileContent = '', 
  onOpenSettings 
}) => {
  const [currentProvider, setCurrentProvider] = useState<ProviderType>('local-qwen');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [showDiffPreview, setShowDiffPreview] = useState(false);
  const [pendingDiffs, setPendingDiffs] = useState<Array<{ filePath: string; patch: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { sendMessage: sendToAgent, applyDiffs } = useAgent();

  const providers: ProviderType[] = ['local-qwen', 'copilot', 'chatgpt', 'gemini', 'claude'];
  const providerLabels: Record<ProviderType, string> = {
    'local-qwen': '⚡ Qwen2.5-Coder (Local)',
    copilot: '🚀 GitHub Copilot',
    chatgpt: '🤖 ChatGPT',
    gemini: '✨ Google Gemini',
    claude: '🧠 Claude',
  };

  // Load chat history when provider changes
  useEffect(() => {
    if (currentProvider !== 'local-qwen') {
      const history = ChatHistoryManager.getHistory(currentProvider as AIProvider);
      setMessages(history);
    }
    setShowProviderMenu(false);
  }, [currentProvider]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputValue]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    console.log('📤 Sending message:', inputValue);
    
    const userMessage: AIMessage = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    // Add user message to UI
    setMessages(prev => [...prev, userMessage]);
    if (currentProvider !== 'local-qwen') {
      ChatHistoryManager.saveMessage(currentProvider as AIProvider, userMessage);
    }
    setInputValue('');

    // Handle local Qwen provider
    if (currentProvider === 'local-qwen') {
      setIsLoading(true);
      try {
        console.log('📡 Calling agent API...');
        const response = await sendToAgent({
          message: userMessage.content,
          projectPath: '/',
          includeGitContext: false,
        });

        console.log('✅ Agent response:', response);

        if (response.error) {
          const errorMessage: AIMessage = {
            role: 'assistant',
            content: `❌ Error: ${response.error}`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }

        // Add assistant response
        const assistantMessage: AIMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Show diff preview if diffs available
        if (response.diffs && response.diffs.length > 0) {
          setPendingDiffs(response.diffs);
          setShowDiffPreview(true);

          const diffNotification: AIMessage = {
            role: 'assistant',
            content: `📝 Generated changes in ${response.diffs.length} file(s). Review and apply?`,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, diffNotification]);
        }
      } catch (error: any) {
        console.error('❌ Error sending message:', error);
        const errorMessage: AIMessage = {
          role: 'assistant',
          content: `❌ Error: ${error.message || 'Failed to get response'}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Handle cloud providers (existing logic)
    // Check authentication
    if (!AIServiceManager.isAuthenticated(currentProvider as AIProvider)) {
      const errorMessage: AIMessage = {
        role: 'assistant',
        content: `❌ Not authenticated with ${providerLabels[currentProvider]}. Please configure API key in Settings.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      ChatHistoryManager.saveMessage(currentProvider as AIProvider, errorMessage);
      return;
    }

    // Send to AI service
    setIsLoading(true);
    try {
      const response = await AIServiceManager.sendMessage({
        provider: currentProvider as AIProvider,
        messages: [...messages, userMessage],
        codeContext: fileContent,
      });

      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      ChatHistoryManager.saveMessage(currentProvider as AIProvider, assistantMessage);
    } catch (error: any) {
      // Format error message nicely
      const errorText = error.message || 'Unknown error occurred';
      
      const errorMessage: AIMessage = {
        role: 'assistant',
        content: `⚠️ ${errorText}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      ChatHistoryManager.saveMessage(currentProvider as AIProvider, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setConfirmClearHistory(true);
  };

  const handleConfirmClearHistory = () => {
    if (currentProvider !== 'local-qwen') {
      ChatHistoryManager.clearHistory(currentProvider as AIProvider);
    }
    setMessages([]);
    setConfirmClearHistory(false);
  };

  const handleNewChat = () => {
    if (currentProvider !== 'local-qwen') {
      ChatHistoryManager.clearHistory(currentProvider as AIProvider);
    }
    setMessages([]);
    setShowDiffPreview(false);
    setPendingDiffs([]);
    inputRef.current?.focus();
  };

  const handleApplyDiffs = async () => {
    try {
      setIsLoading(true);
      await applyDiffs(pendingDiffs);
      
      const successMessage: AIMessage = {
        role: 'assistant',
        content: `✅ Successfully applied ${pendingDiffs.length} file(s)! Changes auto-committed to git.`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, successMessage]);
      setShowDiffPreview(false);
      setPendingDiffs([]);
    } catch (error: any) {
      const errorMessage: AIMessage = {
        role: 'assistant',
        content: `❌ Failed to apply diffs: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectDiffs = () => {
    const rejectMessage: AIMessage = {
      role: 'assistant',
      content: '❌ Changes rejected. No files were modified.',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, rejectMessage]);
    setShowDiffPreview(false);
    setPendingDiffs([]);
  };

  // Local Qwen always authenticated, others need API key
  const isAuthenticated = currentProvider === 'local-qwen' 
    ? true 
    : AIServiceManager.isAuthenticated(currentProvider as AIProvider);

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title">
          <span>Chat</span>
          <div className="chat-provider-selector-compact">
            <button
              className="chat-provider-btn-compact"
              onClick={() => setShowProviderMenu(!showProviderMenu)}
              title={providerLabels[currentProvider]}
            >
              {providerLabels[currentProvider]}
            </button>
            
            {showProviderMenu && (
              <div className="chat-provider-menu">
                {providers.map(provider => {
                  const isAuth = provider === 'local-qwen' 
                    ? true 
                    : AIServiceManager.isAuthenticated(provider as AIProvider);
                  return (
                    <button
                      key={provider}
                      className={`chat-provider-option ${provider === currentProvider ? 'active' : ''} ${
                        isAuth ? 'authenticated' : ''
                      }`}
                      onClick={() => setCurrentProvider(provider)}
                    >
                      {providerLabels[provider]}
                      {isAuth && <span className="auth-badge">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="chat-header-controls">
          <button
            className="chat-icon-btn"
            onClick={handleNewChat}
            title="New chat"
          >
            <Plus size={14} />
          </button>
          <button
            className="chat-icon-btn"
            onClick={handleClearHistory}
            title="Clear history"
          >
            <Trash2 size={14} />
          </button>
          <button
            className="chat-icon-btn"
            onClick={onOpenSettings}
            title="Settings & Authentication"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Status badge */}
      {currentProvider !== 'local-qwen' && !isAuthenticated && (
        <div className="chat-status-banner warning">
          ⚠️ Not authenticated. Configure in Settings →
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <p>Start a conversation with {providerLabels[currentProvider]}</p>
            <small>Code context will be automatically included</small>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`chat-message chat-message-${msg.role}`}>
              <div className="chat-message-avatar">
                {msg.role === 'user' ? '👤' : providerLabels[currentProvider].split(' ')[0]}
              </div>
              <div className="chat-message-content">
                <p>{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="chat-message chat-message-assistant loading">
            <div className="chat-message-avatar">⏳</div>
            <div className="chat-message-content">
              <p>Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Confirmation Dialog */}
      {confirmClearHistory && (
        <div className="chat-confirmation-overlay">
          <div className="chat-confirmation-dialog">
            <p>Clear chat history for this provider?</p>
            <div className="chat-confirmation-buttons">
              <button
                className="chat-confirmation-btn cancel"
                onClick={() => setConfirmClearHistory(false)}
              >
                Cancel
              </button>
              <button
                className="chat-confirmation-btn confirm"
                onClick={handleConfirmClearHistory}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diff Preview Modal */}
      {showDiffPreview && pendingDiffs.length > 0 && (
        <div className="chat-diff-modal-overlay">
          <div className="chat-diff-modal">
            <div className="chat-diff-modal-header">
              <h3>📝 Preview Changes ({pendingDiffs.length} file{pendingDiffs.length !== 1 ? 's' : ''})</h3>
              <button
                className="chat-diff-modal-close"
                onClick={handleRejectDiffs}
                title="Reject changes"
              >
                <X size={20} />
              </button>
            </div>

            <div className="chat-diff-modal-content">
              {pendingDiffs.map((diff, idx) => (
                <div key={idx} className="chat-diff-file">
                  <div className="chat-diff-file-name">
                    📄 {diff.filePath}
                  </div>
                  <pre className="chat-diff-patch">{diff.patch}</pre>
                </div>
              ))}
            </div>

            <div className="chat-diff-modal-actions">
              <button
                className="chat-diff-btn reject"
                onClick={handleRejectDiffs}
                disabled={isLoading}
              >
                ❌ Reject
              </button>
              <button
                className="chat-diff-btn apply"
                onClick={handleApplyDiffs}
                disabled={isLoading}
              >
                ✅ {isLoading ? 'Applying...' : 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ask for code generation, bug fix suggestions, etc..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isLoading}
        />
        <button
          className="chat-send-btn"
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          title="Send (Shift+Enter for new line)"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
