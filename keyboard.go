package main

import (
	"encoding/json"
	"strings"
	"time"
)

// Key represents a single key on the keyboard
type Key struct {
	ID               string   `json:"id"`               // e.g., "L00", "R25"
	Label            string   `json:"label"`            // Fallback text if no image
	ImagePath        string   `json:"imagePath"`        // Path to uploaded image file
	ImageData        string   `json:"imageData"`        // Base64 encoded image data
	Description      string   `json:"description"`      // Tooltip/detailed info
	Color            string   `json:"color"`            // Hex color code
	Layer            string   `json:"layer"`            // Layer name
	Modifiers        []string `json:"modifiers"`        // Required modifier keys
	Row              int      `json:"row"`              // Row position (0-3)
	Col              int      `json:"col"`              // Column position (0-5)
	Side             string   `json:"side"`             // "left" or "right"
	KeyType          string   `json:"keyType"`          // "normal", "thumb", "pinky"
	CustomX          float64  `json:"customX"`          // Custom X position (pixels)
	CustomY          float64  `json:"customY"`          // Custom Y position (pixels)
	IsCustomPosition bool     `json:"isCustomPosition"` // Whether using custom positioning
}

// ModifierCombination represents a combination of modifier keys
type ModifierCombination struct {
	Modifiers []string `json:"modifiers"` // e.g., ["ctrl"], ["ctrl", "shift"]
	Name      string   `json:"name"`      // e.g., "Ctrl", "Ctrl+Shift"
}

// KeyboardLayout represents a complete keyboard layout configuration
type KeyboardLayout struct {
	Name        string                          `json:"name"`
	Description string                          `json:"description"`
	Layers      map[string][]Key                `json:"layers"`
	ModifierMaps map[string]map[string][]Key    `json:"modifierMaps"` // layer -> modifier combo -> keys
	CreatedAt   time.Time                       `json:"created_at"`
	ModifiedAt  time.Time                       `json:"modified_at"`
}

// KeyboardConfig holds the current application state
type KeyboardConfig struct {
	CurrentLayout    string               `json:"currentLayout"`
	CurrentLayer     string               `json:"currentLayer"`
	KeyboardType     string               `json:"keyboardType"`     // "corne" or "tenkeyless"
	ActiveModifiers  []string             `json:"activeModifiers"` // e.g., ["ctrl", "shift"]
	Layouts          []KeyboardLayout     `json:"layouts"`
	ColorSchemes     map[string]string    `json:"colorSchemes"`
}

// DefaultTenkeylessLayout creates a tenkeyless (87-key) keyboard layout
func DefaultTenkeylessLayout() KeyboardLayout {
	layout := KeyboardLayout{
		Name:         "Tenkeyless",
		Description:  "Standard 87-key tenkeyless keyboard layout",
		Layers:       make(map[string][]Key),
		ModifierMaps: make(map[string]map[string][]Key),
		CreatedAt:    time.Now(),
		ModifiedAt:   time.Now(),
	}

	// Single base layer for tenkeyless with only one layer - all keys in one array
	baseKeys := []Key{
		// Function row (F1-F12) - Row 0
		{ID: "ESC", Label: "Esc", Row: 0, Col: 0, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F1", Label: "F1", Row: 0, Col: 2, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F2", Label: "F2", Row: 0, Col: 3, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F3", Label: "F3", Row: 0, Col: 4, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F4", Label: "F4", Row: 0, Col: 5, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F5", Label: "F5", Row: 0, Col: 7, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F6", Label: "F6", Row: 0, Col: 8, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F7", Label: "F7", Row: 0, Col: 9, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F8", Label: "F8", Row: 0, Col: 10, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F9", Label: "F9", Row: 0, Col: 12, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F10", Label: "F10", Row: 0, Col: 13, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F11", Label: "F11", Row: 0, Col: 14, Side: "left", KeyType: "function", Color: "#fff9c4"},
		{ID: "F12", Label: "F12", Row: 0, Col: 15, Side: "left", KeyType: "function", Color: "#fff9c4"},

		// Number row - Row 1
		{ID: "GRAVE", Label: "`", Row: 1, Col: 0, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "KEY_1", Label: "1", Row: 1, Col: 1, Side: "left", KeyType: "normal", Color: "#e8f5e8"},
		{ID: "KEY_2", Label: "2", Row: 1, Col: 2, Side: "left", KeyType: "normal", Color: "#e8f5e8"},
		{ID: "KEY_3", Label: "3", Row: 1, Col: 3, Side: "left", KeyType: "normal", Color: "#e8f5e8"},
		{ID: "KEY_4", Label: "4", Row: 1, Col: 4, Side: "left", KeyType: "normal", Color: "#e8f5e8"},
		{ID: "KEY_5", Label: "5", Row: 1, Col: 5, Side: "left", KeyType: "normal", Color: "#e8f5e8"},
		{ID: "KEY_6", Label: "6", Row: 1, Col: 6, Side: "left", KeyType: "normal", Color: "#e8f5e8"},
		{ID: "KEY_7", Label: "7", Row: 1, Col: 7, Side: "left", KeyType: "normal", Color: "#e8f5e8"},
		{ID: "KEY_8", Label: "8", Row: 1, Col: 8, Side: "left", KeyType: "normal", Color: "#e8f5e8"},
		{ID: "KEY_9", Label: "9", Row: 1, Col: 9, Side: "left", KeyType: "normal", Color: "#e8f5e8"},
		{ID: "KEY_0", Label: "0", Row: 1, Col: 10, Side: "left", KeyType: "normal", Color: "#e8f5e8"},
		{ID: "MINUS", Label: "-", Row: 1, Col: 11, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "EQUAL", Label: "=", Row: 1, Col: 12, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "BACKSPACE", Label: "Backspace", Row: 1, Col: 13, Side: "left", KeyType: "modifier", Color: "#ffebee"},

		// Top letter row (QWERTY) - Row 2
		{ID: "TAB", Label: "Tab", Row: 2, Col: 0, Side: "left", KeyType: "modifier", Color: "#ffebee"},
		{ID: "KEY_Q", Label: "Q", Row: 2, Col: 1, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "KEY_W", Label: "W", Row: 2, Col: 2, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "KEY_E", Label: "E", Row: 2, Col: 3, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "KEY_R", Label: "R", Row: 2, Col: 4, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "KEY_T", Label: "T", Row: 2, Col: 5, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "KEY_Y", Label: "Y", Row: 2, Col: 6, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "KEY_U", Label: "U", Row: 2, Col: 7, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "KEY_I", Label: "I", Row: 2, Col: 8, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "KEY_O", Label: "O", Row: 2, Col: 9, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "KEY_P", Label: "P", Row: 2, Col: 10, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "LBRACKET", Label: "[", Row: 2, Col: 11, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "RBRACKET", Label: "]", Row: 2, Col: 12, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "BACKSLASH", Label: "\\", Row: 2, Col: 13, Side: "left", KeyType: "normal", Color: "#f3e5f5"},

		// Home row (ASDF) - Row 3
		{ID: "CAPS", Label: "Caps Lock", Row: 3, Col: 0, Side: "left", KeyType: "modifier", Color: "#ffebee"},
		{ID: "KEY_A", Label: "A", Row: 3, Col: 1, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "KEY_S", Label: "S", Row: 3, Col: 2, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "KEY_D", Label: "D", Row: 3, Col: 3, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "KEY_F", Label: "F", Row: 3, Col: 4, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "KEY_G", Label: "G", Row: 3, Col: 5, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "KEY_H", Label: "H", Row: 3, Col: 6, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "KEY_J", Label: "J", Row: 3, Col: 7, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "KEY_K", Label: "K", Row: 3, Col: 8, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "KEY_L", Label: "L", Row: 3, Col: 9, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "SEMICOLON", Label: ";", Row: 3, Col: 10, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "QUOTE", Label: "'", Row: 3, Col: 11, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "ENTER", Label: "Enter", Row: 3, Col: 12, Side: "left", KeyType: "modifier", Color: "#ffebee"},

		// Bottom row (ZXCV) - Row 4
		{ID: "LSHIFT", Label: "Shift", Row: 4, Col: 0, Side: "left", KeyType: "modifier", Color: "#ffebee"},
		{ID: "KEY_Z", Label: "Z", Row: 4, Col: 1, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "KEY_X", Label: "X", Row: 4, Col: 2, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "KEY_C", Label: "C", Row: 4, Col: 3, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "KEY_V", Label: "V", Row: 4, Col: 4, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "KEY_B", Label: "B", Row: 4, Col: 5, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "KEY_N", Label: "N", Row: 4, Col: 6, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "KEY_M", Label: "M", Row: 4, Col: 7, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "COMMA", Label: ",", Row: 4, Col: 8, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "PERIOD", Label: ".", Row: 4, Col: 9, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "SLASH", Label: "/", Row: 4, Col: 10, Side: "left", KeyType: "normal", Color: "#f3e5f5"},
		{ID: "RSHIFT", Label: "Shift", Row: 4, Col: 11, Side: "left", KeyType: "modifier", Color: "#ffebee"},

		// Bottom modifier row - Row 5
		{ID: "LCTRL", Label: "Ctrl", Row: 5, Col: 0, Side: "left", KeyType: "modifier", Color: "#ffebee"},
		{ID: "LGUI", Label: "Win", Row: 5, Col: 1, Side: "left", KeyType: "modifier", Color: "#ffebee"},
		{ID: "LALT", Label: "Alt", Row: 5, Col: 2, Side: "left", KeyType: "modifier", Color: "#ffebee"},
		{ID: "SPACE", Label: "Space", Row: 5, Col: 3, Side: "left", KeyType: "spacebar", Color: "#e0f2f1"},
		{ID: "RALT", Label: "Alt", Row: 5, Col: 4, Side: "left", KeyType: "modifier", Color: "#ffebee"},
		{ID: "RGUI", Label: "Win", Row: 5, Col: 5, Side: "left", KeyType: "modifier", Color: "#ffebee"},
		{ID: "MENU", Label: "Menu", Row: 5, Col: 6, Side: "left", KeyType: "modifier", Color: "#ffebee"},
		{ID: "RCTRL", Label: "Ctrl", Row: 5, Col: 7, Side: "left", KeyType: "modifier", Color: "#ffebee"},

		// Navigation cluster - positioned separately
		{ID: "INSERT", Label: "Ins", Row: 1, Col: 15, Side: "right", KeyType: "nav", Color: "#e1f5fe"},
		{ID: "HOME", Label: "Home", Row: 1, Col: 16, Side: "right", KeyType: "nav", Color: "#e1f5fe"},
		{ID: "PAGEUP", Label: "PgUp", Row: 1, Col: 17, Side: "right", KeyType: "nav", Color: "#e1f5fe"},
		{ID: "DELETE", Label: "Del", Row: 2, Col: 15, Side: "right", KeyType: "nav", Color: "#e1f5fe"},
		{ID: "END", Label: "End", Row: 2, Col: 16, Side: "right", KeyType: "nav", Color: "#e1f5fe"},
		{ID: "PAGEDOWN", Label: "PgDn", Row: 2, Col: 17, Side: "right", KeyType: "nav", Color: "#e1f5fe"},

		// Arrow keys
		{ID: "UP", Label: "↑", Row: 4, Col: 16, Side: "right", KeyType: "arrow", Color: "#e8eaf6"},
		{ID: "LEFT", Label: "←", Row: 5, Col: 15, Side: "right", KeyType: "arrow", Color: "#e8eaf6"},
		{ID: "DOWN", Label: "↓", Row: 5, Col: 16, Side: "right", KeyType: "arrow", Color: "#e8eaf6"},
		{ID: "RIGHT", Label: "→", Row: 5, Col: 17, Side: "right", KeyType: "arrow", Color: "#e8eaf6"},
	}

	// Set layer names for all keys
	for i := range baseKeys {
		baseKeys[i].Layer = "base"
	}

	// ONLY ONE LAYER - just base
	layout.Layers["base"] = baseKeys

	// Initialize modifier maps - generate modifier combinations for base layer
	layout.ModifierMaps["base"] = make(map[string][]Key)
	
	// Generate all modifier combinations for the base layer (same as Corne)
	modifiers := []string{"ctrl", "shift", "alt", "gui"}
	layout.generateAllModifierCombinations("base", baseKeys, modifiers)

	return layout
}

// DefaultCorneLayout creates a default 42-key Corne keyboard layout
func DefaultCorneLayout() KeyboardLayout {
	layout := KeyboardLayout{
		Name:         "Default Corne",
		Description:  "Standard Corne (CRKBD) 42-key layout",
		Layers:       make(map[string][]Key),
		ModifierMaps: make(map[string]map[string][]Key),
		CreatedAt:    time.Now(),
		ModifiedAt:   time.Now(),
	}

	// Base layer keys - Corne 42-key layout (3 rows + 3 thumb keys per side)
	baseKeys := []Key{
		// Left side - column 0 (leftmost)
		{ID: "L00", Label: "Q", Row: 0, Col: 0, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "L10", Label: "A", Row: 1, Col: 0, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "L20", Label: "Z", Row: 2, Col: 0, Side: "left", KeyType: "normal", Color: "#f3e5f5"},

		// Left side - column 1
		{ID: "L01", Label: "W", Row: 0, Col: 1, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "L11", Label: "S", Row: 1, Col: 1, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "L21", Label: "X", Row: 2, Col: 1, Side: "left", KeyType: "normal", Color: "#f3e5f5"},

		// Left side - column 2
		{ID: "L02", Label: "E", Row: 0, Col: 2, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "L12", Label: "D", Row: 1, Col: 2, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "L22", Label: "C", Row: 2, Col: 2, Side: "left", KeyType: "normal", Color: "#f3e5f5"},

		// Left side - column 3
		{ID: "L03", Label: "R", Row: 0, Col: 3, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "L13", Label: "F", Row: 1, Col: 3, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "L23", Label: "V", Row: 2, Col: 3, Side: "left", KeyType: "normal", Color: "#f3e5f5"},

		// Left side - column 4
		{ID: "L04", Label: "T", Row: 0, Col: 4, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "L14", Label: "G", Row: 1, Col: 4, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "L24", Label: "B", Row: 2, Col: 4, Side: "left", KeyType: "normal", Color: "#f3e5f5"},

		// Left side - column 5 (rightmost on left half)
		{ID: "L05", Label: "Y", Row: 0, Col: 5, Side: "left", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "L15", Label: "H", Row: 1, Col: 5, Side: "left", KeyType: "normal", Color: "#fff3e0"},
		{ID: "L25", Label: "N", Row: 2, Col: 5, Side: "left", KeyType: "normal", Color: "#f3e5f5"},

		// Left side - thumb keys
		{ID: "L30", Label: "GUI", Row: 3, Col: 0, Side: "left", KeyType: "thumb", Color: "#ffebee"},
		{ID: "L31", Label: "LWR", Row: 3, Col: 1, Side: "left", KeyType: "thumb-1_5u", Color: "#ffebee"},
		{ID: "L32", Label: "SPC", Row: 3, Col: 2, Side: "left", KeyType: "thumb", Color: "#ffebee"},

		// Right side - column 0 (leftmost on right half)
		{ID: "R00", Label: "U", Row: 0, Col: 0, Side: "right", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "R10", Label: "J", Row: 1, Col: 0, Side: "right", KeyType: "normal", Color: "#fff3e0"},
		{ID: "R20", Label: "M", Row: 2, Col: 0, Side: "right", KeyType: "normal", Color: "#f3e5f5"},

		// Right side - column 1
		{ID: "R01", Label: "I", Row: 0, Col: 1, Side: "right", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "R11", Label: "K", Row: 1, Col: 1, Side: "right", KeyType: "normal", Color: "#fff3e0"},
		{ID: "R21", Label: ",", Row: 2, Col: 1, Side: "right", KeyType: "normal", Color: "#f3e5f5"},

		// Right side - column 2
		{ID: "R02", Label: "O", Row: 0, Col: 2, Side: "right", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "R12", Label: "L", Row: 1, Col: 2, Side: "right", KeyType: "normal", Color: "#fff3e0"},
		{ID: "R22", Label: ".", Row: 2, Col: 2, Side: "right", KeyType: "normal", Color: "#f3e5f5"},

		// Right side - column 3
		{ID: "R03", Label: "P", Row: 0, Col: 3, Side: "right", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "R13", Label: ";", Row: 1, Col: 3, Side: "right", KeyType: "normal", Color: "#fff3e0"},
		{ID: "R23", Label: "/", Row: 2, Col: 3, Side: "right", KeyType: "normal", Color: "#f3e5f5"},

		// Right side - column 4
		{ID: "R04", Label: "[", Row: 0, Col: 4, Side: "right", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "R14", Label: "'", Row: 1, Col: 4, Side: "right", KeyType: "normal", Color: "#fff3e0"},
		{ID: "R24", Label: "↑", Row: 2, Col: 4, Side: "right", KeyType: "normal", Color: "#f3e5f5"},

		// Right side - column 5 (rightmost)
		{ID: "R05", Label: "]", Row: 0, Col: 5, Side: "right", KeyType: "normal", Color: "#e3f2fd"},
		{ID: "R15", Label: "\\", Row: 1, Col: 5, Side: "right", KeyType: "normal", Color: "#fff3e0"},
		{ID: "R25", Label: "⇧", Row: 2, Col: 5, Side: "right", KeyType: "normal", Color: "#f3e5f5"},

		// Right side - thumb keys
		{ID: "R30", Label: "⏎", Row: 3, Col: 0, Side: "right", KeyType: "thumb", Color: "#ffebee"},
		{ID: "R31", Label: "RSE", Row: 3, Col: 1, Side: "right", KeyType: "thumb-1_5u", Color: "#ffebee"},
		{ID: "R32", Label: "ALT", Row: 3, Col: 2, Side: "right", KeyType: "thumb", Color: "#ffebee"},
	}

	// Lower layer keys (numbers and symbols)
	lowerKeys := make([]Key, len(baseKeys))
	copy(lowerKeys, baseKeys)
	
	// Override specific keys for lower layer
	lowerOverrides := map[string]string{
		"L00": "1", "L01": "2", "L02": "3", "L03": "4", "L04": "5", "L05": "6",
		"R00": "7", "R01": "8", "R02": "9", "R03": "0", "R04": "-", "R05": "=",
		"L10": "!", "L11": "@", "L12": "#", "L13": "$", "L14": "%", "L15": "^",
		"R10": "&", "R11": "*", "R12": "(", "R13": ")", "R14": "_", "R15": "+",
		"R24": "↑", "R21": "←", "R22": "↓", "R23": "→",
	}

	for i, key := range lowerKeys {
		if newLabel, exists := lowerOverrides[key.ID]; exists {
			lowerKeys[i].Label = newLabel
			lowerKeys[i].Color = "#e8f5e8"
		}
		lowerKeys[i].Layer = "lower"
	}

	// Raise layer keys (function keys and navigation)
	raiseKeys := make([]Key, len(baseKeys))
	copy(raiseKeys, baseKeys)
	
	// Override specific keys for raise layer
	raiseOverrides := map[string]string{
		"L00": "F1", "L01": "F2", "L02": "F3", "L03": "F4", "L04": "F5", "L05": "F6",
		"R00": "F7", "R01": "F8", "R02": "F9", "R03": "F10", "R04": "F11", "R05": "F12",
		"L10": "Tab", "L11": "Caps", "L12": "Esc", "L13": "Del", "L14": "Ins", "L15": "Home",
		"R10": "End", "R11": "PgUp", "R12": "PgDn", "R13": "PrSc", "R14": "Scrl", "R15": "Paus",
		"R20": "Vol-", "R21": "Vol+", "R22": "Mute", "R23": "Play", "R24": "↑", "R25": "⇧",
	}

	for i, key := range raiseKeys {
		if newLabel, exists := raiseOverrides[key.ID]; exists {
			raiseKeys[i].Label = newLabel
			raiseKeys[i].Color = "#fff9c4"
		}
		raiseKeys[i].Layer = "raise"
	}

	// Set layer names for base keys
	for i := range baseKeys {
		baseKeys[i].Layer = "base"
	}

	layout.Layers["base"] = baseKeys
	layout.Layers["lower"] = lowerKeys
	layout.Layers["raise"] = raiseKeys

	// Initialize modifier maps for each layer
	layout.ModifierMaps["base"] = make(map[string][]Key)
	layout.ModifierMaps["lower"] = make(map[string][]Key)
	layout.ModifierMaps["raise"] = make(map[string][]Key)

	// Generate all possible modifier combinations (2^4 = 16 combinations)
	modifiers := []string{"ctrl", "shift", "alt", "gui"}
	
	// Generate all combinations for each layer
	layout.generateAllModifierCombinations("base", baseKeys, modifiers)
	layout.generateAllModifierCombinations("lower", lowerKeys, modifiers)
	layout.generateAllModifierCombinations("raise", raiseKeys, modifiers)

	return layout
}

// generateAllModifierCombinations creates all possible modifier combinations for a layer
func (kl *KeyboardLayout) generateAllModifierCombinations(layerName string, baseKeys []Key, modifiers []string) {
	// Generate all possible combinations (2^n combinations)
	numCombos := 1 << len(modifiers) // 2^n
	
	for i := 0; i < numCombos; i++ {
		var activeMods []string
		
		// Determine which modifiers are active for this combination
		for j, mod := range modifiers {
			if i&(1<<j) != 0 {
				activeMods = append(activeMods, mod)
			}
		}
		
		// Skip empty combination (no modifiers)
		if len(activeMods) == 0 {
			continue
		}
		
		// Create the key combination string
		comboKey := strings.Join(activeMods, "+")
		
		// Create keys for this combination
		comboKeys := make([]Key, len(baseKeys))
		copy(comboKeys, baseKeys)
		
		// Apply styling and labels based on the combination
		kl.applyModifierStyling(comboKeys, activeMods, layerName)
		
		// Store the combination
		kl.ModifierMaps[layerName][comboKey] = comboKeys
	}
}

// applyModifierStyling applies appropriate styling and labels based on active modifiers
func (kl *KeyboardLayout) applyModifierStyling(keys []Key, activeMods []string, layerName string) {
	modString := strings.Join(activeMods, "+")
	
	// Define colors for different combinations
	colors := map[string]string{
		"ctrl":           "#ffcdd2",
		"shift":          "#c8e6c9", 
		"alt":            "#fff9c4",
		"gui":            "#b3e5fc",
		"ctrl+shift":     "#e1bee7",
		"ctrl+alt":       "#ffccbc",
		"ctrl+gui":       "#f8bbd9",
		"shift+alt":      "#e8f5e8",
		"shift+gui":      "#e0f2f1",
		"alt+gui":        "#fff3e0",
	}
	
	// Default color for complex combinations
	color := "#e1bee7"
	if c, exists := colors[modString]; exists {
		color = c
	}
	
	// Apply styling to all keys
	for i := range keys {
		keys[i].Color = color
		keys[i].Description = modString + " + " + keys[i].Label
		
		// Apply specific label overrides based on layer and modifiers
		kl.applySpecificOverrides(&keys[i], activeMods, layerName)
	}
}

// applySpecificOverrides applies specific label overrides for certain key combinations
func (kl *KeyboardLayout) applySpecificOverrides(key *Key, activeMods []string, layerName string) {
	modString := strings.Join(activeMods, "+")
	
	// Base layer overrides
	if layerName == "base" {
		switch modString {
		case "ctrl":
			ctrlOverrides := map[string]string{
				"L00": "Ctrl+Q", "L01": "Ctrl+W", "L02": "Ctrl+E", "L03": "Ctrl+R", "L04": "Ctrl+T",
				"L10": "Ctrl+A", "L11": "Ctrl+S", "L12": "Ctrl+D", "L13": "Ctrl+F", "L14": "Ctrl+G",
				"L20": "Ctrl+Z", "L21": "Ctrl+X", "L22": "Ctrl+C", "L23": "Ctrl+V", "L24": "Ctrl+B",
				"R00": "Ctrl+U", "R01": "Ctrl+I", "R02": "Ctrl+O", "R03": "Ctrl+P",
				"R10": "Ctrl+J", "R11": "Ctrl+K", "R12": "Ctrl+L",
				"R20": "Ctrl+M", "R21": "Ctrl+,", "R22": "Ctrl+.", "R23": "Ctrl+/",
			}
			if newLabel, exists := ctrlOverrides[key.ID]; exists {
				key.Label = newLabel
			}
		case "shift":
			shiftOverrides := map[string]string{
				"L00": "Q", "L01": "W", "L02": "E", "L03": "R", "L04": "T", "L05": "Y",
				"R00": "U", "R01": "I", "R02": "O", "R03": "P", "R04": "{", "R05": "}",
				"L10": "A", "L11": "S", "L12": "D", "L13": "F", "L14": "G", "L15": "H",
				"R10": "J", "R11": "K", "R12": "L", "R13": ":", "R14": "\"", "R15": "|",
				"L20": "Z", "L21": "X", "L22": "C", "L23": "V", "L24": "B", "L25": "N",
				"R20": "M", "R21": "<", "R22": ">", "R23": "?", "R24": "↑", "R25": "⇧",
			}
			if newLabel, exists := shiftOverrides[key.ID]; exists {
				key.Label = newLabel
			}
		case "alt":
			altOverrides := map[string]string{
				"L10": "Alt+Tab", "L13": "Alt+F4",
			}
			if newLabel, exists := altOverrides[key.ID]; exists {
				key.Label = newLabel
			}
		case "gui":
			guiOverrides := map[string]string{
				"L01": "Win+W", "L02": "Win+E", "L03": "Win+R", "L13": "Win+L",
			}
			if newLabel, exists := guiOverrides[key.ID]; exists {
				key.Label = newLabel
			}
		}
	} else if layerName == "lower" {
		switch modString {
		case "ctrl":
			ctrlOverrides := map[string]string{
				"L00": "Ctrl+1", "L01": "Ctrl+2", "L02": "Ctrl+3", "L03": "Ctrl+4", "L04": "Ctrl+5", "L05": "Ctrl+6",
				"R00": "Ctrl+7", "R01": "Ctrl+8", "R02": "Ctrl+9", "R03": "Ctrl+0",
				"L20": "Ctrl+Z", "L21": "Ctrl+X", "L22": "Ctrl+C", "L23": "Ctrl+V",
			}
			if newLabel, exists := ctrlOverrides[key.ID]; exists {
				key.Label = newLabel
			}
		}
	} else if layerName == "raise" {
		switch modString {
		case "ctrl":
			ctrlOverrides := map[string]string{
				"L00": "Ctrl+F1", "L01": "Ctrl+F2", "L02": "Ctrl+F3", "L03": "Ctrl+F4", "L04": "Ctrl+F5", "L05": "Ctrl+F6",
				"R00": "Ctrl+F7", "R01": "Ctrl+F8", "R02": "Ctrl+F9", "R03": "Ctrl+F10", "R04": "Ctrl+F11", "R05": "Ctrl+F12",
				"L10": "Ctrl+Tab", "L12": "Ctrl+Esc", "L13": "Ctrl+Del",
			}
			if newLabel, exists := ctrlOverrides[key.ID]; exists {
				key.Label = newLabel
			}
		}
	}
}

// GetKeyByID finds a key by its ID in the current layer
func (kl *KeyboardLayout) GetKeyByID(layer, keyID string) *Key {
	if keys, exists := kl.Layers[layer]; exists {
		for i := range keys {
			if keys[i].ID == keyID {
				return &keys[i]
			}
		}
	}
	return nil
}

// GetModifierKeyByID finds a key by its ID in a specific modifier combination
func (kl *KeyboardLayout) GetModifierKeyByID(layer, modifiers, keyID string) *Key {
	if layerMods, exists := kl.ModifierMaps[layer]; exists {
		if keys, exists := layerMods[modifiers]; exists {
			for i := range keys {
				if keys[i].ID == keyID {
					return &keys[i]
				}
			}
		}
	}
	return nil
}

// GetKeysForModifier returns all keys for a specific modifier combination in a layer
func (kl *KeyboardLayout) GetKeysForModifier(layer, modifiers string) []Key {
	if layerMods, exists := kl.ModifierMaps[layer]; exists {
		if keys, exists := layerMods[modifiers]; exists {
			return keys
		}
	}
	// Return base layer keys if modifier combination doesn't exist
	if keys, exists := kl.Layers[layer]; exists {
		return keys
	}
	return []Key{}
}

// GetKeysForActiveModifiers returns keys based on currently active individual modifiers
func (kl *KeyboardLayout) GetKeysForActiveModifiers(layer string, activeModifiers []string) []Key {
	if len(activeModifiers) == 0 {
		// No modifiers active, return base layer
		if keys, exists := kl.Layers[layer]; exists {
			return keys
		}
		return []Key{}
	}

	// Sort modifiers to ensure consistent key lookup
	sortedMods := make([]string, len(activeModifiers))
	copy(sortedMods, activeModifiers)
	
	// Sort the modifiers in a consistent order: ctrl, shift, alt, gui
	modOrder := map[string]int{"ctrl": 0, "shift": 1, "alt": 2, "gui": 3}
	for i := 0; i < len(sortedMods); i++ {
		for j := i + 1; j < len(sortedMods); j++ {
			if modOrder[sortedMods[i]] > modOrder[sortedMods[j]] {
				sortedMods[i], sortedMods[j] = sortedMods[j], sortedMods[i]
			}
		}
	}
	
	// Create the combination key
	comboKey := strings.Join(sortedMods, "+")
	
	// Look for the exact combination in the modifier maps
	if layerMods, exists := kl.ModifierMaps[layer]; exists {
		if keys, exists := layerMods[comboKey]; exists {
			return keys
		}
	}

	// If exact combination doesn't exist, return base layer with indication
	if baseKeys, exists := kl.Layers[layer]; exists {
		// Create a copy and mark as custom combination
		resultKeys := make([]Key, len(baseKeys))
		copy(resultKeys, baseKeys)
		
		for i := range resultKeys {
			resultKeys[i].Color = "#f0f0f0" // Gray for undefined combinations
			resultKeys[i].Description = comboKey + " (undefined)"
		}
		
		return resultKeys
	}

	return []Key{}
}

// UpdateModifierKey updates a key in a specific modifier combination
func (kl *KeyboardLayout) UpdateModifierKey(layer, modifiers string, updatedKey Key) bool {
	if layerMods, exists := kl.ModifierMaps[layer]; exists {
		if keys, exists := layerMods[modifiers]; exists {
			for i := range keys {
				if keys[i].ID == updatedKey.ID {
					keys[i] = updatedKey
					kl.ModifiedAt = time.Now()
					return true
				}
			}
		}
	}
	return false
}

// UpdateModifierKeyByActiveModifiers updates a key based on active modifiers array
func (kl *KeyboardLayout) UpdateModifierKeyByActiveModifiers(layer string, activeModifiers []string, updatedKey Key) bool {
	if len(activeModifiers) == 0 {
		// No modifiers, update base layer
		return kl.UpdateKey(layer, updatedKey)
	}
	
	// Sort modifiers to ensure consistent key lookup
	sortedMods := make([]string, len(activeModifiers))
	copy(sortedMods, activeModifiers)
	
	// Sort the modifiers in a consistent order: ctrl, shift, alt, gui
	modOrder := map[string]int{"ctrl": 0, "shift": 1, "alt": 2, "gui": 3}
	for i := 0; i < len(sortedMods); i++ {
		for j := i + 1; j < len(sortedMods); j++ {
			if modOrder[sortedMods[i]] > modOrder[sortedMods[j]] {
				sortedMods[i], sortedMods[j] = sortedMods[j], sortedMods[i]
			}
		}
	}
	
	// Create the combination key
	comboKey := strings.Join(sortedMods, "+")
	
	// Check if the modifier combination exists, if not create it
	if layerMods, exists := kl.ModifierMaps[layer]; exists {
		if _, exists := layerMods[comboKey]; !exists {
			// Combination doesn't exist, create it based on base layer
			if baseKeys, exists := kl.Layers[layer]; exists {
				newComboKeys := make([]Key, len(baseKeys))
				copy(newComboKeys, baseKeys)
				
				// Apply modifier styling
				kl.applyModifierStyling(newComboKeys, sortedMods, layer)
				
				// Store the new combination
				layerMods[comboKey] = newComboKeys
			}
		}
		
		// Now update the specific key in the combination
		if keys, exists := layerMods[comboKey]; exists {
			for i := range keys {
				if keys[i].ID == updatedKey.ID {
					keys[i] = updatedKey
					kl.ModifiedAt = time.Now()
					return true
				}
			}
		}
	}
	
	return false
}

// AddCustomLayer adds a new layer to the layout
func (kl *KeyboardLayout) AddCustomLayer(layerName string, baseKeys []Key) {
	kl.Layers[layerName] = baseKeys
	kl.ModifierMaps[layerName] = make(map[string][]Key)
	
	// Generate modifier combinations for both keyboard types
	// Only skip multiple layers for Tenkeyless, but keep modifier support
	modifiers := []string{"ctrl", "shift", "alt", "gui"}
	kl.generateAllModifierCombinations(layerName, baseKeys, modifiers)
	
	kl.ModifiedAt = time.Now()
}

// RemoveCustomLayer removes a layer from the layout
func (kl *KeyboardLayout) RemoveCustomLayer(layerName string) bool {
	// Don't allow removal of base layers
	if layerName == "base" || layerName == "lower" || layerName == "raise" {
		return false
	}
	
	if _, exists := kl.Layers[layerName]; exists {
		delete(kl.Layers, layerName)
		delete(kl.ModifierMaps, layerName)
		kl.ModifiedAt = time.Now()
		return true
	}
	return false
}

// GetAvailableModifiers returns all available modifier combinations
func (kl *KeyboardLayout) GetAvailableModifiers() []string {
	// Both keyboard types support modifiers
	return []string{"ctrl", "shift", "alt", "gui"}
}

// UpdateKey updates a key in the specified layer
func (kl *KeyboardLayout) UpdateKey(layer string, updatedKey Key) bool {
	if keys, exists := kl.Layers[layer]; exists {
		for i := range keys {
			if keys[i].ID == updatedKey.ID {
				keys[i] = updatedKey
				kl.ModifiedAt = time.Now()
				return true
			}
		}
	}
	return false
}

// GetLayerNames returns all available layer names
func (kl *KeyboardLayout) GetLayerNames() []string {
	layers := make([]string, 0, len(kl.Layers))
	for name := range kl.Layers {
		layers = append(layers, name)
	}
	return layers
}

// ToJSON converts the layout to JSON string
func (kl *KeyboardLayout) ToJSON() (string, error) {
	data, err := json.MarshalIndent(kl, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// FromJSON creates a layout from JSON string
func FromJSON(jsonStr string) (*KeyboardLayout, error) {
	var layout KeyboardLayout
	err := json.Unmarshal([]byte(jsonStr), &layout)
	if err != nil {
		return nil, err
	}
	return &layout, nil
}