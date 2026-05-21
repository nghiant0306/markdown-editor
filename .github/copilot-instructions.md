<!-- Workspace-specific custom instructions for Copilot -->

# Markdown Editor - Typora Clone Development Guide

## Project Overview
This is a modern Markdown editor web application built with React and TypeScript, providing a Typora-like experience with:
- Live markdown preview
- Zoom controls (50%-200%)
- File operations (New, Open, Save)
- Syntax highlighting and GFM support
- Math expression rendering with KaTeX

## Development Environment
- **Framework**: React 18 with TypeScript
- **Build Tool**: React Scripts (Create React App)
- **Package Manager**: npm
- **Node Version**: 16+ (recommended 18+)

## Project Structure
```
src/
├── components/
│   ├── MenuBar.tsx       - File operations and header
│   ├── Toolbar.tsx       - Zoom and view controls
│   ├── EditorPanel.tsx   - Markdown input textarea
│   ├── PreviewPanel.tsx  - Live preview rendering
│   └── StatusBar.tsx     - Status information footer
├── App.tsx               - Main application state
└── index.tsx             - React DOM entry point
```

## Key Features to Maintain
1. **Split Pane Design**: Editor on left, preview on right
2. **Zoom Functionality**: Scale content 50%-200%
3. **File Management**: Create, open, save markdown files
4. **Live Preview**: Real-time markdown rendering
5. **Responsive**: Works on desktop and tablets

## Common Tasks

### Adding a New Feature
1. Create component in `src/components/`
2. Import and integrate in `App.tsx` or parent component
3. Add corresponding CSS file with same name
4. Update README.md with new feature documentation

### Modifying Styling
- Component styles are co-located (Component.css alongside Component.tsx)
- Use CSS classes following pattern: `.component-name`
- Color scheme: Primary #667eea, Secondary #764ba2, Accent #ff6b6b

### Dependencies
- `react-markdown`: For markdown rendering
- `marked`: Markdown parser
- `highlight.js`: Code syntax highlighting
- `katex`: Math expression rendering
- `lucide-react`: Icons

## Build and Run Commands
```bash
npm install          # Install dependencies
npm start            # Start development server (http://localhost:3000)
npm run build        # Create production build
npm test             # Run tests
```

## Performance Considerations
- Use React.memo for static components
- Memoize callbacks with useCallback
- Optimize re-renders with proper dependency arrays
- Lazy load code highlighting for better initial load

## Testing
Run tests with: `npm test`
Test files should be co-located with components (Component.test.tsx)

## Browser Support
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS 12+, Android 5+

## Notes for Future Development
- Consider adding dark mode theme
- Implement keyboard shortcuts dialog
- Add export to PDF functionality
- Consider plugin system for custom markdown extensions
- Potentially migrate to Vite for faster builds

---
Last updated: May 18, 2026
