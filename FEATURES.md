# Keyboard Cheatsheet Application Features

A desktop application built with Wails (Go + HTML/CSS/JS) for creating visual keyboard cheatsheets and reference guides.

## Core Features

### 🎹 Keyboard Layout Support
- **Corne (CRKBD) Layout**: Pre-configured 42-key split keyboard layout
- **Split Keyboard Design**: Separate left/right hand visualization
- **Multiple Layers**: Base, Lower, Raise layers with customizable key mappings
- **Custom Layers**: Add/remove user-defined layers beyond the default three

### 🖼️ Visual Customization
- **Image Upload**: Upload images to individual keys (2MB limit, multiple formats)
- **Multiple Image Slots**: Primary image + secondary/tertiary overlay images per key
- **Color Coding**: Customizable background colors for keys and categories
- **Drag & Drop**: File upload via drag-and-drop interface
- **Text Labels**: Fallback text labels when no images are present

### ⌨️ Modifier Key Support
- **Multi-Modifier Combinations**: Ctrl, Shift, Alt, GUI (Windows/Cmd) support
- **Dynamic Key Context**: Keys change based on active modifier combinations
- **Real-time Preview**: See how keys change with different modifier states
- **All Combinations**: Supports all 16 possible modifier combinations

### 🎨 Key Palette System
- **Design Library**: Save and reuse custom key designs
- **Persistent Storage**: Key designs saved locally using localStorage
- **Quick Apply**: One-click application of saved designs to other keys
- **Design Management**: Delete unwanted designs from palette

### 🔧 Interactive Editing
- **Visual Key Editor**: Modal-based editor for detailed key customization
- **Drag-to-Reposition**: Click and drag keys to custom positions
- **Live Preview**: See changes in real-time as you edit
- **Tooltips**: Hover descriptions for better usability

### 📱 User Interface
- **Zoom & Pan**: Scale and navigate large keyboard layouts
- **Mouse Wheel Zoom**: Intuitive zoom controls with mouse wheel
- **Responsive Design**: Clean, modern interface that adapts to content
- **Split View**: Clear separation of left/right keyboard halves

### 💾 Data Management
- **Auto-Save**: Changes automatically saved to local configuration
- **Config Persistence**: Settings stored in `~/.keyboard-cheatsheet/config.json`
- **Error Recovery**: Graceful handling of corrupted or missing config files
- **Default Fallbacks**: Sensible defaults when configuration is unavailable

### 🚀 Performance Features
- **Fast Rendering**: Efficient DOM manipulation for smooth interaction
- **Image Optimization**: Base64 encoding for embedded image storage
- **Memory Management**: Proper cleanup of event listeners and resources
- **Concurrent Operations**: Parallel loading of application data

### 🛠️ Development Features
- **Cross-Platform**: Built with Wails for Windows, macOS, Linux support
- **Modern Stack**: Go backend with vanilla JavaScript frontend
- **Debug Mode**: Built-in debugging tools for troubleshooting
- **Live Development**: Hot reload during development with Wails dev mode

## Technical Architecture

- **Backend**: Go with Wails v2 framework
- **Frontend**: Vanilla HTML/CSS/JavaScript (no heavy frameworks)
- **Styling**: Custom CSS with modern flexbox/grid layouts
- **Data Format**: JSON-based configuration with embedded Base64 images
- **File Structure**: Modular organization with separate Go packages for keyboard logic

## Keyboard Layout Details

- **42-Key Corne Layout**: Industry-standard split ergonomic keyboard
- **Row-Stagger Design**: Natural finger positioning with proper key angles  
- **Thumb Clusters**: Dedicated thumb key areas for frequently used functions
- **Physical Accuracy**: Positions based on actual Corne keyboard dimensions