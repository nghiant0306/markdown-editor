import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AIProvider, AIServiceManager } from '../services/AIServices';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<AIProvider>('copilot');
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
    copilot: '',
    chatgpt: '',
    gemini: '',
    claude: '',
  });
  const [authStatus, setAuthStatus] = useState<Record<AIProvider, boolean>>({
    copilot: false,
    chatgpt: false,
    gemini: false,
    claude: false,
  });
  const [showPasswords, setShowPasswords] = useState<Record<AIProvider, boolean>>({
    copilot: false,
    chatgpt: false,
    gemini: false,
    claude: false,
  });
  const [saveStatus, setSaveStatus] = useState<Record<AIProvider, string>>({
    copilot: '',
    chatgpt: '',
    gemini: '',
    claude: '',
  });

  const providers: AIProvider[] = ['copilot', 'chatgpt', 'gemini', 'claude'];
  const providerLabels: Record<AIProvider, string> = {
    copilot: 'GitHub Copilot',
    chatgpt: 'ChatGPT (OpenAI)',
    gemini: 'Google Gemini',
    claude: 'Anthropic Claude',
  };

  const providerDocLinks: Record<AIProvider, string> = {
    copilot: 'https://docs.github.com/en/copilot/overview-of-github-copilot/about-github-copilot',
    chatgpt: 'https://platform.openai.com/account/api-keys',
    gemini: 'https://aistudio.google.com/app/apikey',
    claude: 'https://console.anthropic.com/account/keys',
  };

  const providerInstructions: Record<AIProvider, string> = {
    copilot: 'Get your GitHub Copilot token from GitHub settings. You need an active GitHub Copilot subscription.',
    chatgpt: 'Create an API key at platform.openai.com. Ensure you have credits or a paid plan.',
    gemini: 'Get your API key from Google AI Studio. Free tier available with usage limits.',
    claude: 'Create an API key at console.anthropic.com. Free credits available for testing.',
  };

  // Load saved configs on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen) {
      const newApiKeys: Record<AIProvider, string> = {} as any;
      const newAuthStatus: Record<AIProvider, boolean> = {} as any;
      
      providers.forEach(provider => {
        const config = AIServiceManager.getConfig(provider);
        newApiKeys[provider] = config.apiKey || config.accessToken || '';
        newAuthStatus[provider] = config.isAuthenticated || false;
      });
      
      setApiKeys(newApiKeys);
      setAuthStatus(newAuthStatus);
    }
  }, [isOpen]);

  const handleSaveApiKey = (provider: AIProvider) => {
    const key = apiKeys[provider];
    if (!key.trim()) {
      setSaveStatus(prev => ({ ...prev, [provider]: 'error' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [provider]: '' }));
      }, 2000);
      return;
    }

    AIServiceManager.setConfig(provider, {
      apiKey: key,
      accessToken: key,
      isAuthenticated: true,
    });

    setAuthStatus(prev => ({ ...prev, [provider]: true }));
    setSaveStatus(prev => ({ ...prev, [provider]: 'success' }));
    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, [provider]: '' }));
    }, 2000);
  };

  const handleClearApiKey = (provider: AIProvider) => {
    setApiKeys(prev => ({ ...prev, [provider]: '' }));
    AIServiceManager.setConfig(provider, {
      apiKey: '',
      accessToken: '',
      isAuthenticated: false,
    });
    setAuthStatus(prev => ({ ...prev, [provider]: false }));
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>AI Provider Settings</h2>
          <button className="settings-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="settings-content">
          {/* Tabs */}
          <div className="settings-tabs">
            {providers.map(provider => (
              <button
                key={provider}
                className={`settings-tab ${activeTab === provider ? 'active' : ''} ${
                  authStatus[provider] ? 'authenticated' : ''
                }`}
                onClick={() => setActiveTab(provider)}
              >
                {providerLabels[provider].split(' ')[0]}
                {authStatus[provider] && <span className="tab-badge">✓</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="settings-tab-content">
            {providers.map(provider => (
              activeTab === provider && (
                <div key={provider} className="settings-provider-config">
                  <h3>{providerLabels[provider]}</h3>
                  
                  <div className="settings-info-box">
                    <p>{providerInstructions[provider]}</p>
                    <a 
                      href={providerDocLinks[provider]} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="settings-doc-link"
                    >
                      📖 Get API Key →
                    </a>
                  </div>

                  <div className="settings-input-group">
                    <label>API Key / Access Token</label>
                    <div className="settings-input-wrapper">
                      <input
                        type={showPasswords[provider] ? 'text' : 'password'}
                        className="settings-input"
                        placeholder="Paste your API key here..."
                        value={apiKeys[provider]}
                        onChange={(e) =>
                          setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))
                        }
                      />
                      <button
                        className="settings-show-btn"
                        onClick={() =>
                          setShowPasswords(prev => ({ ...prev, [provider]: !prev[provider] }))
                        }
                        title={showPasswords[provider] ? 'Hide' : 'Show'}
                      >
                        {showPasswords[provider] ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div className="settings-auth-status">
                    {authStatus[provider] ? (
                      <div className="status-badge success">
                        ✓ Authenticated
                      </div>
                    ) : (
                      <div className="status-badge pending">
                        ⚠ Not configured
                      </div>
                    )}
                  </div>

                  <div className="settings-actions">
                    <button
                      className="settings-btn save"
                      onClick={() => handleSaveApiKey(provider)}
                    >
                      💾 Save API Key
                    </button>
                    {authStatus[provider] && (
                      <button
                        className="settings-btn clear"
                        onClick={() => handleClearApiKey(provider)}
                      >
                        🗑️ Clear
                      </button>
                    )}
                  </div>

                  {saveStatus[provider] === 'success' && (
                    <div className="settings-message success">
                      ✓ API key saved successfully!
                    </div>
                  )}
                  {saveStatus[provider] === 'error' && (
                    <div className="settings-message error">
                      ✗ API key cannot be empty
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        </div>

        <div className="settings-footer">
          <small>💡 Your API keys are stored securely in your browser's localStorage</small>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
