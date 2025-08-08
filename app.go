package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// App struct
type App struct {
	ctx    context.Context
	config KeyboardConfig
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := &App{}
	
	// Always create fresh default layouts to ensure they have the right data
	defaultCorneLayout := DefaultCorneLayout()
	defaultTenkeylessLayout := DefaultTenkeylessLayout()
	
	// Try to load existing config
	if err := app.LoadConfig(); err != nil {
		// If loading fails, use default config
		fmt.Printf("Warning: Failed to load config, using defaults: %v\n", err)
		
		app.config = KeyboardConfig{
			CurrentLayout:   "Default Corne",
			CurrentLayer:    "base",
			KeyboardType:    "corne", // Default to Corne
			ActiveModifiers: []string{},
			Layouts:         []KeyboardLayout{defaultCorneLayout, defaultTenkeylessLayout},
			ColorSchemes: map[string]string{
				"letters": "#e3f2fd",
				"numbers": "#e8f5e8",
				"symbols": "#fff3e0",
				"function": "#fff9c4",
				"modifiers": "#ffebee",
				"navigation": "#f3e5f5",
			},
		}
	} else {
		// Config loaded successfully - merge user changes with fresh default layouts
		
		// Keep the user's customized layouts but ensure we have fresh base structures
		var mergedLayouts []KeyboardLayout
		
		// Find user's customized layouts
		userLayouts := make(map[string]KeyboardLayout)
		for _, layout := range app.config.Layouts {
			userLayouts[layout.Name] = layout
		}
		
		// If user has customized Default Corne, keep it, otherwise use fresh default
		if userLayout, exists := userLayouts["Default Corne"]; exists {
			mergedLayouts = append(mergedLayouts, userLayout)
		} else {
			mergedLayouts = append(mergedLayouts, defaultCorneLayout)
		}
		
		// If user has customized Tenkeyless, keep it, otherwise use fresh default
		if userLayout, exists := userLayouts["Tenkeyless"]; exists {
			mergedLayouts = append(mergedLayouts, userLayout)
		} else {
			mergedLayouts = append(mergedLayouts, defaultTenkeylessLayout)
		}
		
		// Add any additional custom layouts the user created
		for name, layout := range userLayouts {
			if name != "Default Corne" && name != "Tenkeyless" {
				mergedLayouts = append(mergedLayouts, layout)
			}
		}
		
		app.config.Layouts = mergedLayouts
		
		fmt.Printf("Loaded and merged config - %d layouts preserved\n", len(app.config.Layouts))
	}
	
	// Ensure KeyboardType is set for existing configs
	if app.config.KeyboardType == "" {
		if strings.Contains(strings.ToLower(app.config.CurrentLayout), "tenkeyless") {
			app.config.KeyboardType = "tenkeyless"
		} else {
			app.config.KeyboardType = "corne"
		}
	}
	
	// Force save to ensure the layouts are persisted correctly
	if err := app.SaveConfig(); err != nil {
		fmt.Printf("Warning: Failed to save initial config: %v\n", err)
	}
	
	return app
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetCurrentLayout returns the current keyboard layout
func (a *App) GetCurrentLayout() (string, error) {
	if len(a.config.Layouts) == 0 {
		return "", fmt.Errorf("no layouts available")
	}
	
	for _, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			return layout.ToJSON()
		}
	}
	
	// Return first layout if current not found
	return a.config.Layouts[0].ToJSON()
}

// GetCurrentLayer returns the keys for the current layer and active modifiers
func (a *App) GetCurrentLayer() (string, error) {
	if len(a.config.Layouts) == 0 {
		return "", fmt.Errorf("no layouts available")
	}
	
	var currentLayout *KeyboardLayout
	for i, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			currentLayout = &a.config.Layouts[i]
			break
		}
	}
	
	if currentLayout == nil {
		currentLayout = &a.config.Layouts[0]
	}
	
	// Get keys based on active modifiers
	keys := currentLayout.GetKeysForActiveModifiers(a.config.CurrentLayer, a.config.ActiveModifiers)
	
	if len(keys) == 0 {
		return "", fmt.Errorf("no keys found for layer %s", a.config.CurrentLayer)
	}
	
	data, err := json.MarshalIndent(keys, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// SetCurrentLayer changes the active layer
func (a *App) SetCurrentLayer(layerName string) error {
	if len(a.config.Layouts) == 0 {
		return fmt.Errorf("no layouts available")
	}
	
	var currentLayout *KeyboardLayout
	for i, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			currentLayout = &a.config.Layouts[i]
			break
		}
	}
	
	if currentLayout == nil {
		currentLayout = &a.config.Layouts[0]
	}
	
	if _, exists := currentLayout.Layers[layerName]; exists {
		a.config.CurrentLayer = layerName
		// Save config after layer change
		return a.SaveConfig()
	}
	
	return fmt.Errorf("layer %s does not exist", layerName)
}

// GetAvailableLayers returns all available layer names
func (a *App) GetAvailableLayers() (string, error) {
	if len(a.config.Layouts) == 0 {
		return "", fmt.Errorf("no layouts available")
	}
	
	var currentLayout *KeyboardLayout
	for i, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			currentLayout = &a.config.Layouts[i]
			break
		}
	}
	
	if currentLayout == nil {
		currentLayout = &a.config.Layouts[0]
	}
	
	layers := currentLayout.GetLayerNames()
	data, err := json.MarshalIndent(layers, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// UpdateKey updates a specific key in the current layer
func (a *App) UpdateKey(keyData string) error {
	var key Key
	if err := json.Unmarshal([]byte(keyData), &key); err != nil {
		return fmt.Errorf("invalid key data: %v", err)
	}
	
	if len(a.config.Layouts) == 0 {
		return fmt.Errorf("no layouts available")
	}
	
	for i, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			if layout.UpdateKey(a.config.CurrentLayer, key) {
				a.config.Layouts[i] = layout
				// Force immediate save
				return a.SaveConfig()
			}
			break
		}
	}
	
	return fmt.Errorf("failed to update key %s", key.ID)
}

// SetActiveModifiers sets the currently active modifier keys
func (a *App) SetActiveModifiers(modifiersJSON string) error {
	var modifiers []string
	if err := json.Unmarshal([]byte(modifiersJSON), &modifiers); err != nil {
		return fmt.Errorf("invalid modifiers data: %v", err)
	}
	
	a.config.ActiveModifiers = modifiers
	// Save config after modifier change
	return a.SaveConfig()
}

// GetActiveModifiers returns the currently active modifier keys
func (a *App) GetActiveModifiers() (string, error) {
	data, err := json.MarshalIndent(a.config.ActiveModifiers, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// GetAvailableModifiers returns all available individual modifiers
func (a *App) GetAvailableModifiers() (string, error) {
	modifiers := []string{"ctrl", "shift", "alt", "gui"}
	data, err := json.MarshalIndent(modifiers, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// AddCustomLayer adds a new custom layer
func (a *App) AddCustomLayer(layerName string) error {
	if layerName == "" {
		return fmt.Errorf("layer name cannot be empty")
	}
	
	if len(a.config.Layouts) == 0 {
		return fmt.Errorf("no layouts available")
	}
	
	for i, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			// Check if layer already exists
			if _, exists := layout.Layers[layerName]; exists {
				return fmt.Errorf("layer %s already exists", layerName)
			}
			
			// Create clean default keys for the new layer (not copy from base)
			// Get the original default layout structure
			defaultLayout := DefaultCorneLayout()
			
			// Use the base layer from default layout as template
			var defaultBaseKeys []Key
			if baseKeys, exists := defaultLayout.Layers["base"]; exists {
				defaultBaseKeys = baseKeys
			} else {
				return fmt.Errorf("default base layer not found")
			}
			
			// Ensure we have all the expected keys (should be 42 for Corne)
			fmt.Printf("Creating new layer '%s' with %d keys from default layout\n", layerName, len(defaultBaseKeys))
			
			// Debug: List all the key IDs we're about to create
			fmt.Printf("Default keys being used: ")
			for _, key := range defaultBaseKeys {
				fmt.Printf("%s ", key.ID)
			}
			fmt.Printf("\n")
			
			// Create new keys with clean defaults but update layer name
			newKeys := make([]Key, len(defaultBaseKeys))
			for j, defaultKey := range defaultBaseKeys {
				newKeys[j] = Key{
					ID:               defaultKey.ID,
					Label:            defaultKey.Label,
					ImagePath:        "", // Clean - no images
					ImageData:        "", // Clean - no images
					Description:      "", // Clean - no descriptions
					Color:            defaultKey.Color, // Keep default colors
					Layer:            layerName, // Set to new layer name
					Modifiers:        []string{},
					Row:              defaultKey.Row,
					Col:              defaultKey.Col,
					Side:             defaultKey.Side,
					KeyType:          defaultKey.KeyType,
					CustomX:          0,
					CustomY:          0,
					IsCustomPosition: false,
				}
				// Debug each key creation
				fmt.Printf("Created key: %s (%s) at row:%d col:%d side:%s type:%s\n", 
					newKeys[j].ID, newKeys[j].Label, newKeys[j].Row, newKeys[j].Col, newKeys[j].Side, newKeys[j].KeyType)
			}
			
			// Add the new layer with clean keys
			layout.AddCustomLayer(layerName, newKeys)
			a.config.Layouts[i] = layout
			
			// Debug: Verify what was actually stored in the layer
			if storedKeys, exists := layout.Layers[layerName]; exists {
				fmt.Printf("Layer '%s' was created with %d keys in storage\n", layerName, len(storedKeys))
				fmt.Printf("Stored key IDs: ")
				for _, key := range storedKeys {
					fmt.Printf("%s ", key.ID)
				}
				fmt.Printf("\n")
				
				// Count thumb keys specifically
				thumbCount := 0
				for _, key := range storedKeys {
					if key.KeyType == "thumb" || key.KeyType == "thumb-1_5u" {
						fmt.Printf("Thumb key found: %s (%s) type:%s\n", key.ID, key.Label, key.KeyType)
						thumbCount++
					}
				}
				fmt.Printf("Total thumb keys in new layer: %d\n", thumbCount)
			} else {
				fmt.Printf("ERROR: Layer '%s' was not found in storage after creation!\n", layerName)
			}
			// Save config after adding custom layer
			if err := a.SaveConfig(); err != nil {
				fmt.Printf("Warning: Failed to save config: %v\n", err)
			}
			return nil
		}
	}
	
	return fmt.Errorf("failed to add custom layer")
}

// RemoveCustomLayer removes a custom layer
func (a *App) RemoveCustomLayer(layerName string) error {
	if len(a.config.Layouts) == 0 {
		return fmt.Errorf("no layouts available")
	}
	
	for i, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			if layout.RemoveCustomLayer(layerName) {
				a.config.Layouts[i] = layout
				// If we removed the current layer, switch to base
				if a.config.CurrentLayer == layerName {
					a.config.CurrentLayer = "base"
				}
				// Save config after removing custom layer
				if err := a.SaveConfig(); err != nil {
					fmt.Printf("Warning: Failed to save config: %v\n", err)
				}
				return nil
			} else {
				return fmt.Errorf("cannot remove layer %s (protected or doesn't exist)", layerName)
			}
		}
	}
	
	return fmt.Errorf("failed to remove layer")
}

// UpdateModifierKey updates a key in the current modifier context
func (a *App) UpdateModifierKey(keyData string) error {
	var key Key
	if err := json.Unmarshal([]byte(keyData), &key); err != nil {
		return fmt.Errorf("invalid key data: %v", err)
	}
	
	if len(a.config.Layouts) == 0 {
		return fmt.Errorf("no layouts available")
	}
	
	for i, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			if layout.UpdateModifierKeyByActiveModifiers(a.config.CurrentLayer, a.config.ActiveModifiers, key) {
				a.config.Layouts[i] = layout
				// Force immediate save
				return a.SaveConfig()
			}
			break
		}
	}
	
	return fmt.Errorf("failed to update key %s", key.ID)
}

// UploadKeyImage uploads an image for a specific key
func (a *App) UploadKeyImage(keyID string, imageData string) error {
	// Validate base64 image data
	if !strings.HasPrefix(imageData, "data:image/") {
		return fmt.Errorf("invalid image data format")
	}
	
	// Extract the base64 part
	parts := strings.Split(imageData, ",")
	if len(parts) != 2 {
		return fmt.Errorf("invalid image data format")
	}
	
	base64Data := parts[1]
	
	// Validate base64 encoding
	_, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return fmt.Errorf("invalid base64 image data: %v", err)
	}
	
	// Find and update the key in the current modifier context
	if len(a.config.Layouts) == 0 {
		return fmt.Errorf("no layouts available")
	}
	
	for i := range a.config.Layouts {
		if a.config.Layouts[i].Name == a.config.CurrentLayout {
			// Create a temporary key with the image data
			var targetKey *Key = nil
			
			// First get the key from the current context to get its basic info
			keys := a.config.Layouts[i].GetKeysForActiveModifiers(a.config.CurrentLayer, a.config.ActiveModifiers)
			for _, key := range keys {
				if key.ID == keyID {
					// Make a copy and update it
					updatedKey := key
					updatedKey.ImageData = imageData
					updatedKey.ImagePath = ""
					targetKey = &updatedKey
					break
				}
			}
			
			if targetKey == nil {
				return fmt.Errorf("key %s not found in current context", keyID)
			}
			
			// Update the key in the layout using the proper method
			if a.config.Layouts[i].UpdateModifierKeyByActiveModifiers(a.config.CurrentLayer, a.config.ActiveModifiers, *targetKey) {
				// Save config after image upload
				if err := a.SaveConfig(); err != nil {
					fmt.Printf("Warning: Failed to save config: %v\n", err)
				}
				return nil
			}
			
			return fmt.Errorf("failed to update key %s in layout", keyID)
		}
	}
	
	return fmt.Errorf("current layout not found")
}

// RemoveKeyImage removes the image from a specific key
func (a *App) RemoveKeyImage(keyID string) error {
	if len(a.config.Layouts) == 0 {
		return fmt.Errorf("no layouts available")
	}
	
	for i := range a.config.Layouts {
		if a.config.Layouts[i].Name == a.config.CurrentLayout {
			// Get the key from the current context to get its basic info
			keys := a.config.Layouts[i].GetKeysForActiveModifiers(a.config.CurrentLayer, a.config.ActiveModifiers)
			var targetKey *Key = nil
			
			for _, key := range keys {
				if key.ID == keyID {
					// Make a copy and clear image data
					updatedKey := key
					updatedKey.ImageData = ""
					updatedKey.ImagePath = ""
					targetKey = &updatedKey
					break
				}
			}
			
			if targetKey == nil {
				return fmt.Errorf("key %s not found in current context", keyID)
			}
			
			// Update the key in the layout
			if a.config.Layouts[i].UpdateModifierKeyByActiveModifiers(a.config.CurrentLayer, a.config.ActiveModifiers, *targetKey) {
				// Save config after image removal
				if err := a.SaveConfig(); err != nil {
					fmt.Printf("Warning: Failed to save config: %v\n", err)
				}
				return nil
			}
			
			return fmt.Errorf("failed to update key %s in layout", keyID)
		}
	}
	
	return fmt.Errorf("current layout not found")
}

// GetKeyImage returns the image data for a specific key
func (a *App) GetKeyImage(keyID string) (string, error) {
	if len(a.config.Layouts) == 0 {
		return "", fmt.Errorf("no layouts available")
	}
	
	for _, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			// Get the current keys based on active modifiers
			keys := layout.GetKeysForActiveModifiers(a.config.CurrentLayer, a.config.ActiveModifiers)
			
			// Find the specific key
			for _, key := range keys {
				if key.ID == keyID {
					return key.ImageData, nil
				}
			}
			break
		}
	}
	
	return "", fmt.Errorf("key %s not found", keyID)
}

// ExportLayout exports the current layout with all images as a JSON file
func (a *App) ExportLayout() (string, error) {
	if len(a.config.Layouts) == 0 {
		return "", fmt.Errorf("no layouts available")
	}
	
	// Find current layout
	for _, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			return layout.ToJSON()
		}
	}
	
	return "", fmt.Errorf("current layout not found")
}

// ImportLayout imports a layout from JSON data
func (a *App) ImportLayout(jsonData string) error {
	layout, err := FromJSON(jsonData)
	if err != nil {
		return fmt.Errorf("invalid layout data: %v", err)
	}
	
	// Add or replace the layout
	found := false
	for i, existingLayout := range a.config.Layouts {
		if existingLayout.Name == layout.Name {
			a.config.Layouts[i] = *layout
			found = true
			break
		}
	}
	
	if !found {
		a.config.Layouts = append(a.config.Layouts, *layout)
	}
	
	// Switch to the imported layout
	a.config.CurrentLayout = layout.Name
	
	return nil
}

// GetKeyboardType returns the current keyboard type
func (a *App) GetKeyboardType() (string, error) {
	return a.config.KeyboardType, nil
}

// SetKeyboardType sets the keyboard type and switches to the appropriate layout
func (a *App) SetKeyboardType(keyboardType string) error {
	if keyboardType != "corne" && keyboardType != "tenkeyless" {
		return fmt.Errorf("invalid keyboard type: %s (must be 'corne' or 'tenkeyless')", keyboardType)
	}
	
	a.config.KeyboardType = keyboardType
	
	// Switch to the appropriate layout
	if keyboardType == "corne" {
		// Look for Corne layout
		for _, layout := range a.config.Layouts {
			if strings.Contains(strings.ToLower(layout.Name), "corne") {
				a.config.CurrentLayout = layout.Name
				break
			}
		}
	} else {
		// Look for Tenkeyless layout
		for _, layout := range a.config.Layouts {
			if strings.Contains(strings.ToLower(layout.Name), "tenkeyless") {
				a.config.CurrentLayout = layout.Name
				break
			}
		}
	}
	
	// Reset to base layer when switching keyboard types
	a.config.CurrentLayer = "base"
	
	// Keep existing modifiers for both keyboard types
	if a.config.ActiveModifiers == nil {
		a.config.ActiveModifiers = []string{}
	}
	
	// Save config after keyboard type change
	if err := a.SaveConfig(); err != nil {
		fmt.Printf("Warning: Failed to save config: %v\n", err)
	}
	
	return nil
}

// GetAvailableKeyboardTypes returns all available keyboard types
func (a *App) GetAvailableKeyboardTypes() (string, error) {
	types := []string{"corne", "tenkeyless"}
	data, err := json.MarshalIndent(types, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// DebugCurrentState returns debug info about current state
func (a *App) DebugCurrentState() (string, error) {
	if len(a.config.Layouts) == 0 {
		return "No layouts available", nil
	}
	
	debugInfo := map[string]interface{}{
		"currentLayout": a.config.CurrentLayout,
		"currentLayer": a.config.CurrentLayer,
		"activeModifiers": a.config.ActiveModifiers,
	}
	
	// Find current layout
	for _, layout := range a.config.Layouts {
		if layout.Name == a.config.CurrentLayout {
			// Get keys for current context
			keys := layout.GetKeysForActiveModifiers(a.config.CurrentLayer, a.config.ActiveModifiers)
			
			// Show first few keys with their image status
			var keyStatuses []map[string]interface{}
			for i, key := range keys {
				if i >= 3 { // Just show first 3 keys for debugging
					break
				}
				keyStatus := map[string]interface{}{
					"id": key.ID,
					"label": key.Label,
					"hasImage": key.ImageData != "",
					"imagePreview": "",
				}
				if key.ImageData != "" && len(key.ImageData) > 50 {
					keyStatus["imagePreview"] = key.ImageData[:50] + "..."
				}
				keyStatuses = append(keyStatuses, keyStatus)
			}
			
			debugInfo["sampleKeys"] = keyStatuses
			break
		}
	}
	
	data, err := json.MarshalIndent(debugInfo, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// GetConfig returns the entire keyboard configuration
func (a *App) GetConfig() (string, error) {
	data, err := json.MarshalIndent(a.config, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// getConfigFilePath returns the path to the configuration file
func (a *App) getConfigFilePath() (string, error) {
	// Get user's home directory
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %v", err)
	}
	
	// Create app config directory path
	configDir := filepath.Join(homeDir, ".keyboard-cheatsheet")
	
	return filepath.Join(configDir, "config.json"), nil
}

// ensureConfigDir creates the config directory if it doesn't exist
func (a *App) ensureConfigDir() error {
	configPath, err := a.getConfigFilePath()
	if err != nil {
		return err
	}
	
	configDir := filepath.Dir(configPath)
	
	// Check if directory exists
	if _, err := os.Stat(configDir); os.IsNotExist(err) {
		// Create directory with proper permissions
		if err := os.MkdirAll(configDir, 0755); err != nil {
			return fmt.Errorf("failed to create config directory %s: %v", configDir, err)
		}
	}
	
	return nil
}

// SaveConfig saves the current configuration to disk with atomic writes
func (a *App) SaveConfig() error {
	// Ensure config directory exists
	if err := a.ensureConfigDir(); err != nil {
		return err
	}
	
	configPath, err := a.getConfigFilePath()
	if err != nil {
		return err
	}
	
	// Marshal config to JSON with proper formatting
	data, err := json.MarshalIndent(a.config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %v", err)
	}
	
	// Create temporary file for atomic write
	tempPath := configPath + ".tmp"
	
	// Write to temporary file first
	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write temporary config file: %v", err)
	}
	
	// Atomic move to final location
	if err := os.Rename(tempPath, configPath); err != nil {
		// Clean up temp file on failure
		os.Remove(tempPath)
		return fmt.Errorf("failed to move config to final location: %v", err)
	}
	
	return nil
}

// LoadConfig loads the configuration from disk with validation
func (a *App) LoadConfig() error {
	configPath, err := a.getConfigFilePath()
	if err != nil {
		return err
	}
	
	// If config file doesn't exist, that's okay - we'll use defaults
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return nil // Use default config
	}
	
	// Read the config file
	data, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read config file: %v", err)
	}
	
	// Parse JSON
	var config KeyboardConfig
	if err := json.Unmarshal(data, &config); err != nil {
		// If config is corrupted, backup and use defaults
		backupPath := configPath + ".backup"
		os.Rename(configPath, backupPath)
		return fmt.Errorf("config file corrupted, backed up to %s: %v", backupPath, err)
	}
	
	// Validate loaded config
	if err := a.validateConfig(&config); err != nil {
		return fmt.Errorf("invalid config loaded: %v", err)
	}
	
	a.config = config
	return nil
}

// validateConfig ensures the loaded config is valid
func (a *App) validateConfig(config *KeyboardConfig) error {
	if config == nil {
		return fmt.Errorf("config is nil")
	}
	
	if len(config.Layouts) == 0 {
		return fmt.Errorf("no layouts found in config")
	}
	
	// Ensure current layout exists
	found := false
	for _, layout := range config.Layouts {
		if layout.Name == config.CurrentLayout {
			found = true
			break
		}
	}
	if !found {
		// Reset to first available layout
		config.CurrentLayout = config.Layouts[0].Name
	}
	
	// Ensure current layer exists in current layout
	for _, layout := range config.Layouts {
		if layout.Name == config.CurrentLayout {
			if _, exists := layout.Layers[config.CurrentLayer]; !exists {
				config.CurrentLayer = "base" // Reset to base layer
			}
			break
		}
	}
	
	return nil
}

