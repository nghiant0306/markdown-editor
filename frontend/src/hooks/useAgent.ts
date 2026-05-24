import { useCallback, useState } from 'react';

export interface AgentRequest {
  message: string;
  projectPath?: string;
  includeGitContext?: boolean;
}

export interface AgentDiff {
  filePath: string;
  patch: string;
}

export interface AgentResponse {
  response: string;
  diffs: AgentDiff[];
  error?: string;
}

/**
 * Custom hook to interact with AI Agent
 * Works for both Web (HTTP) and Electron (IPC) modes
 */
export const useAgent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Detect if running in Electron
   */
  const isElectron = useCallback(() => {
    return !!(window as any).electron;
  }, []);

  /**
   * Send message to AI agent via HTTP (Web mode)
   */
  const sendViaHttp = useCallback(async (request: AgentRequest): Promise<AgentResponse> => {
    // Use fast endpoint for simple messages
    const isSimpleMessage = /^(hello|hi|hey|thanks|ok|sure|yes|no|bye|what|who|when|why|how|can|will|is|are|do|does)\b/i.test(request.message.trim());

    const endpoint = isSimpleMessage ? 'http://localhost:3001/api/chat-fast' : 'http://localhost:3001/api/chat';

    console.log(`🌐 Fetching ${isSimpleMessage ? 'FAST' : 'FULL'} from ${endpoint}`);
    console.log(`📝 Request:`, request);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      console.log(`📊 Response status:`, response.status);

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          const text = await response.text();
          console.error('Response text:', text);
          throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Response data:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ Fetch error:`, error);
      throw new Error(error.message || 'Failed to get response from AI assistant');
    }
  }, []);

  /**
   * Send message to AI agent via IPC (Electron mode)
   */
  const sendViaIpc = useCallback(
    async (request: AgentRequest): Promise<AgentResponse> => {
      const { ipcRenderer } = (window as any).electron;
      return ipcRenderer.invoke('agent:send', request);
    },
    []
  );

  /**
   * Send message to agent (automatic HTTP/IPC selection)
   */
  const sendMessage = useCallback(async (request: AgentRequest): Promise<AgentResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      if (isElectron()) {
        return await sendViaIpc(request);
      } else {
        return await sendViaHttp(request);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, sendViaHttp, sendViaIpc]);

  /**
   * Apply diffs to files via HTTP (Web mode)
   */
  const applyDiffViaHttp = useCallback(async (diffs: AgentDiff[]): Promise<void> => {
    const response = await fetch('http://localhost:3001/api/apply-diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ diffs }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to apply diffs');
    }
  }, []);

  /**
   * Apply diffs to files via IPC (Electron mode)
   */
  const applyDiffViaIpc = useCallback(async (diffs: AgentDiff[]): Promise<void> => {
    const { ipcRenderer } = (window as any).electron;
    return ipcRenderer.invoke('agent:apply-diff', diffs);
  }, []);

  /**
   * Apply diffs (automatic HTTP/IPC selection)
   */
  const applyDiffs = useCallback(
    async (diffs: AgentDiff[]): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        if (isElectron()) {
          await applyDiffViaIpc(diffs);
        } else {
          await applyDiffViaHttp(diffs);
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to apply diffs';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [isElectron, applyDiffViaHttp, applyDiffViaIpc]
  );

  /**
   * Search project files via HTTP (Web mode)
   */
  const searchViaHttp = useCallback(async (query: string, topK = 10): Promise<any[]> => {
    const response = await fetch('http://localhost:3001/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK }),
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    return data.results;
  }, []);

  /**
   * Search project files via IPC (Electron mode)
   */
  const searchViaIpc = useCallback(async (query: string, topK = 10): Promise<any[]> => {
    const { ipcRenderer } = (window as any).electron;
    return ipcRenderer.invoke('agent:search', { query, topK });
  }, []);

  /**
   * Search project (automatic HTTP/IPC selection)
   */
  const search = useCallback(
    async (query: string, topK = 10): Promise<any[]> => {
      setError(null);

      try {
        if (isElectron()) {
          return await searchViaIpc(query, topK);
        } else {
          return await searchViaHttp(query, topK);
        }
      } catch (err: any) {
        const errorMessage = err.message || 'Search failed';
        setError(errorMessage);
        throw err;
      }
    },
    [isElectron, searchViaHttp, searchViaIpc]
  );

  /**
   * Get project state via HTTP (Web mode)
   */
  const getStateViaHttp = useCallback(async () => {
    const response = await fetch('http://localhost:3001/api/project-state');
    if (!response.ok) {
      throw new Error('Failed to get project state');
    }
    return response.json();
  }, []);

  /**
   * Get project state via IPC (Electron mode)
   */
  const getStateViaIpc = useCallback(async () => {
    const { ipcRenderer } = (window as any).electron;
    return ipcRenderer.invoke('agent:get-state');
  }, []);

  /**
   * Get project state (automatic HTTP/IPC selection)
   */
  const getProjectState = useCallback(async () => {
    try {
      if (isElectron()) {
        return await getStateViaIpc();
      } else {
        return await getStateViaHttp();
      }
    } catch (err: any) {
      console.error('Failed to get project state:', err);
      return null;
    }
  }, [isElectron, getStateViaHttp, getStateViaIpc]);

  return {
    sendMessage,
    applyDiffs,
    search,
    getProjectState,
    isLoading,
    error,
    isElectron: isElectron(),
  };
};

export default useAgent;
