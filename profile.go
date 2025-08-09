package main

import (
	"encoding/json"
	"fmt"
	"time"
)

// Profile represents a complete workspace containing multiple keyboard layouts
type Profile struct {
	ID               string            `json:"id"`               // Unique identifier
	Name             string            `json:"name"`             // User-facing name
	Icon             string            `json:"icon"`             // Base64 encoded PNG icon
	BackgroundColor  string            `json:"backgroundColor"`  // Hex color for profile selector
	Description      string            `json:"description"`      // Optional description
	CreatedAt        time.Time         `json:"createdAt"`        // Creation timestamp
	ModifiedAt       time.Time         `json:"modifiedAt"`       // Last modification timestamp
	
	// Keyboard configurations - each profile has its own layouts
	Layouts          []KeyboardLayout  `json:"layouts"`          // Available keyboard layouts
	CurrentLayout    string            `json:"currentLayout"`    // Active layout name
	CurrentLayer     string            `json:"currentLayer"`     // Active layer name
	ActiveModifiers  []string          `json:"activeModifiers"`  // Currently active modifiers
	
	// Profile-specific settings
	ColorSchemes     map[string]string `json:"colorSchemes"`     // Color preferences
}

// ProfileManager handles multiple profiles and profile operations
type ProfileManager struct {
	Profiles       []Profile `json:"profiles"`       // All available profiles
	ActiveProfile  string    `json:"activeProfile"`  // ID of currently active profile
	LastModified   time.Time `json:"lastModified"`   // Last change timestamp
}

// NewProfile creates a new profile with default keyboard layouts
func NewProfile(name string) Profile {
	profileID := fmt.Sprintf("profile_%d", time.Now().UnixNano())
	
	// Create fresh default layouts for this profile
	defaultCorneLayout := DefaultCorneLayout()
	defaultTenkeylessLayout := DefaultTenkeylessLayout()
	
	// Set layout names to be profile-specific
	defaultCorneLayout.Name = "Corne"
	defaultTenkeylessLayout.Name = "Tenkeyless"
	
	return Profile{
		ID:               profileID,
		Name:             name,
		Icon:             "", // Default empty icon
		BackgroundColor:  "#6366f1", // Default indigo color
		Description:      "",
		CreatedAt:        time.Now(),
		ModifiedAt:       time.Now(),
		Layouts:          []KeyboardLayout{defaultCorneLayout, defaultTenkeylessLayout},
		CurrentLayout:    "Corne", // Default to Corne
		CurrentLayer:     "base",
		ActiveModifiers:  []string{},
		ColorSchemes: map[string]string{
			"letters":    "#e3f2fd",
			"numbers":    "#e8f5e8",
			"symbols":    "#fff3e0",
			"function":   "#fff9c4",
			"modifiers":  "#ffebee",
			"navigation": "#f3e5f5",
		},
	}
}

// NewDefaultProfile creates the default "Default" profile with existing user data
func NewDefaultProfile(existingConfig KeyboardConfig) Profile {
	profile := Profile{
		ID:               "default",
		Name:             "Default",
		Icon:             "",
		BackgroundColor:  "#6366f1",
		Description:      "Your original configuration",
		CreatedAt:        time.Now(),
		ModifiedAt:       time.Now(),
		Layouts:          existingConfig.Layouts,
		CurrentLayout:    existingConfig.CurrentLayout,
		CurrentLayer:     existingConfig.CurrentLayer,
		ActiveModifiers:  existingConfig.ActiveModifiers,
		ColorSchemes:     existingConfig.ColorSchemes,
	}
	
	// Ensure color schemes exist
	if profile.ColorSchemes == nil {
		profile.ColorSchemes = map[string]string{
			"letters":    "#e3f2fd",
			"numbers":    "#e8f5e8",
			"symbols":    "#fff3e0",
			"function":   "#fff9c4",
			"modifiers":  "#ffebee",
			"navigation": "#f3e5f5",
		}
	}
	
	return profile
}

// GetActiveProfile returns the currently active profile
func (pm *ProfileManager) GetActiveProfile() *Profile {
	for i := range pm.Profiles {
		if pm.Profiles[i].ID == pm.ActiveProfile {
			return &pm.Profiles[i]
		}
	}
	
	// If no active profile found, return first profile
	if len(pm.Profiles) > 0 {
		pm.ActiveProfile = pm.Profiles[0].ID
		return &pm.Profiles[0]
	}
	
	return nil
}

// SetActiveProfile switches to a different profile
func (pm *ProfileManager) SetActiveProfile(profileID string) error {
	for _, profile := range pm.Profiles {
		if profile.ID == profileID {
			pm.ActiveProfile = profileID
			pm.LastModified = time.Now()
			return nil
		}
	}
	return fmt.Errorf("profile with ID %s not found", profileID)
}

// AddProfile adds a new profile to the manager
func (pm *ProfileManager) AddProfile(profile Profile) {
	pm.Profiles = append(pm.Profiles, profile)
	pm.LastModified = time.Now()
}

// UpdateProfile updates an existing profile
func (pm *ProfileManager) UpdateProfile(profileID string, updatedProfile Profile) error {
	for i := range pm.Profiles {
		if pm.Profiles[i].ID == profileID {
			// Preserve ID and timestamps
			updatedProfile.ID = profileID
			updatedProfile.ModifiedAt = time.Now()
			pm.Profiles[i] = updatedProfile
			pm.LastModified = time.Now()
			return nil
		}
	}
	return fmt.Errorf("profile with ID %s not found", profileID)
}

// DeleteProfile removes a profile (cannot delete default profile if it's the only one)
func (pm *ProfileManager) DeleteProfile(profileID string) error {
	if len(pm.Profiles) <= 1 {
		return fmt.Errorf("cannot delete profile - at least one profile must exist")
	}
	
	for i, profile := range pm.Profiles {
		if profile.ID == profileID {
			// If we're deleting the active profile, switch to another one
			if pm.ActiveProfile == profileID {
				if i > 0 {
					pm.ActiveProfile = pm.Profiles[i-1].ID
				} else {
					pm.ActiveProfile = pm.Profiles[i+1].ID
				}
			}
			
			// Remove the profile
			pm.Profiles = append(pm.Profiles[:i], pm.Profiles[i+1:]...)
			pm.LastModified = time.Now()
			return nil
		}
	}
	
	return fmt.Errorf("profile with ID %s not found", profileID)
}

// GetProfile returns a specific profile by ID
func (pm *ProfileManager) GetProfile(profileID string) *Profile {
	for i := range pm.Profiles {
		if pm.Profiles[i].ID == profileID {
			return &pm.Profiles[i]
		}
	}
	return nil
}

// GetCurrentLayout returns the current keyboard layout for the active profile
func (p *Profile) GetCurrentLayout() *KeyboardLayout {
	for i := range p.Layouts {
		if p.Layouts[i].Name == p.CurrentLayout {
			return &p.Layouts[i]
		}
	}
	
	// Return first layout if current not found
	if len(p.Layouts) > 0 {
		return &p.Layouts[0]
	}
	
	return nil
}

// SetCurrentLayout changes the active layout within the profile
func (p *Profile) SetCurrentLayout(layoutName string) error {
	for _, layout := range p.Layouts {
		if layout.Name == layoutName {
			p.CurrentLayout = layoutName
			p.ModifiedAt = time.Now()
			return nil
		}
	}
	return fmt.Errorf("layout %s not found in profile %s", layoutName, p.Name)
}

// GetAvailableKeyboardTypes returns available keyboard types for this profile
func (p *Profile) GetAvailableKeyboardTypes() []string {
	types := make(map[string]bool)
	
	for _, layout := range p.Layouts {
		// Determine keyboard type based on layout characteristics
		if len(layout.Layers["base"]) <= 50 { // Rough heuristic for Corne vs Tenkeyless
			types["corne"] = true
		} else {
			types["tenkeyless"] = true
		}
	}
	
	var result []string
	for keyType := range types {
		result = append(result, keyType)
	}
	
	return result
}

// UpdateProfileIcon updates the profile's icon
func (p *Profile) UpdateProfileIcon(iconData string) error {
	// Validate that iconData is a valid base64 PNG
	if iconData != "" && !isValidBase64Image(iconData) {
		return fmt.Errorf("invalid icon data format")
	}
	
	p.Icon = iconData
	p.ModifiedAt = time.Now()
	return nil
}

// UpdateProfileAppearance updates the profile's visual appearance
func (p *Profile) UpdateProfileAppearance(name, backgroundColor, icon string) error {
	if name == "" {
		return fmt.Errorf("profile name cannot be empty")
	}
	
	// Validate background color (should be hex format)
	if backgroundColor != "" && !isValidHexColor(backgroundColor) {
		return fmt.Errorf("invalid background color format")
	}
	
	// Validate icon if provided
	if icon != "" && !isValidBase64Image(icon) {
		return fmt.Errorf("invalid icon data format")
	}
	
	p.Name = name
	p.BackgroundColor = backgroundColor
	p.Icon = icon
	p.ModifiedAt = time.Now()
	return nil
}

// ToJSON converts the profile to JSON string
func (p *Profile) ToJSON() (string, error) {
	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// ToJSON converts the profile manager to JSON string
func (pm *ProfileManager) ToJSON() (string, error) {
	data, err := json.MarshalIndent(pm, "", "  ")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// Helper functions

// isValidHexColor checks if a string is a valid hex color
func isValidHexColor(color string) bool {
	if len(color) != 7 || color[0] != '#' {
		return false
	}
	
	for i := 1; i < 7; i++ {
		c := color[i]
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	
	return true
}

// isValidBase64Image checks if a string is a valid base64 encoded image
func isValidBase64Image(imageData string) bool {
	// Should start with data:image/ prefix
	return len(imageData) > 11 && imageData[:11] == "data:image/"
}