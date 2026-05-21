# Markdown Editor - Typora Clone

A modern, feature-rich Markdown editor built with React and TypeScript. This application provides a Typora-like experience with live preview, syntax highlighting, and intuitive controls.

## Features

✨ **Core Features:**
- **Live Preview**: Real-time markdown rendering as you type
- **Zoom Controls**: Easily adjust the zoom level (50% - 200%)
- **Syntax Highlighting**: Beautiful code highlighting with highlight.js
- **Math Support**: LaTeX/KaTeX support for mathematical expressions
- **GitHub Flavored Markdown**: Full GFM support including tables, strikethrough, and more

📋 **File Operations:**
- Create new markdown files
- Open and edit existing markdown files
- Save files to your local system
- Auto-save dirty state tracking

🎨 **UI/UX:**
- Split-view editor and preview panes
- Toggle preview on/off
- Status bar showing current file and zoom level
- Menu bar with quick access to common operations
- Responsive design

## Installation

1. Navigate to the project directory:
```bash
cd c:\Work\tools\markdown
```

2. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## Build

Create a production build:
```bash
npm run build
```

## Usage

### Basic Operations
- **New File**: Click "New" in the menu bar or use Ctrl+N
- **Open File**: Click "Open" to select a markdown file
- **Save File**: Click "Save" to download the current file (Ctrl+S)

### Editing
- Type markdown in the left editor pane
- See live preview in the right pane
- Use the toolbar to control zoom and toggle preview

### Zoom
- **Zoom In**: Click the "+" button or use Ctrl+Plus
- **Zoom Out**: Click the "-" button or use Ctrl+Minus
- **Reset Zoom**: Click the reset button to return to 100%

### Preview Toggle
- Click the eye icon to show/hide the preview pane
- Works great for full-width editing when needed

## Markdown Support

This editor supports:
- **Headings**: # through ######
- **Emphasis**: Bold, Italic, Bold+Italic
- **Lists**: Ordered and unordered lists
- **Code**: Inline code and code blocks with syntax highlighting
- **Links**: Markdown links and autolinks
- **Images**: Image embedding
- **Tables**: GFM tables
- **Blockquotes**: Quoted text
- **Horizontal Rules**: ---
- **Math**: LaTeX expressions with KaTeX

## Technologies

- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **React Markdown**: Markdown rendering
- **Highlight.js**: Code syntax highlighting
- **KaTeX**: Mathematical expression rendering
- **Lucide React**: Icon library

## Project Structure

```
src/
├── components/
│   ├── MenuBar.tsx          # Top menu with file operations
│   ├── Toolbar.tsx          # Zoom and preview controls
│   ├── EditorPanel.tsx      # Markdown editor textarea
│   ├── PreviewPanel.tsx     # Live preview pane
│   └── StatusBar.tsx        # Bottom status information
├── App.tsx                  # Main application component
└── index.tsx                # React entry point
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New File |
| Ctrl+O | Open File |
| Ctrl+S | Save File |
| Ctrl++ | Zoom In |
| Ctrl+- | Zoom Out |
| Ctrl+0 | Reset Zoom |

## Future Enhancements

- [ ] Keyboard shortcuts customization
- [ ] Dark mode theme
- [ ] Recently opened files
- [ ] Find and replace
- [ ] Markdown export to PDF/HTML
- [ ] Plugin system for custom renderers
- [ ] Collaborative editing
- [ ] Version history and undo/redo improvements

## License

MIT License - Feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ by Markdown Editor Contributors**
