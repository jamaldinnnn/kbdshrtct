package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// App struct
type App struct {
	ctx            context.Context
	profileManager ProfileManager
}

// NewApp creates a new App application struct
func NewApp() *App {
	app := &App{}
	
	// Try to load existing profile configuration
	if err := app.LoadProfiles(); err != nil {
		fmt.Printf("Warning: Failed to load profiles, creating default: %v\n", err)
		
		// Try to load legacy config for migration
		var existingConfig KeyboardConfig
		if err := app.loadLegacyConfig(&existingConfig); err == nil {
			// Migrate existing config to default profile
			fmt.Println("Migrating existing configuration to default profile...")
			defaultProfile := NewDefaultProfile(existingConfig)
			
			app.profileManager = ProfileManager{
				Profiles:      []Profile{defaultProfile},
				ActiveProfile: defaultProfile.ID,
				LastModified:  time.Now(),
			}
		} else {
			// Create fresh default profile
			fmt.Println("Creating fresh default profile...")
			defaultProfile := NewProfile("Default")
			
			app.profileManager = ProfileManager{
				Profiles:      []Profile{defaultProfile},
				ActiveProfile: defaultProfile.ID,
				LastModified:  time.Now(),
			}
		}
	}
	
	// Save the profile configuration
	if err := app.SaveProfiles(); err != nil {
		fmt.Printf("Warning: Failed to save initial profiles: %v\n", err)
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
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return "", fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return "", fmt.Errorf("no current layout available in profile")
	}
	
	return currentLayout.ToJSON()
}

// GetCurrentLayer returns the keys for the current layer and active modifiers
func (a *App) GetCurrentLayer() (string, error) {
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return "", fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return "", fmt.Errorf("no current layout available in profile")
	}
	
	// Get keys based on active modifiers
	keys := currentLayout.GetKeysForActiveModifiers(activeProfile.CurrentLayer, activeProfile.ActiveModifiers)
	
	if len(keys) == 0 {
		return "", fmt.Errorf("no keys found for layer %s", activeProfile.CurrentLayer)
	}
	
	data, err := json.MarshalIndent(keys, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// SetCurrentLayer changes the active layer
func (a *App) SetCurrentLayer(layerName string) error {
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return fmt.Errorf("no current layout available in profile")
	}
	
	if _, exists := currentLayout.Layers[layerName]; exists {
		activeProfile.CurrentLayer = layerName
		activeProfile.ModifiedAt = time.Now()
		// Save profiles after layer change
		return a.SaveProfiles()
	}
	
	return fmt.Errorf("layer %s does not exist", layerName)
}

// GetAvailableLayers returns all available layer names
func (a *App) GetAvailableLayers() (string, error) {
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return "", fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return "", fmt.Errorf("no current layout available in profile")
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
	
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return fmt.Errorf("no current layout available in profile")
	}
	
	if currentLayout.UpdateKey(activeProfile.CurrentLayer, key) {
		activeProfile.ModifiedAt = time.Now()
		// Force immediate save
		return a.SaveProfiles()
	}
	
	return fmt.Errorf("failed to update key %s", key.ID)
}

// SetActiveModifiers sets the currently active modifier keys
func (a *App) SetActiveModifiers(modifiersJSON string) error {
	var modifiers []string
	if err := json.Unmarshal([]byte(modifiersJSON), &modifiers); err != nil {
		return fmt.Errorf("invalid modifiers data: %v", err)
	}
	
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return fmt.Errorf("no active profile available")
	}
	
	activeProfile.ActiveModifiers = modifiers
	activeProfile.ModifiedAt = time.Now()
	// Save profiles after modifier change
	return a.SaveProfiles()
}

// GetActiveModifiers returns the currently active modifier keys
func (a *App) GetActiveModifiers() (string, error) {
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return "", fmt.Errorf("no active profile available")
	}
	
	data, err := json.MarshalIndent(activeProfile.ActiveModifiers, "", "  ")
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
	
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return fmt.Errorf("no current layout available in profile")
	}
	
	// Check if layer already exists
	if _, exists := currentLayout.Layers[layerName]; exists {
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
	currentLayout.AddCustomLayer(layerName, newKeys)
	activeProfile.ModifiedAt = time.Now()
	
	// Debug: Verify what was actually stored in the layer
	if storedKeys, exists := currentLayout.Layers[layerName]; exists {
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
	// Save profiles after adding custom layer
	if err := a.SaveProfiles(); err != nil {
		fmt.Printf("Warning: Failed to save profiles: %v\n", err)
	}
	return nil
}

// RemoveCustomLayer removes a custom layer
func (a *App) RemoveCustomLayer(layerName string) error {
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return fmt.Errorf("no current layout available in profile")
	}
	
	if currentLayout.RemoveCustomLayer(layerName) {
		activeProfile.ModifiedAt = time.Now()
		// If we removed the current layer, switch to base
		if activeProfile.CurrentLayer == layerName {
			activeProfile.CurrentLayer = "base"
		}
		// Save profiles after removing custom layer
		if err := a.SaveProfiles(); err != nil {
			fmt.Printf("Warning: Failed to save profiles: %v\n", err)
		}
		return nil
	} else {
		return fmt.Errorf("cannot remove layer %s (protected or doesn't exist)", layerName)
	}
}

// UpdateModifierKey updates a key in the current modifier context
func (a *App) UpdateModifierKey(keyData string) error {
	var key Key
	if err := json.Unmarshal([]byte(keyData), &key); err != nil {
		return fmt.Errorf("invalid key data: %v", err)
	}
	
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return fmt.Errorf("no current layout available in profile")
	}
	
	if currentLayout.UpdateModifierKeyByActiveModifiers(activeProfile.CurrentLayer, activeProfile.ActiveModifiers, key) {
		activeProfile.ModifiedAt = time.Now()
		// Force immediate save
		return a.SaveProfiles()
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
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return fmt.Errorf("no current layout available in profile")
	}
	
	// Create a temporary key with the image data
	var targetKey *Key = nil
	
	// First get the key from the current context to get its basic info
	keys := currentLayout.GetKeysForActiveModifiers(activeProfile.CurrentLayer, activeProfile.ActiveModifiers)
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
	if currentLayout.UpdateModifierKeyByActiveModifiers(activeProfile.CurrentLayer, activeProfile.ActiveModifiers, *targetKey) {
		activeProfile.ModifiedAt = time.Now()
		// Save profiles after image upload
		if err := a.SaveProfiles(); err != nil {
			fmt.Printf("Warning: Failed to save profiles: %v\n", err)
		}
		return nil
	}
	
	return fmt.Errorf("failed to update key %s in layout", keyID)
}

// RemoveKeyImage removes the image from a specific key
func (a *App) RemoveKeyImage(keyID string) error {
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return fmt.Errorf("no current layout available in profile")
	}
	
	// Get the key from the current context to get its basic info
	keys := currentLayout.GetKeysForActiveModifiers(activeProfile.CurrentLayer, activeProfile.ActiveModifiers)
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
	if currentLayout.UpdateModifierKeyByActiveModifiers(activeProfile.CurrentLayer, activeProfile.ActiveModifiers, *targetKey) {
		activeProfile.ModifiedAt = time.Now()
		// Save profiles after image removal
		if err := a.SaveProfiles(); err != nil {
			fmt.Printf("Warning: Failed to save profiles: %v\n", err)
		}
		return nil
	}
	
	return fmt.Errorf("failed to update key %s in layout", keyID)
}

// GetKeyImage returns the image data for a specific key
func (a *App) GetKeyImage(keyID string) (string, error) {
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return "", fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return "", fmt.Errorf("no current layout available in profile")
	}
	
	// Get the current keys based on active modifiers
	keys := currentLayout.GetKeysForActiveModifiers(activeProfile.CurrentLayer, activeProfile.ActiveModifiers)
	
	// Find the specific key
	for _, key := range keys {
		if key.ID == keyID {
			return key.ImageData, nil
		}
	}
	
	return "", fmt.Errorf("key %s not found", keyID)
}

// ExportLayout exports the current layout with all images as a JSON file
func (a *App) ExportLayout() (string, error) {
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return "", fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return "", fmt.Errorf("no current layout available in profile")
	}
	
	return currentLayout.ToJSON()
}

// ImportLayout imports a layout from JSON data
func (a *App) ImportLayout(jsonData string) error {
	layout, err := FromJSON(jsonData)
	if err != nil {
		return fmt.Errorf("invalid layout data: %v", err)
	}
	
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return fmt.Errorf("no active profile available")
	}
	
	// Add or replace the layout in the current profile
	found := false
	for i, existingLayout := range activeProfile.Layouts {
		if existingLayout.Name == layout.Name {
			activeProfile.Layouts[i] = *layout
			found = true
			break
		}
	}
	
	if !found {
		activeProfile.Layouts = append(activeProfile.Layouts, *layout)
	}
	
	// Switch to the imported layout
	activeProfile.CurrentLayout = layout.Name
	activeProfile.ModifiedAt = time.Now()
	
	return a.SaveProfiles()
}

// GetKeyboardType returns the current keyboard type for the active profile
func (a *App) GetKeyboardType() (string, error) {
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return "", fmt.Errorf("no active profile available")
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return "", fmt.Errorf("no current layout available in profile")
	}
	
	// Determine keyboard type based on layout characteristics
	if len(currentLayout.Layers["base"]) <= 50 {
		return "corne", nil
	}
	return "tenkeyless", nil
}

// SetKeyboardType sets the keyboard type and switches to the appropriate layout within the profile
func (a *App) SetKeyboardType(keyboardType string) error {
	if keyboardType != "corne" && keyboardType != "tenkeyless" {
		return fmt.Errorf("invalid keyboard type: %s (must be 'corne' or 'tenkeyless')", keyboardType)
	}
	
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return fmt.Errorf("no active profile available")
	}
	
	// Find the appropriate layout within the profile
	var targetLayoutName string
	for _, layout := range activeProfile.Layouts {
		layoutKeyCount := len(layout.Layers["base"])
		
		if keyboardType == "corne" && layoutKeyCount <= 50 {
			targetLayoutName = layout.Name
			break
		} else if keyboardType == "tenkeyless" && layoutKeyCount > 50 {
			targetLayoutName = layout.Name
			break
		}
	}
	
	if targetLayoutName == "" {
		return fmt.Errorf("no %s layout found in current profile", keyboardType)
	}
	
	// Switch to the appropriate layout
	err := activeProfile.SetCurrentLayout(targetLayoutName)
	if err != nil {
		return err
	}
	
	// Reset to base layer when switching keyboard types
	activeProfile.CurrentLayer = "base"
	
	// Keep existing modifiers for both keyboard types
	if activeProfile.ActiveModifiers == nil {
		activeProfile.ActiveModifiers = []string{}
	}
	
	// Save profiles after keyboard type change
	return a.SaveProfiles()
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
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return "No active profile available", nil
	}
	
	currentLayout := activeProfile.GetCurrentLayout()
	if currentLayout == nil {
		return "No current layout available in profile", nil
	}
	
	debugInfo := map[string]interface{}{
		"profileName":      activeProfile.Name,
		"profileID":        activeProfile.ID,
		"currentLayout":    activeProfile.CurrentLayout,
		"currentLayer":     activeProfile.CurrentLayer,
		"activeModifiers":  activeProfile.ActiveModifiers,
	}
	
	// Get keys for current context
	keys := currentLayout.GetKeysForActiveModifiers(activeProfile.CurrentLayer, activeProfile.ActiveModifiers)
	
	// Show first few keys with their image status
	var keyStatuses []map[string]interface{}
	for i, key := range keys {
		if i >= 3 { // Just show first 3 keys for debugging
			break
		}
		keyStatus := map[string]interface{}{
			"id":           key.ID,
			"label":        key.Label,
			"hasImage":     key.ImageData != "",
			"imagePreview": "",
		}
		if key.ImageData != "" && len(key.ImageData) > 50 {
			keyStatus["imagePreview"] = key.ImageData[:50] + "..."
		}
		keyStatuses = append(keyStatuses, keyStatus)
	}
	
	debugInfo["sampleKeys"] = keyStatuses
	
	data, err := json.MarshalIndent(debugInfo, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// GetConfig returns the entire profile manager configuration
func (a *App) GetConfig() (string, error) {
	data, err := json.MarshalIndent(a.profileManager, "", "  ")
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

// SaveConfig saves the current configuration (deprecated - now saves profiles)
func (a *App) SaveConfig() error {
	return a.SaveProfiles()
}

// LoadConfig loads configuration (deprecated - now loads profiles)
func (a *App) LoadConfig() error {
	return a.LoadProfiles()
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

// Profile Management API Methods

// GetAllProfiles returns all available profiles
func (a *App) GetAllProfiles() (string, error) {
	data, err := json.MarshalIndent(a.profileManager.Profiles, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// GetActiveProfile returns the currently active profile
func (a *App) GetActiveProfile() (string, error) {
	activeProfile := a.profileManager.GetActiveProfile()
	if activeProfile == nil {
		return "", fmt.Errorf("no active profile available")
	}
	
	data, err := json.MarshalIndent(activeProfile, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// SetActiveProfile switches to a different profile
func (a *App) SetActiveProfile(profileID string) error {
	err := a.profileManager.SetActiveProfile(profileID)
	if err != nil {
		return err
	}
	
	// Save profiles after switching active profile
	return a.SaveProfiles()
}

// CreateNewProfile creates a new profile with the specified name
func (a *App) CreateNewProfile(name string) (string, error) {
	if name == "" {
		return "", fmt.Errorf("profile name cannot be empty")
	}
	
	// Check if profile name already exists
	for _, profile := range a.profileManager.Profiles {
		if profile.Name == name {
			return "", fmt.Errorf("profile with name '%s' already exists", name)
		}
	}
	
	// Create new profile
	newProfile := NewProfile(name)
	a.profileManager.AddProfile(newProfile)
	
	// Save profiles
	err := a.SaveProfiles()
	if err != nil {
		return "", err
	}
	
	// Return the new profile as JSON
	return newProfile.ToJSON()
}

// UpdateProfileAppearance updates a profile's visual appearance
func (a *App) UpdateProfileAppearance(profileID, name, backgroundColor, icon string) error {
	profile := a.profileManager.GetProfile(profileID)
	if profile == nil {
		return fmt.Errorf("profile with ID %s not found", profileID)
	}
	
	err := profile.UpdateProfileAppearance(name, backgroundColor, icon)
	if err != nil {
		return err
	}
	
	// Save profiles after updating appearance
	return a.SaveProfiles()
}

// DeleteProfile removes a profile
func (a *App) DeleteProfile(profileID string) error {
	err := a.profileManager.DeleteProfile(profileID)
	if err != nil {
		return err
	}
	
	// Save profiles after deletion
	return a.SaveProfiles()
}

// Profile Storage Methods

// LoadProfiles loads the profile configuration from disk
func (a *App) LoadProfiles() error {
	profilePath, err := a.getProfileFilePath()
	if err != nil {
		return err
	}
	
	// If profile file doesn't exist, return error to trigger default creation
	if _, err := os.Stat(profilePath); os.IsNotExist(err) {
		return fmt.Errorf("profiles file does not exist")
	}
	
	// Read the profile file
	data, err := os.ReadFile(profilePath)
	if err != nil {
		return fmt.Errorf("failed to read profiles file: %v", err)
	}
	
	// Parse JSON
	var profileManager ProfileManager
	if err := json.Unmarshal(data, &profileManager); err != nil {
		// If profiles are corrupted, backup and return error
		backupPath := profilePath + ".backup"
		os.Rename(profilePath, backupPath)
		return fmt.Errorf("profiles file corrupted, backed up to %s: %v", backupPath, err)
	}
	
	// Validate loaded profiles
	if err := a.validateProfiles(&profileManager); err != nil {
		return fmt.Errorf("invalid profiles loaded: %v", err)
	}
	
	a.profileManager = profileManager
	return nil
}

// SaveProfiles saves the current profile configuration to disk
func (a *App) SaveProfiles() error {
	// Ensure config directory exists
	if err := a.ensureConfigDir(); err != nil {
		return err
	}
	
	profilePath, err := a.getProfileFilePath()
	if err != nil {
		return err
	}
	
	// Update last modified timestamp
	a.profileManager.LastModified = time.Now()
	
	// Marshal profiles to JSON with proper formatting
	data, err := json.MarshalIndent(a.profileManager, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal profiles: %v", err)
	}
	
	// Create temporary file for atomic write
	tempPath := profilePath + ".tmp"
	
	// Write to temporary file first
	if err := os.WriteFile(tempPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write temporary profiles file: %v", err)
	}
	
	// Atomic move to final location
	if err := os.Rename(tempPath, profilePath); err != nil {
		// Clean up temp file on failure
		os.Remove(tempPath)
		return fmt.Errorf("failed to move profiles to final location: %v", err)
	}
	
	return nil
}

// getProfileFilePath returns the path to the profile configuration file
func (a *App) getProfileFilePath() (string, error) {
	// Get user's home directory
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %v", err)
	}
	
	// Create app config directory path
	configDir := filepath.Join(homeDir, ".keyboard-cheatsheet")
	
	return filepath.Join(configDir, "profiles.json"), nil
}

// loadLegacyConfig loads the old config.json format for migration
func (a *App) loadLegacyConfig(config *KeyboardConfig) error {
	configPath, err := a.getConfigFilePath()
	if err != nil {
		return err
	}
	
	// If config file doesn't exist, that's okay - no legacy data to migrate
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return fmt.Errorf("no legacy config file found")
	}
	
	// Read the config file
	data, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read legacy config file: %v", err)
	}
	
	// Parse JSON
	if err := json.Unmarshal(data, config); err != nil {
		return fmt.Errorf("failed to parse legacy config: %v", err)
	}
	
	return nil
}

// validateProfiles ensures the loaded profile configuration is valid
func (a *App) validateProfiles(pm *ProfileManager) error {
	if pm == nil {
		return fmt.Errorf("profile manager is nil")
	}
	
	if len(pm.Profiles) == 0 {
		return fmt.Errorf("no profiles found")
	}
	
	// Ensure active profile exists
	found := false
	for _, profile := range pm.Profiles {
		if profile.ID == pm.ActiveProfile {
			found = true
			break
		}
	}
	if !found {
		// Reset to first available profile
		pm.ActiveProfile = pm.Profiles[0].ID
	}
	
	// Validate each profile
	for i := range pm.Profiles {
		profile := &pm.Profiles[i]
		
		// Ensure profile has layouts
		if len(profile.Layouts) == 0 {
			return fmt.Errorf("profile %s has no layouts", profile.Name)
		}
		
		// Ensure current layout exists
		found := false
		for _, layout := range profile.Layouts {
			if layout.Name == profile.CurrentLayout {
				found = true
				break
			}
		}
		if !found {
			profile.CurrentLayout = profile.Layouts[0].Name
		}
		
		// Ensure current layer exists in current layout
		for _, layout := range profile.Layouts {
			if layout.Name == profile.CurrentLayout {
				if _, exists := layout.Layers[profile.CurrentLayer]; !exists {
					profile.CurrentLayer = "base"
				}
				break
			}
		}
		
		// Ensure basic fields are set
		if profile.ID == "" {
			profile.ID = fmt.Sprintf("profile_%d", time.Now().UnixNano())
		}
		if profile.Name == "" {
			profile.Name = "Unnamed Profile"
		}
		if profile.BackgroundColor == "" {
			profile.BackgroundColor = "#6366f1"
		}
	}
	
	return nil
}

