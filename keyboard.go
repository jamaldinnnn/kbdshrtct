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
		{ID: "ESC", Label: "", Row: 0, Col: 0, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F1", Label: "", Row: 0, Col: 2, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F2", Label: "", Row: 0, Col: 3, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F3", Label: "", Row: 0, Col: 4, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F4", Label: "", Row: 0, Col: 5, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F5", Label: "", Row: 0, Col: 7, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F6", Label: "", Row: 0, Col: 8, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F7", Label: "", Row: 0, Col: 9, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F8", Label: "", Row: 0, Col: 10, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F9", Label: "", Row: 0, Col: 12, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F10", Label: "", Row: 0, Col: 13, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F11", Label: "", Row: 0, Col: 14, Side: "left", KeyType: "function", Color: "#e0e0e0"},
		{ID: "F12", Label: "", Row: 0, Col: 15, Side: "left", KeyType: "function", Color: "#e0e0e0"},

		// Number row - Row 1
		{ID: "GRAVE", Label: "", Row: 1, Col: 0, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_1", Label: "", Row: 1, Col: 1, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_2", Label: "", Row: 1, Col: 2, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_3", Label: "", Row: 1, Col: 3, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_4", Label: "", Row: 1, Col: 4, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_5", Label: "", Row: 1, Col: 5, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_6", Label: "", Row: 1, Col: 6, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_7", Label: "", Row: 1, Col: 7, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_8", Label: "", Row: 1, Col: 8, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_9", Label: "", Row: 1, Col: 9, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_0", Label: "", Row: 1, Col: 10, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "MINUS", Label: "", Row: 1, Col: 11, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "EQUAL", Label: "", Row: 1, Col: 12, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "BACKSPACE", Label: "", Row: 1, Col: 13, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},

		// Top letter row (QWERTY) - Row 2
		{ID: "TAB", Label: "", Row: 2, Col: 0, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},
		{ID: "KEY_Q", Label: "", Row: 2, Col: 1, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_W", Label: "", Row: 2, Col: 2, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_E", Label: "", Row: 2, Col: 3, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_R", Label: "", Row: 2, Col: 4, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_T", Label: "", Row: 2, Col: 5, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_Y", Label: "", Row: 2, Col: 6, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_U", Label: "", Row: 2, Col: 7, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_I", Label: "", Row: 2, Col: 8, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_O", Label: "", Row: 2, Col: 9, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_P", Label: "", Row: 2, Col: 10, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "LBRACKET", Label: "", Row: 2, Col: 11, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "RBRACKET", Label: "", Row: 2, Col: 12, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "BACKSLASH", Label: "", Row: 2, Col: 13, Side: "left", KeyType: "normal", Color: "#e0e0e0"},

		// Home row (ASDF) - Row 3
		{ID: "CAPS", Label: "", Row: 3, Col: 0, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},
		{ID: "KEY_A", Label: "", Row: 3, Col: 1, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_S", Label: "", Row: 3, Col: 2, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_D", Label: "", Row: 3, Col: 3, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_F", Label: "", Row: 3, Col: 4, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_G", Label: "", Row: 3, Col: 5, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_H", Label: "", Row: 3, Col: 6, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_J", Label: "", Row: 3, Col: 7, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_K", Label: "", Row: 3, Col: 8, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_L", Label: "", Row: 3, Col: 9, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "SEMICOLON", Label: "", Row: 3, Col: 10, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "QUOTE", Label: "", Row: 3, Col: 11, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "ENTER", Label: "", Row: 3, Col: 12, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},

		// Bottom row (ZXCV) - Row 4
		{ID: "LSHIFT", Label: "", Row: 4, Col: 0, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},
		{ID: "KEY_Z", Label: "", Row: 4, Col: 1, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_X", Label: "", Row: 4, Col: 2, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_C", Label: "", Row: 4, Col: 3, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_V", Label: "", Row: 4, Col: 4, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_B", Label: "", Row: 4, Col: 5, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_N", Label: "", Row: 4, Col: 6, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "KEY_M", Label: "", Row: 4, Col: 7, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "COMMA", Label: "", Row: 4, Col: 8, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "PERIOD", Label: "", Row: 4, Col: 9, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "SLASH", Label: "", Row: 4, Col: 10, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "RSHIFT", Label: "", Row: 4, Col: 11, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},

		// Bottom modifier row - Row 5
		{ID: "LCTRL", Label: "", Row: 5, Col: 0, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},
		{ID: "LGUI", Label: "", Row: 5, Col: 1, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},
		{ID: "LALT", Label: "", Row: 5, Col: 2, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},
		{ID: "SPACE", Label: "", Row: 5, Col: 3, Side: "left", KeyType: "spacebar", Color: "#e0e0e0"},
		{ID: "RALT", Label: "", Row: 5, Col: 4, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},
		{ID: "RGUI", Label: "", Row: 5, Col: 5, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},
		{ID: "MENU", Label: "", Row: 5, Col: 6, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},
		{ID: "RCTRL", Label: "", Row: 5, Col: 7, Side: "left", KeyType: "modifier", Color: "#e0e0e0"},

		// Navigation cluster - positioned separately
		{ID: "INSERT", Label: "", Row: 1, Col: 15, Side: "right", KeyType: "nav", Color: "#e0e0e0"},
		{ID: "HOME", Label: "", Row: 1, Col: 16, Side: "right", KeyType: "nav", Color: "#e0e0e0"},
		{ID: "PAGEUP", Label: "", Row: 1, Col: 17, Side: "right", KeyType: "nav", Color: "#e0e0e0"},
		{ID: "DELETE", Label: "", Row: 2, Col: 15, Side: "right", KeyType: "nav", Color: "#e0e0e0"},
		{ID: "END", Label: "", Row: 2, Col: 16, Side: "right", KeyType: "nav", Color: "#e0e0e0"},
		{ID: "PAGEDOWN", Label: "", Row: 2, Col: 17, Side: "right", KeyType: "nav", Color: "#e0e0e0"},

		// Arrow keys
		{ID: "UP", Label: "", Row: 4, Col: 16, Side: "right", KeyType: "arrow", Color: "#e0e0e0"},
		{ID: "LEFT", Label: "", Row: 5, Col: 15, Side: "right", KeyType: "arrow", Color: "#e0e0e0"},
		{ID: "DOWN", Label: "", Row: 5, Col: 16, Side: "right", KeyType: "arrow", Color: "#e0e0e0"},
		{ID: "RIGHT", Label: "", Row: 5, Col: 17, Side: "right", KeyType: "arrow", Color: "#e0e0e0"},
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
		{ID: "L00", Label: "", Row: 0, Col: 0, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L10", Label: "", Row: 1, Col: 0, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L20", Label: "", Row: 2, Col: 0, Side: "left", KeyType: "normal", Color: "#e0e0e0"},

		// Left side - column 1
		{ID: "L01", Label: "", Row: 0, Col: 1, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L11", Label: "", Row: 1, Col: 1, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L21", Label: "", Row: 2, Col: 1, Side: "left", KeyType: "normal", Color: "#e0e0e0"},

		// Left side - column 2
		{ID: "L02", Label: "", Row: 0, Col: 2, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L12", Label: "", Row: 1, Col: 2, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L22", Label: "", Row: 2, Col: 2, Side: "left", KeyType: "normal", Color: "#e0e0e0"},

		// Left side - column 3
		{ID: "L03", Label: "", Row: 0, Col: 3, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L13", Label: "", Row: 1, Col: 3, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L23", Label: "", Row: 2, Col: 3, Side: "left", KeyType: "normal", Color: "#e0e0e0"},

		// Left side - column 4
		{ID: "L04", Label: "", Row: 0, Col: 4, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L14", Label: "", Row: 1, Col: 4, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L24", Label: "", Row: 2, Col: 4, Side: "left", KeyType: "normal", Color: "#e0e0e0"},

		// Left side - column 5 (rightmost on left half)
		{ID: "L05", Label: "", Row: 0, Col: 5, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L15", Label: "", Row: 1, Col: 5, Side: "left", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "L25", Label: "", Row: 2, Col: 5, Side: "left", KeyType: "normal", Color: "#e0e0e0"},

		// Left side - thumb keys
		{ID: "L30", Label: "", Row: 3, Col: 0, Side: "left", KeyType: "thumb", Color: "#e0e0e0"},
		{ID: "L31", Label: "", Row: 3, Col: 1, Side: "left", KeyType: "thumb-1_5u", Color: "#e0e0e0"},
		{ID: "L32", Label: "", Row: 3, Col: 2, Side: "left", KeyType: "thumb", Color: "#e0e0e0"},

		// Right side - column 0 (leftmost on right half)
		{ID: "R00", Label: "", Row: 0, Col: 0, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R10", Label: "", Row: 1, Col: 0, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R20", Label: "", Row: 2, Col: 0, Side: "right", KeyType: "normal", Color: "#e0e0e0"},

		// Right side - column 1
		{ID: "R01", Label: "", Row: 0, Col: 1, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R11", Label: "", Row: 1, Col: 1, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R21", Label: "", Row: 2, Col: 1, Side: "right", KeyType: "normal", Color: "#e0e0e0"},

		// Right side - column 2
		{ID: "R02", Label: "", Row: 0, Col: 2, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R12", Label: "", Row: 1, Col: 2, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R22", Label: "", Row: 2, Col: 2, Side: "right", KeyType: "normal", Color: "#e0e0e0"},

		// Right side - column 3
		{ID: "R03", Label: "", Row: 0, Col: 3, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R13", Label: "", Row: 1, Col: 3, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R23", Label: "", Row: 2, Col: 3, Side: "right", KeyType: "normal", Color: "#e0e0e0"},

		// Right side - column 4
		{ID: "R04", Label: "", Row: 0, Col: 4, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R14", Label: "", Row: 1, Col: 4, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R24", Label: "", Row: 2, Col: 4, Side: "right", KeyType: "normal", Color: "#e0e0e0"},

		// Right side - column 5 (rightmost)
		{ID: "R05", Label: "", Row: 0, Col: 5, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R15", Label: "", Row: 1, Col: 5, Side: "right", KeyType: "normal", Color: "#e0e0e0"},
		{ID: "R25", Label: "", Row: 2, Col: 5, Side: "right", KeyType: "normal", Color: "#e0e0e0"},

		// Right side - thumb keys
		{ID: "R30", Label: "", Row: 3, Col: 0, Side: "right", KeyType: "thumb", Color: "#e0e0e0"},
		{ID: "R31", Label: "", Row: 3, Col: 1, Side: "right", KeyType: "thumb-1_5u", Color: "#e0e0e0"},
		{ID: "R32", Label: "", Row: 3, Col: 2, Side: "right", KeyType: "thumb", Color: "#e0e0e0"},
	}

	// Lower layer keys - start blank like base layer
	lowerKeys := make([]Key, len(baseKeys))
	copy(lowerKeys, baseKeys)
	
	// No default overrides - keep keys blank for user customization
	// Users can add their own labels and images through the UI
	
	for i := range lowerKeys {
		lowerKeys[i].Layer = "lower"
	}

	// Raise layer keys - start blank like base layer  
	raiseKeys := make([]Key, len(baseKeys))
	copy(raiseKeys, baseKeys)
	
	// No default overrides - keep keys blank for user customization
	// Users can add their own labels and images through the UI
	
	for i := range raiseKeys {
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
		
		// Create keys for this combination - start with blank keys
		comboKeys := make([]Key, len(baseKeys))
		
		// Create blank keys based on base structure but without copying content
		for j, baseKey := range baseKeys {
			comboKeys[j] = Key{
				ID:               baseKey.ID,
				Label:            "", // Start with blank label
				ImagePath:        "", // No image path
				ImageData:        "", // No image data
				Description:      "", // No description
				Color:            "#e0e0e0", // Light grey for blank keys
				Layer:            baseKey.Layer,
				Modifiers:        activeMods, // Set the active modifiers
				Row:              baseKey.Row,
				Col:              baseKey.Col,
				Side:             baseKey.Side,
				KeyType:          baseKey.KeyType,
				CustomX:          baseKey.CustomX,
				CustomY:          baseKey.CustomY,
				IsCustomPosition: baseKey.IsCustomPosition,
			}
		}
		
		// Store the combination
		kl.ModifierMaps[layerName][comboKey] = comboKeys
	}
}

// applyModifierStyling applies appropriate styling and labels based on active modifiers
func (kl *KeyboardLayout) applyModifierStyling(keys []Key, activeMods []string, layerName string) {
	// Don't apply any default styling - keep keys blank with light grey color
	// Users can add their own content through the UI
	
	// Apply light grey color to all keys in modifier combinations
	for i := range keys {
		// Only change color if the key doesn't have custom content
		if keys[i].Label == "" && (keys[i].ImageData == "" || !strings.HasPrefix(keys[i].ImageData, "data:image/")) {
			keys[i].Color = "#e0e0e0" // Light grey for blank keys
		}
		
		// Don't apply any default labels or descriptions
		// Let users add their own content through the UI
	}
}

// applySpecificOverrides is no longer used - modifier keys stay blank by default
func (kl *KeyboardLayout) applySpecificOverrides(key *Key, activeMods []string, layerName string) {
	// No longer apply any default overrides - let users customize through UI
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
	
	// Sort the modifiers in a consistent order: ctrl, shift, alt, gui, then custom modifiers alphabetically
	modOrder := map[string]int{"ctrl": 0, "shift": 1, "alt": 2, "gui": 3}
	for i := 0; i < len(sortedMods); i++ {
		for j := i + 1; j < len(sortedMods); j++ {
			orderI, existsI := modOrder[sortedMods[i]]
			orderJ, existsJ := modOrder[sortedMods[j]]
			
			// If both are built-in modifiers, sort by order
			if existsI && existsJ {
				if orderI > orderJ {
					sortedMods[i], sortedMods[j] = sortedMods[j], sortedMods[i]
				}
			} else if existsI && !existsJ {
				// Built-in comes before custom
				continue
			} else if !existsI && existsJ {
				// Custom comes after built-in
				sortedMods[i], sortedMods[j] = sortedMods[j], sortedMods[i]
			} else {
				// Both are custom, sort alphabetically
				if sortedMods[i] > sortedMods[j] {
					sortedMods[i], sortedMods[j] = sortedMods[j], sortedMods[i]
				}
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
		
		// If exact combination doesn't exist, create it with blank layout
		if baseKeys, exists := kl.Layers[layer]; exists {
			newComboKeys := make([]Key, len(baseKeys))
			
			// Create blank keys based on base structure but without copying content
			for i, baseKey := range baseKeys {
				newComboKeys[i] = Key{
					ID:               baseKey.ID,
					Label:            "", // Start with blank label
					ImagePath:        "", // No image path
					ImageData:        "", // No image data  
					Description:      "", // No description
					Color:            "#e0e0e0", // Light grey for blank keys
					Layer:            baseKey.Layer,
					Modifiers:        sortedMods, // Set the active modifiers
					Row:              baseKey.Row,
					Col:              baseKey.Col,
					Side:             baseKey.Side,
					KeyType:          baseKey.KeyType,
					CustomX:          baseKey.CustomX,
					CustomY:          baseKey.CustomY,
					IsCustomPosition: baseKey.IsCustomPosition,
				}
			}
			
			// Store the new blank combination
			layerMods[comboKey] = newComboKeys
			kl.ModifiedAt = time.Now()
			
			return newComboKeys
		}
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
	
	// Sort the modifiers in a consistent order: ctrl, shift, alt, gui, then custom modifiers alphabetically
	modOrder := map[string]int{"ctrl": 0, "shift": 1, "alt": 2, "gui": 3}
	for i := 0; i < len(sortedMods); i++ {
		for j := i + 1; j < len(sortedMods); j++ {
			orderI, existsI := modOrder[sortedMods[i]]
			orderJ, existsJ := modOrder[sortedMods[j]]
			
			// If both are built-in modifiers, sort by order
			if existsI && existsJ {
				if orderI > orderJ {
					sortedMods[i], sortedMods[j] = sortedMods[j], sortedMods[i]
				}
			} else if existsI && !existsJ {
				// Built-in comes before custom
				continue
			} else if !existsI && existsJ {
				// Custom comes after built-in
				sortedMods[i], sortedMods[j] = sortedMods[j], sortedMods[i]
			} else {
				// Both are custom, sort alphabetically
				if sortedMods[i] > sortedMods[j] {
					sortedMods[i], sortedMods[j] = sortedMods[j], sortedMods[i]
				}
			}
		}
	}
	
	// Create the combination key
	comboKey := strings.Join(sortedMods, "+")
	
	// Check if the modifier combination exists, if not create it
	if layerMods, exists := kl.ModifierMaps[layer]; exists {
		if _, exists := layerMods[comboKey]; !exists {
			// Combination doesn't exist, create it based on base layer structure but with blank content
			if baseKeys, exists := kl.Layers[layer]; exists {
				newComboKeys := make([]Key, len(baseKeys))
				
				// Create blank keys based on base structure but without copying content
				for i, baseKey := range baseKeys {
					newComboKeys[i] = Key{
						ID:               baseKey.ID,
						Label:            "", // Start with blank label
						ImagePath:        "", // No image path
						ImageData:        "", // No image data  
						Description:      "", // No description
						Color:            "#e0e0e0", // Light grey for blank keys
						Layer:            baseKey.Layer,
						Modifiers:        sortedMods, // Set the active modifiers
						Row:              baseKey.Row,
						Col:              baseKey.Col,
						Side:             baseKey.Side,
						KeyType:          baseKey.KeyType,
						CustomX:          baseKey.CustomX,
						CustomY:          baseKey.CustomY,
						IsCustomPosition: baseKey.IsCustomPosition,
					}
				}
				
				// Store the new blank combination
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