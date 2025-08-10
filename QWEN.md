# --- START OF GRIP PROTOCOL ---
# ~/.gemini/GEMINI.md

# Rule: **GRIP** (Grep-on-Replace-Interrupt Protocol)
# This protocol is a critical safeguard against common `replace` tool failures,
# such as those caused by file state desynchronization or ambiguous matches,
# as documented in gemini-cli issue #1028.

## Goal
To perform code modifications robustly. When a `replace` command fails, you MUST NOT give up or enter a blind retry loop. Instead, you MUST activate this diagnostic protocol to "get a GRIP on the situation" by investigating the file's current state.

## The Protocol

1.  **Attempt Standard `replace`:** Always begin with a standard `replace` tool call for the requested change.

    ```sh
    {{tool "replace" "path/to/file.py" "old_string" "new_string"}}
    ```

2.  **On `replace` Failure -> Activate GRIP:** If the `replace` tool returns an error (e.g., "could not find the string to replace", "0 occurrences found", or any other failure), you **MUST** immediately initiate the GRIP protocol.
    *   **Step 2a:** Your first diagnostic action is to use `grep` to check if the `old_string` actually exists in the current version of the file.

    ```sh
    # THOUGHT: The 'replace' command failed. Activating GRIP.
    # First, I will verify if the old_string is present in the file at all.
    {{tool "grep" "old_string" "path/to/file.py"}}
    ```

3.  **Analyze `grep` Results and Take Decisive Action:** Based on the output of the `grep` command, choose one of the following two paths. Do not deviate.

    *   ### **Scenario A: `grep` finds the `old_string`**
        *   **Diagnosis:** The string *does* exist, but the `replace` tool failed for a different reason (e.g., the string is not unique, it contains special characters, etc.).
        *   **Your Action:**
            1.  Acknowledge that the string was found but `replace` still failed.
            2.  Propose a more robust alternative. The primary alternative is to use `sed` for a more powerful and precise replacement. Explain why `sed` is a better choice for this situation.
            3.  Execute the `sed` command. **Do not re-attempt the failing `replace` command.**

        *   **Example thought process for Scenario A:**
            > *My `replace` command failed, but my `grep` verification confirms 'old_string' is in the file. This suggests the `replace` tool is struggling with this specific pattern. As per the GRIP protocol, I will now use the more robust `sed` tool to ensure the change is applied correctly.*

    *   ### **Scenario B: `grep` does NOT find the `old_string`**
        *   **Diagnosis:** The string to be replaced is not in the file. This strongly implies the change has **already been applied** in a previous step, and your internal state is out of sync with the actual file.
        *   **Your Action:**
            1.  State clearly that the `old_string` was not found.
            2.  Form a hypothesis: "It is likely the change has already been applied."
            3.  **Verify your hypothesis** by using `grep` to search for the `new_string`.
            4.  If the `new_string` is found, confirm that the task is already complete. Conclude your work on this file.
            5.  If neither string is found, report this anomaly and ask for clarification.
            6.  **Under no circumstances should you retry the original `replace` command.** This prevents infinite loops.

        *   **Example thought process for Scenario B:**
            > *My `replace` command failed. My `grep` verification found no occurrences of 'old_string'. This suggests the file may have been already modified. I will now `grep` for the 'new_string' to confirm. ... The `grep` for 'new_string' was successful. This confirms the requested change is already present in the file. No further action is needed.*

# --- END OF GRIP PROTOCOL ---

# Codebase Analysis for kbdshrtct

## Overview

kbdshrtct is a desktop application built with Wails (Go + HTML/CSS/JavaScript) that allows users to create visual keyboard cheatsheets and reference guides. The application supports multiple keyboard layouts, extensive customization options, and modifier key combinations.

## Key Features

### Keyboard Layout Support
- Corne (42-key split keyboard) and Tenkeyless (87-key) layouts
- Multiple layers: Base, Lower, Raise, and custom layers
- Proper physical positioning for ergonomic keyboards

### Visual Customization
- Image uploads for keys (2MB limit)
- Multiple image slots per key (primary + secondary/tertiary overlays)
- Customizable background colors
- Drag-and-drop file uploads
- Text labels as fallbacks

### Modifier Key Support
- Full support for Ctrl, Shift, Alt, GUI modifiers
- All 16 possible modifier combinations
- Dynamic key context based on active modifiers
- Real-time preview of modifier effects

### Key Palette System
- Save and reuse custom key designs
- Persistent storage using localStorage
- One-click application of saved designs
- Design management (delete unwanted designs)

### Interactive Editing
- Modal-based key editor
- Drag-to-reposition keys
- Live preview of changes
- Tooltips for better usability

### Data Management
- Auto-save to local configuration
- Config stored in `~/.keyboard-cheatsheet/config.json`
- Error recovery for corrupted files
- Default fallbacks when config is unavailable

### Profile System
- Multiple profiles for different use cases
- Profile-specific keyboard layouts and customizations
- Visual profile management with icons and colors
- Easy switching between profiles

## Technical Architecture

### Backend (Go)
- **Wails Framework**: Uses Wails v2 for desktop application development
- **Structure**: 
  - `main.go`: Application entry point
  - `app.go`: Main application logic and API methods
  - `keyboard.go`: Keyboard layout definitions and management
  - `profile.go`: Profile management system
- **Data Persistence**: JSON-based configuration with embedded Base64 images
- **Cross-Platform**: Supports Windows, macOS, and Linux

### Frontend (JavaScript/HTML/CSS)
- **Vanilla JavaScript**: No heavy frameworks, pure JavaScript implementation
- **Modern CSS**: Uses flexbox and grid layouts for responsive design
- **Components**:
  - Keyboard visualization with proper positioning
  - Key editor modal with image upload capabilities
  - Layer selector for switching between keyboard layers
  - Modifier panel for managing active modifiers
  - Key palette system for saving and reusing designs
  - Profile management interface
- **Event Handling**: Comprehensive event listeners for user interactions
- **Dynamic Rendering**: Efficient DOM manipulation for smooth performance

### Data Flow
1. Application starts and loads profiles from disk
2. Current profile determines active layout and layer
3. UI renders keyboard based on current state
4. User interactions (clicking keys, changing layers, etc.) trigger API calls
5. Changes are immediately saved to persistent storage
6. UI updates in real-time to reflect changes

### Key Technical Details
- Uses embedded filesystem for frontend assets
- Implements proper error handling and recovery
- Features atomic file operations for configuration saving
- Supports both built-in and custom modifier keys
- Implements drag-and-drop functionality for images
- Uses localStorage for temporary data (palette history, custom colors)
- Implements proper color contrast calculations for accessibility

## File Structure
```
keyboard-cheatsheet/
├── main.go              # Application entry point
├── app.go               # Main application logic
├── keyboard.go          # Keyboard layout definitions
├── profile.go           # Profile management system
├── wails.json           # Wails configuration
├── go.mod               # Go module definition
├── frontend/
│   ├── src/
│   │   ├── main.js      # Frontend JavaScript logic
│   │   ├── app.css      # Application styling
│   │   └── style.css    # Base styling
│   ├── index.html       # Main HTML template
│   └── package.json     # Frontend dependencies
└── build/               # Build output directory
```

## Notable Implementation Details

1. **Modifier System**: Implements a sophisticated modifier system that supports all 16 possible combinations of Ctrl, Shift, Alt, and GUI. Keys can have different appearances based on which modifiers are active.

2. **Layer Management**: Supports multiple keyboard layers (base, lower, raise, custom) that users can switch between. Each layer can have completely different key mappings.

3. **Profile System**: Introduced in v0.3, this allows users to create multiple profiles for different use cases, each with their own keyboard layouts and customizations.

4. **Image Handling**: Supports multiple images per key (primary, secondary overlay, tertiary overlay) with proper Base64 encoding for storage.

5. **Persistent Storage**: Uses JSON files for configuration storage with atomic write operations to prevent corruption.

6. **Dynamic UI**: Implements dynamic scaling, proper keyboard positioning, and real-time updates when changes are made.

7. **Error Recovery**: Includes mechanisms to handle corrupted configuration files by creating backups and reverting to defaults.

This analysis provides a comprehensive overview of the kbdshrtct application's architecture, features, and implementation details.