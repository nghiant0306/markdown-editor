// AI Service providers wrapper
export type AIProvider = 'copilot' | 'chatgpt' | 'gemini' | 'claude';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AIConfig {
  provider: AIProvider;
  accessToken?: string;
  apiKey?: string;
  isAuthenticated: boolean;
}

export interface ChatRequest {
  provider: AIProvider;
  messages: ChatMessage[];
  codeContext?: string;
  errorContext?: string;
}

export interface ChatResponse {
  content: string;
  provider: AIProvider;
  error?: string;
}

// Store configs in localStorage
const STORAGE_KEY = 'ai_configs';

export const AIServiceManager = {
  // Get stored config for a provider
  getConfig: (provider: AIProvider): AIConfig => {
    const configs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return configs[provider] || { provider, isAuthenticated: false };
  },

  // Save config for a provider
  setConfig: (provider: AIProvider, config: Partial<AIConfig>) => {
    const configs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    configs[provider] = { ...configs[provider], ...config, provider };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  },

  // Check if provider is authenticated
  isAuthenticated: (provider: AIProvider): boolean => {
    const config = AIServiceManager.getConfig(provider);
    return config.isAuthenticated && !!(config.accessToken || config.apiKey);
  },

  // Send chat message to AI provider
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const config = AIServiceManager.getConfig(request.provider);
    
    if (!config.isAuthenticated) {
      return {
        content: 'Error: Not authenticated with this provider',
        provider: request.provider,
        error: 'UNAUTHORIZED',
      };
    }

    try {
      switch (request.provider) {
        case 'copilot':
          return await sendToCopilot(request, config);
        case 'chatgpt':
          return await sendToChatGPT(request, config);
        case 'gemini':
          return await sendToGemini(request, config);
        case 'claude':
          return await sendToClaude(request, config);
        default:
          return {
            content: 'Unknown provider',
            provider: request.provider,
            error: 'UNKNOWN_PROVIDER',
          };
      }
    } catch (error: any) {
      return {
        content: `Error: ${error.message}`,
        provider: request.provider,
        error: error.code || 'API_ERROR',
      };
    }
  },
};

// GitHub API integration (using REST API for code assistance)
async function sendToCopilot(request: ChatRequest, config: AIConfig): Promise<ChatResponse> {
  if (!config.accessToken && !config.apiKey) {
    throw new Error('GitHub token not configured');
  }

  const token = config.accessToken || config.apiKey;
  const userMessage = request.messages[request.messages.length - 1]?.content || '';

  try {
    // Step 1: Verify token is valid by getting user info
    const userResponse = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Markdown-Editor-Chat',
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      const errorMsg = errorData.message || userResponse.statusText;
      
      // Handle authentication errors
      if (userResponse.status === 401 || errorMsg.includes('Invalid authentication')) {
        throw new Error(
          `GitHub Authentication Failed 🔐\n\n` +
          `Your GitHub token is invalid or expired.\n\n` +
          `Solutions:\n` +
          `1. Check token at: https://github.com/settings/tokens\n` +
          `2. Generate a new Personal Access Token (PAT)\n` +
          `3. Token needs 'repo' and 'user' scopes\n` +
          `4. Paste new token in Chat Settings\n\n` +
          `Original error: ${errorMsg}`
        );
      }
      
      throw new Error(`GitHub authentication failed: ${errorMsg}`);
    }

    const userData = await userResponse.json();
    const username = userData.login;

    // Step 2: Use GitHub API to search relevant code or docs
    let responseContent = '';

    // If user is asking about code, try to find relevant info
    if (userMessage.toLowerCase().includes('code') || 
        userMessage.toLowerCase().includes('function') ||
        userMessage.toLowerCase().includes('help')) {
      
      // Try to get user's repositories for context
      const reposResponse = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=5`, {
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Markdown-Editor-Chat',
        },
      });

      if (reposResponse.ok) {
        const repos = await reposResponse.json();
        const repoList = repos.map((r: any) => `- ${r.name}: ${r.description || 'No description'}`).join('\n');
        
        responseContent = `Hi ${username}! 👋\n\nYour recent repositories:\n${repoList}\n\nHow can I help with your code today?`;
      }
    }

    // Default response with GitHub API info
    if (!responseContent) {
      responseContent = `Connected to GitHub as **${username}** ✅\n\n**Your Query:** "${userMessage}"\n\nGitHub API Integration Ready! I can help you with:\n- Code analysis and suggestions\n- Repository information\n- GitHub workflow assistance\n\nNote: This uses GitHub REST API for context. For advanced AI features, consider adding OpenAI/Claude integration.`;
    }

    return {
      content: responseContent,
      provider: 'copilot',
    };

  } catch (error: any) {
    // Network errors
    if (error instanceof TypeError) {
      throw new Error('Network error: Unable to reach GitHub API. Check your internet connection.');
    }
    throw error;
  }
}

// OpenAI ChatGPT integration
async function sendToChatGPT(request: ChatRequest, config: AIConfig): Promise<ChatResponse> {
  if (!config.apiKey) {
    throw new Error('ChatGPT API key not configured');
  }

  // Validate API key format
  if (!config.apiKey.startsWith('sk-')) {
    throw new Error('Invalid OpenAI API key format. Must start with "sk-"');
  }

  // Try models in order of availability
  const modelsToTry = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: request.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      // Parse response
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || response.statusText || 'Unknown error';
        
        // Handle quota/billing errors
        if (errorMsg.includes('quota') || errorMsg.includes('exceeded')) {
          throw new Error(
            `OpenAI Quota Exceeded ⚠️\n\n` +
            `Your OpenAI account has reached its usage limit.\n\n` +
            `Solutions:\n` +
            `1. Check your billing at: https://platform.openai.com/account/billing/overview\n` +
            `2. Add a payment method if missing\n` +
            `3. Check your usage limits: https://platform.openai.com/account/billing/limits\n` +
            `4. Increase your quota if available\n\n` +
            `Original error: ${errorMsg}`
          );
        }
        
        // Handle authentication errors
        if (errorMsg.includes('invalid') || errorMsg.includes('authentication') || errorMsg.includes('401')) {
          throw new Error(
            `OpenAI Authentication Failed 🔐\n\n` +
            `Your API key is invalid or expired.\n\n` +
            `Solutions:\n` +
            `1. Check your API key is correct (starts with "sk-")\n` +
            `2. Get a new key from: https://platform.openai.com/account/api-keys\n` +
            `3. Make sure you're using the right organization\n\n` +
            `Original error: ${errorMsg}`
          );
        }
        
        // If error is about model not existing, try next model
        if (errorMsg.includes('does not exist') || errorMsg.includes('does not support')) {
          lastError = new Error(`Model ${model} not available: ${errorMsg}`);
          console.log(`Trying next model... (${model} failed)`);
          continue; // Try next model
        }
        
        throw new Error(`OpenAI API error: ${errorMsg}`);
      }

      return {
        content: data.choices[0]?.message?.content || 'No response',
        provider: 'chatgpt',
      };
    } catch (error: any) {
      lastError = error;
      
      // Network error - don't retry
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to reach OpenAI API. Check your internet connection.');
      }
      
      // If it's a model availability error, continue to next model
      if (error.message?.includes('not available')) {
        continue;
      }
      
      // For quota/billing/auth errors, throw immediately (don't try other models)
      if (error.message?.includes('Quota Exceeded') || 
          error.message?.includes('Authentication Failed')) {
        throw error;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }

  // If we tried all models and none worked
  throw new Error(
    `No available ChatGPT models. Last error: ${lastError?.message || 'Unknown error'}. ` +
    `Please check your OpenAI account has access to at least one model (gpt-3.5-turbo is most accessible).`
  );
}

// Google Gemini integration
async function sendToGemini(request: ChatRequest, config: AIConfig): Promise<ChatResponse> {
  if (!config.apiKey) {
    throw new Error('Gemini API key not configured');
  }

  // Try models in order of availability
  const modelsToTry = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro', 'gemini-pro-vision'];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: request.messages[request.messages.length - 1]?.content || '',
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || response.statusText || 'Unknown error';
        
        // Handle quota/rate limit errors
        if (errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('rate')) {
          throw new Error(
            `Google Gemini Quota Exceeded ⚠️\n\n` +
            `Your Google Gemini account has reached its usage limit.\n\n` +
            `Solutions:\n` +
            `1. Check your usage at: https://aistudio.google.com/app/apikey\n` +
            `2. Upgrade your plan for higher limits\n` +
            `3. Wait for quota to reset (usually 1 minute)\n\n` +
            `Original error: ${errorMsg}`
          );
        }
        
        // Handle authentication errors
        if (errorMsg.includes('invalid') || errorMsg.includes('UNAUTHENTICATED') || errorMsg.includes('401') || errorMsg.includes('403')) {
          throw new Error(
            `Google Gemini Authentication Failed 🔐\n\n` +
            `Your API key is invalid or doesn't have proper permissions.\n\n` +
            `Solutions:\n` +
            `1. Check your API key at: https://aistudio.google.com/app/apikey\n` +
            `2. Make sure Generative Language API is enabled\n` +
            `3. Get a new key and try again\n\n` +
            `Original error: ${errorMsg}`
          );
        }
        
        // If error is about model not existing, try next model
        if (errorMsg.includes('not found') || errorMsg.includes('NOT_FOUND') || errorMsg.includes('Model not found')) {
          lastError = new Error(`Model ${model} not available: ${errorMsg}`);
          console.log(`Trying next Gemini model... (${model} failed)`);
          continue; // Try next model
        }
        
        throw new Error(`Google Gemini API error: ${errorMsg}`);
      }

      return {
        content: data.candidates[0]?.content?.parts[0]?.text || 'No response',
        provider: 'gemini',
      };
    } catch (error: any) {
      lastError = error;
      
      // Network error - don't retry
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to reach Google Gemini API. Check your internet connection.');
      }
      
      // If it's a model availability error, continue to next model
      if (error.message?.includes('not available')) {
        continue;
      }
      
      // For quota/billing/auth errors, throw immediately
      if (error.message?.includes('Quota Exceeded') || error.message?.includes('Authentication Failed')) {
        throw error;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }

  // If we tried all models and none worked
  throw new Error(
    `No available Google Gemini models. Last error: ${lastError?.message || 'Unknown error'}. ` +
    `Please check your Google Gemini API key at: https://aistudio.google.com/app/apikey`
  );
}

// Anthropic Claude integration
async function sendToClaude(request: ChatRequest, config: AIConfig): Promise<ChatResponse> {
  if (!config.apiKey) {
    throw new Error('Claude API key not configured');
  }

  // Validate API key format
  if (!config.apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid Anthropic API key format. Must start with "sk-ant-"');
  }

  // Try models in order of availability
  const modelsToTry = ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2024-06-01',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 1024,
          messages: request.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || response.statusText || 'Unknown error';
        
        // Handle quota/rate limit errors
        if (errorMsg.includes('quota') || errorMsg.includes('rate_limit') || errorMsg.includes('overloaded')) {
          throw new Error(
            `Anthropic Claude Quota Exceeded ⚠️\n\n` +
            `Your Claude account has reached its usage limit.\n\n` +
            `Solutions:\n` +
            `1. Check your billing at: https://console.anthropic.com/account/plans\n` +
            `2. Upgrade your plan for higher limits\n` +
            `3. Check rate limits: https://console.anthropic.com/account/limits\n\n` +
            `Original error: ${errorMsg}`
          );
        }
        
        // Handle authentication errors
        if (errorMsg.includes('invalid') || errorMsg.includes('authentication') || errorMsg.includes('401') || errorMsg.includes('permission')) {
          throw new Error(
            `Anthropic Claude Authentication Failed 🔐\n\n` +
            `Your API key is invalid or expired.\n\n` +
            `Solutions:\n` +
            `1. Check your API key is correct (starts with "sk-ant-")\n` +
            `2. Get a new key from: https://console.anthropic.com/account/keys\n` +
            `3. Make sure you have API access enabled\n\n` +
            `Original error: ${errorMsg}`
          );
        }
        
        // If error is about model not existing, try next model
        if (errorMsg.includes('not found') || errorMsg.includes('does not exist') || errorMsg.includes('model not available')) {
          lastError = new Error(`Model ${model} not available: ${errorMsg}`);
          console.log(`Trying next Claude model... (${model} failed)`);
          continue; // Try next model
        }
        
        throw new Error(`Anthropic Claude API error: ${errorMsg}`);
      }

      return {
        content: data.content[0]?.text || 'No response',
        provider: 'claude',
      };
    } catch (error: any) {
      lastError = error;
      
      // Network error - don't retry
      if (error instanceof TypeError) {
        throw new Error('Network error: Unable to reach Anthropic Claude API. Check your internet connection.');
      }
      
      // If it's a model availability error, continue to next model
      if (error.message?.includes('not available')) {
        continue;
      }
      
      // For quota/billing/auth errors, throw immediately
      if (error.message?.includes('Quota Exceeded') || error.message?.includes('Authentication Failed')) {
        throw error;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }

  // If we tried all models and none worked
  throw new Error(
    `No available Claude models. Last error: ${lastError?.message || 'Unknown error'}. ` +
    `Please check your Anthropic API key at: https://console.anthropic.com/account/keys`
  );
}

// Chat history management
export const ChatHistoryManager = {
  getHistory: (provider: AIProvider): ChatMessage[] => {
    const key = `chat_history_${provider}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  saveMessage: (provider: AIProvider, message: ChatMessage) => {
    const key = `chat_history_${provider}`;
    const history = ChatHistoryManager.getHistory(provider);
    history.push(message);
    localStorage.setItem(key, JSON.stringify(history.slice(-50))); // Keep last 50 messages
  },

  clearHistory: (provider: AIProvider) => {
    const key = `chat_history_${provider}`;
    localStorage.removeItem(key);
  },
};
