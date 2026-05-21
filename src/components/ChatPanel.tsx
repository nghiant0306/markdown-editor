import React, { useState, useRef, useEffect } from 'react';
import './ChatPanel.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestion?: string; // Markdown suggestion from AI
}

interface ChatPanelProps {
  editorContent: string;
  filename: string;
  onApplySuggestion: (suggestion: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ editorContent, filename, onApplySuggestion }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '👋 Hi! I\'m your AI markdown assistant. I can help you:\n\n• Improve your markdown formatting\n• Add or rewrite sections\n• Fix spelling and grammar\n• Generate content suggestions\n• Explain markdown syntax\n\nWhat would you like help with?',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateMockSuggestion = (prompt: string): { response: string; suggestion?: string } => {
    const lowerPrompt = prompt.toLowerCase();

    // Mock AI responses with different suggestion types
    if (lowerPrompt.includes('improve') || lowerPrompt.includes('better')) {
      return {
        response: `I've analyzed your markdown file "${filename}". Here are some improvements I suggest:\n\n📝 **Formatting**: I can improve consistency and add more structured formatting.\n🎨 **Structure**: Your content could benefit from better heading organization.\n✨ **Enhancement**: I can add more visual elements like tables or lists.`,
        suggestion: editorContent + '\n\n---\n\n## Improvements Made\n- Enhanced formatting and consistency\n- Improved heading structure\n- Added better visual hierarchy'
      };
    }
    
    if (lowerPrompt.includes('spelling') || lowerPrompt.includes('grammar')) {
      return {
        response: `I'll review your markdown for spelling and grammar issues in "${filename}".\n\n✅ **Overall**: Your text looks well-written!\n💡 **Suggestions**: I found a few minor improvements in grammar and phrasing that I can apply.`,
        suggestion: editorContent.replace(/cant/gi, "can't").replace(/doesnt/gi, "doesn't")
      };
    }

    if (lowerPrompt.includes('title') || lowerPrompt.includes('heading')) {
      return {
        response: `Great! Let me help you improve the title and headings in "${filename}".\n\n📌 I'll:\n• Add a compelling main title\n• Restructure headings for better flow\n• Add descriptive subheadings\n• Improve visual hierarchy`,
        suggestion: `# ${filename.replace('.md', '').toUpperCase() || 'My Project'}\n\n## Overview\n${editorContent}\n\n## Next Steps\n- Review the content\n- Customize as needed`
      };
    }

    if (lowerPrompt.includes('add') || lowerPrompt.includes('content') || lowerPrompt.includes('section')) {
      return {
        response: `I can add new sections to your markdown! For "${filename}", I suggest adding:\n\n📚 **Table of Contents** - For better navigation\n📋 **Summary** - Quick overview of content\n🔗 **References** - Links and sources\n⚡ **Quick Start** - Getting started guide`,
        suggestion: `# ${filename.replace('.md', '').toUpperCase() || 'My Project'}\n\n## Table of Contents\n1. Introduction\n2. Main Content\n3. Conclusion\n4. Resources\n\n---\n\n${editorContent}\n\n---\n\n## Resources\n- [Markdown Guide](https://www.markdownguide.org/)\n- [GitHub Flavored Markdown](https://github.github.com/gfm/)`
      };
    }

    if (lowerPrompt.includes('table') || lowerPrompt.includes('list')) {
      return {
        response: `Excellent! I can convert your content into structured tables or lists.\n\n📊 **Tables**: Great for comparing data\n📝 **Lists**: Perfect for steps or items\n✅ **Task Lists**: For checklists and todos\n\nLet me reorganize the content to use better formatting.`,
        suggestion: `# ${filename.replace('.md', '').toUpperCase() || 'My Project'}\n\n## Structured Content\n\n| Feature | Status | Notes |\n|---------|--------|-------|\n| Item 1  | Active | Description |\n| Item 2  | Active | Description |\n| Item 3  | Planned | Coming soon |\n\n### Key Points\n- First important point\n- Second important point\n- Third important point\n\n### Checklist\n- [ ] Task one\n- [ ] Task two\n- [ ] Task three\n\n---\n\n${editorContent}`
      };
    }

    // Default response
    return {
      response: `I'm ready to help with your markdown file "${filename}"! 📝\n\nTry asking me to:\n• Improve formatting\n• Fix grammar and spelling\n• Add sections or content\n• Create tables or lists\n• Rewrite portions\n• Add code examples\n\nJust describe what you'd like me to help with!`,
      suggestion: undefined
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response delay
    setTimeout(() => {
      const { response, suggestion } = generateMockSuggestion(inputValue);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        suggestion,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 800);
  };

  const handleApplySuggestion = (suggestion: string | undefined) => {
    if (suggestion) {
      onApplySuggestion(suggestion);
      // Show confirmation
      const confirmMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: '✅ Suggestion applied to your editor! You can edit further or accept these changes.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>🤖 AI Assistant</h3>
        <span className="chat-subtitle">Copilot for Markdown</span>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`chat-message ${message.role}`}>
            <div className="message-content">
              {message.content}
            </div>
            {message.suggestion && (
              <button
                className="apply-suggestion-btn"
                onClick={() => handleApplySuggestion(message.suggestion)}
                title="Apply this suggestion to your editor"
              >
                ✨ Apply Suggestion
              </button>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="chat-message assistant loading">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask for help with your markdown... (Shift+Enter for new line)"
            className="chat-input"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="send-btn"
            title="Send message (Enter)"
          >
            📤 Send
          </button>
        </div>
        <div className="chat-hints">
          <small>💡 Try: "improve formatting", "add table", "fix grammar", "add content"</small>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
