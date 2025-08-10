import './style.css';
import './app.css';

// Import Wails bindings
import {
    // Core keyboard methods
    GetConfig,
    SetCurrentLayer,
    GetCurrentLayer,
    GetAvailableLayers,
    UpdateKey,
    UpdateModifierKey,
    GetActiveModifiers,
    SetActiveModifiers,
    GetAvailableModifiers,
    GetKeyboardType,
    SetKeyboardType,
    GetAvailableKeyboardTypes,
    AddCustomLayer,
    RemoveCustomLayer,
    UploadKeyImage,
    RemoveKeyImage,
    GetKeyImage,
    // New Profile Management methods
    GetAllProfiles,
    GetActiveProfile,
    SetActiveProfile,
    CreateNewProfile,
    UpdateProfileAppearance,
    DeleteProfile,
} from '../wailsjs/go/main/App';

let currentKeys = [];
let currentLayer = 'base';
let currentKeyboardType = 'corne'; // 'corne' or 'tenkeyless'
let availableLayers = [];
let activeModifiers = [];
let availableModifiers = [];
let keyPaletteHistory = []; // Persistent library of custom key designs
let showOnlyUnusedKeys = false; // Track whether to show only unused keys

// Profile state
let profiles = [];
let activeProfile = null;

// Custom modifier button colors
let customModifierColors = {
    ctrl: '#ff6b6b',
    shift: '#51cf66',
    alt: '#ffd43b',
    gui: '#339af0'
};

// User-created custom modifiers
let customModifiers = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        console.log('Initializing app...');

        // Load all data in parallel
        await Promise.all([
            loadKeyPaletteHistory(),
            loadProfiles(),
            loadKeyboardType(),
            loadLayers(),
            loadAvailableModifiers(),
            loadActiveModifiers(),
            loadCurrentLayer()
        ]);

        console.log('Rendering UI...');
        // Render the UI
        renderApp();
        renderKeyboard();
        renderLayerSelector();
        renderModifierPanel();

        console.log('App initialized successfully');

    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Show error to user
        document.querySelector('#app').innerHTML = `
            <div class="error-container">
                <h2>Failed to Initialize Application</h2>
                <p>Error: ${error.message}</p>
                <button onclick="window.location.reload()">Reload</button>
            </div>
        `;
    }
}

async function loadKeyboardType() {
    try {
        currentKeyboardType = await GetKeyboardType();
    } catch (error) {
        console.error('Failed to load keyboard type:', error);
        currentKeyboardType = 'corne'; // fallback
    }
}

async function loadLayers() {
    try {
        const layersJson = await GetAvailableLayers();
        availableLayers = JSON.parse(layersJson);
    } catch (error) {
        console.error('Failed to load layers:', error);
        availableLayers = ['base'];
    }
}

async function loadCurrentLayer() {
    try {
        console.log(`Loading layer for keyboard type: ${currentKeyboardType}`);
        const keysJson = await GetCurrentLayer();
        if (keysJson && keysJson !== "null") {
            const parsedKeys = JSON.parse(keysJson);
            if (Array.isArray(parsedKeys)) {
                currentKeys = parsedKeys;
                console.log(`Loaded ${currentKeys.length} keys for ${currentKeyboardType}`);
                console.log('First few key IDs:', currentKeys.slice(0, 10).map(k => k.id));
            } else {
                console.warn('Parsed keys is not an array:', parsedKeys);
                currentKeys = [];
            }
        } else {
            currentKeys = [];
        }
    } catch (error) {
        console.error('Failed to load current layer:', error);
        currentKeys = [];
    }
}

async function loadAvailableModifiers() {
    try {
        const modsJson = await GetAvailableModifiers();
        const parsedMods = JSON.parse(modsJson);
        if (Array.isArray(parsedMods)) {
            availableModifiers = parsedMods;
        } else {
            console.warn('Available modifiers is not an array:', parsedMods);
            availableModifiers = ['ctrl', 'shift', 'alt', 'gui'];
        }
    } catch (error) {
        console.error('Failed to load available modifiers:', error);
        availableModifiers = ['ctrl', 'shift', 'alt', 'gui'];
    }
}

async function loadActiveModifiers() {
    try {
        const activeJson = await GetActiveModifiers();
        if (activeJson && activeJson !== "null") {
            const parsedActive = JSON.parse(activeJson);
            if (Array.isArray(parsedActive)) {
                activeModifiers = parsedActive;
            } else {
                console.warn('Active modifiers is not an array:', parsedActive);
                activeModifiers = [];
            }
        } else {
            activeModifiers = [];
        }
    } catch (error) {
        console.error('Failed to load active modifiers:', error);
        activeModifiers = [];
    }
}

async function loadProfiles() {
    try {
        const profilesJson = await GetAllProfiles();
        if (profilesJson && profilesJson !== "null") {
            const parsedProfiles = JSON.parse(profilesJson);
            if (Array.isArray(parsedProfiles)) {
                profiles = parsedProfiles;
                console.log(`Loaded ${profiles.length} profiles`);
            } else {
                console.warn('Profiles data is not an array:', parsedProfiles);
                profiles = [];
            }
        } else {
            profiles = [];
        }
        
        // Load active profile
        const activeProfileJson = await GetActiveProfile();
        if (activeProfileJson && activeProfileJson !== "null") {
            activeProfile = JSON.parse(activeProfileJson);
            console.log('Loaded active profile:', activeProfile.name);
        } else {
            activeProfile = null;
        }
        
    } catch (error) {
        console.error('Failed to load profiles:', error);
        profiles = [];
        activeProfile = null;
    }
}

function renderApp() {
    document.querySelector('#app').innerHTML = `
        <div class="keyboard-app">
            <header class="app-header">
                <h1>kbdshrtct (α build)</h1>
                <div class="controls">
                    <div id="layer-selector"></div>
                    <button id="settings-btn" class="btn-settings" title="Settings">
                        <span class="settings-icon">⚙️</span>
                    </button>
                </div>
            </header>
            
            <div class="main-content">
                <main class="keyboard-container" id="keyboard-container">
                    <div id="keyboard-layout" class="keyboard-layout"></div>
                </main>
                
                <aside class="modifier-panel" id="modifier-panel">
                    <h3>Active Modifiers</h3>
                    <div id="current-modifier-display" class="current-modifier"></div>
                    <div class="modifier-selector" id="modifier-selector"></div>
                </aside>
            </div>
            
            <!-- Persistent Key Palette Panel -->
            <div class="palette-panel" id="palette-panel">
                <div class="palette-resize-handle" id="palette-resize-handle">
                    <div class="resize-grip"></div>
                </div>
                <div class="palette-header">
                    <h3>Key Palette</h3>
                    <div class="palette-search">
                        <input type="text" id="palette-search-input" placeholder="Search keys..." class="palette-search-input">
                        <span class="search-icon">🔍</span>
                    </div>
                    <div class="palette-controls">
                        <button id="toggle-unused-btn" class="btn-secondary" title="Show only unused keys">
                            <span>🔄</span> Show Unused
                        </button>
                        <button id="add-custom-key-btn" class="btn-secondary" title="Add custom key to palette">
                            <span>➕</span> Add Key
                        </button>
                        <button id="palette-sort-btn" class="btn-secondary palette-sort-btn" title="Toggle sort: Time / Color">
                            📅 Time
                        </button>
                        <button id="toggle-palette-btn" class="btn-secondary" title="Hide/Show palette">Hide</button>
                    </div>
                </div>
                <div class="palette-content">
                    <div class="palette-grid-container">
                        <div id="persistent-palette-grid" class="persistent-palette-grid">
                            <!-- Palette keys will be rendered here -->
                        </div>
                    </div>
                    <div class="palette-empty-state" id="palette-empty-state">
                        <p>No saved key designs yet</p>
                        <p>Create custom keys and use "Add to Palette" to save your designs here</p>
                    </div>
                    <div class="palette-no-results" id="palette-no-results" style="display: none;">
                        <p>No keys match your search</p>
                        <p>Try different keywords or clear the search</p>
                    </div>
                </div>
            </div>
            
            <!-- Show Palette Button (appears when palette is hidden) -->
            <div class="show-palette-btn" id="show-palette-btn" style="display: none;">
                <button class="btn-secondary" title="Show key palette">
                    <span>📋</span> Show Palette
                </button>
            </div>
            
            <!-- Profile Selector Button -->
            <div class="profile-selector-btn" id="profile-selector-btn">
                <button class="profile-btn" id="profile-btn" title="Switch profiles">
                    <span id="profile-icon-text">P</span>
                </button>
            </div>
        </div>
        
        <!-- Key Editor Modal -->
        <div id="key-editor-modal" class="modal primary-modal" style="display: none;">
            <div class="modal-content key-editor-content">
                <span class="close">&times;</span>
                <h2>Edit Key</h2>
                
                <div class="key-editor-grid">
                    <!-- Image Slots Section -->
                    <div class="image-slots-section">
                        <h3>Images</h3>
                        <div class="image-inventory">
                            <div class="image-slot primary-slot" data-slot="primary">
                                <div class="slot-content">
                                    <div class="slot-placeholder">
                                        <div class="upload-icon">📸</div>
                                        <div class="slot-label">Main Image</div>
                                        <div class="slot-hint">Click or drop image</div>
                                    </div>
                                </div>
                                <input type="file" class="hidden-file-input" accept="image/*">
                            </div>
                            
                            <div class="image-slot secondary-slot" data-slot="secondary">
                                <div class="slot-content">
                                    <div class="slot-placeholder">
                                        <div class="upload-icon">🏷️</div>
                                        <div class="slot-label">Top Corner</div>
                                        <div class="slot-hint">Small overlay</div>
                                    </div>
                                </div>
                                <input type="file" class="hidden-file-input" accept="image/*">
                            </div>
                            
                            <div class="image-slot tertiary-slot" data-slot="tertiary">
                                <div class="slot-content">
                                    <div class="slot-placeholder">
                                        <div class="upload-icon">🔖</div>
                                        <div class="slot-label">Bottom Corner</div>
                                        <div class="slot-hint">Small overlay</div>
                                    </div>
                                </div>
                                <input type="file" class="hidden-file-input" accept="image/*">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Key Properties Section -->
                    <div class="key-properties-section">
                        <h3>Properties</h3>
                        <div class="property-group">
                            <label for="key-label-input">Text Label</label>
                            <input type="text" id="key-label-input" placeholder="Fallback text (optional)">
                        </div>
                        
                        <div class="property-group">
                            <label for="key-description-input">Description</label>
                            <input type="text" id="key-description-input" placeholder="Tooltip description">
                        </div>
                        
                        <div class="property-group">
                            <label for="key-color-input">Background Color</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="key-color-input">
                                <span class="color-label"></span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" id="add-to-palette-btn" class="btn-secondary">Add to Palette</button>
                    <button type="button" id="open-palette-btn" class="btn-secondary">Browse Keys</button>
                    <button type="button" id="cancel-key-edit" class="btn-secondary">Cancel</button>
                    <button type="button" id="save-key-edit" class="btn-primary">Save Changes</button>
                </div>
            </div>
        </div>
        
        <!-- Key Palette Modal -->
        <div id="key-palette-modal" class="modal secondary-modal" style="display: none;">
            <div class="modal-content key-palette-content">
                <span class="close key-palette-close">&times;</span>
                <h2>Key Palette</h2>
                <div class="palette-header">
                    <p>Click any key below to copy its properties to the current key</p>
                </div>
                <div class="key-palette-grid" id="key-palette-grid">
                    <!-- Keys will be populated here -->
                </div>
            </div>
        </div>
        
        <!-- Palette Key Editor Modal -->
        <div id="palette-key-editor-modal" class="modal tertiary-modal" style="display: none;">
            <div class="modal-content key-editor-content">
                <span class="close">&times;</span>
                <h2>Edit Palette Key</h2>
                
                <div class="key-editor-grid">
                    <!-- Image Slots Section -->
                    <div class="image-slots-section">
                        <h3>Images</h3>
                        <div class="image-inventory">
                            <div class="image-slot primary-slot" data-slot="primary">
                                <div class="slot-content">
                                    <div class="slot-placeholder">
                                        <div class="upload-icon">📸</div>
                                        <div class="slot-label">Main Image</div>
                                        <div class="slot-hint">Click or drop image</div>
                                    </div>
                                </div>
                                <input type="file" class="hidden-file-input" accept="image/*">
                            </div>
                            
                            <div class="image-slot secondary-slot" data-slot="secondary">
                                <div class="slot-content">
                                    <div class="slot-placeholder">
                                        <div class="upload-icon">🏷️</div>
                                        <div class="slot-label">Top Corner</div>
                                        <div class="slot-hint">Small overlay</div>
                                    </div>
                                </div>
                                <input type="file" class="hidden-file-input" accept="image/*">
                            </div>
                            
                            <div class="image-slot tertiary-slot" data-slot="tertiary">
                                <div class="slot-content">
                                    <div class="slot-placeholder">
                                        <div class="upload-icon">🔖</div>
                                        <div class="slot-label">Bottom Corner</div>
                                        <div class="slot-hint">Small overlay</div>
                                    </div>
                                </div>
                                <input type="file" class="hidden-file-input" accept="image/*">
                            </div>
                        </div>
                    </div>
                    
                    <!-- Key Properties Section -->
                    <div class="key-properties-section">
                        <h3>Properties</h3>
                        <div class="property-group">
                            <label for="palette-key-label-input">Text Label</label>
                            <input type="text" id="palette-key-label-input" placeholder="Fallback text (optional)">
                        </div>
                        
                        <div class="property-group">
                            <label for="palette-key-description-input">Description</label>
                            <input type="text" id="palette-key-description-input" placeholder="Tooltip description">
                        </div>
                        
                        <div class="property-group">
                            <label for="palette-key-color-input">Background Color</label>
                            <div class="color-input-wrapper">
                                <input type="color" id="palette-key-color-input">
                                <span class="color-label"></span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" id="cancel-palette-key-edit" class="btn-secondary">Cancel</button>
                    <button type="button" id="save-palette-key-edit" class="btn-primary">Save Changes</button>
                </div>
            </div>
        </div>
        
        <!-- Add Layer Modal -->
        <div id="add-layer-modal" class="modal secondary-modal" style="display: none;">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Add Custom Layer</h2>
                <form id="add-layer-form">
                    <div class="form-group">
                        <label for="layer-name">Layer Name:</label>
                        <input type="text" id="layer-name" name="name" required placeholder="e.g., Gaming, Coding">
                    </div>
                    <div class="form-actions">
                        <button type="button" id="cancel-add-layer">Cancel</button>
                        <button type="submit">Add Layer</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Add Custom Modifier Modal -->
        <div id="add-modifier-modal" class="modal secondary-modal" style="display: none;">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Add Custom Modifier</h2>
                <form id="add-modifier-form">
                    <div class="form-group">
                        <label for="modifier-name">Modifier Name:</label>
                        <input type="text" id="modifier-name" name="name" required placeholder="e.g., Fn, Hyper, Meta" maxlength="8">
                        <small class="help-text">Max 8 characters for button display</small>
                    </div>
                    <div class="form-group">
                        <label for="modifier-color">Button Color:</label>
                        <div class="modifier-color-selector">
                            <div class="color-preview-button" id="modifier-color-preview">
                                <span class="color-preview-text">#8b5cf6</span>
                                <span class="color-preview-hint">Click to change color</span>
                            </div>
                            <input type="color" id="modifier-color" value="#8b5cf6">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" id="cancel-add-modifier">Cancel</button>
                        <button type="submit">Add Modifier</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Settings Modal -->
        <div id="settings-modal" class="modal primary-modal" style="display: none;">
            <div class="modal-content settings-content">
                <span class="close">&times;</span>
                <h2>Settings</h2>
                
                <div class="settings-section">
                    <h3>Keyboard Type</h3>
                    <div id="settings-keyboard-type-selector" class="keyboard-type-selector">
                        <!-- Will be populated by JavaScript -->
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3>Layer Management</h3>
                    <div class="layer-controls">
                        <button id="settings-add-layer-btn" class="btn-secondary">+ Add Layer</button>
                        <button id="settings-remove-layer-btn" class="btn-secondary">- Remove Layer</button>
                    </div>
                    <small class="help-text">Add custom layers or remove existing ones (base layers cannot be removed)</small>
                </div>
                
                <div class="settings-section">
                    <h3>Modifier Colors</h3>
                    <p class="section-description">Customize the colors of modifier buttons</p>
                    <button id="settings-toggle-color-customization" class="btn-secondary">🎨 Customize Colors</button>
                    <div id="settings-color-customization-panel" class="color-panel" style="display: none;">
                        <div id="settings-modifier-color-controls"></div>
                        <button id="settings-reset-colors" class="btn-secondary" style="margin-top: 1rem;">Reset to Default</button>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Profile Management Modal -->
        <div id="profile-management-modal" class="modal primary-modal" style="display: none;">
            <div class="modal-content profile-management-content">
                <span class="close">&times;</span>
                <h2>Profile Management</h2>
                
                <div class="profiles-grid" id="profiles-grid">
                    <!-- Profile items will be populated here -->
                </div>
                
                <div class="profile-actions">
                    <button type="button" id="add-new-profile-btn" class="btn-primary">+ Add New Profile</button>
                </div>
            </div>
        </div>
        
        <!-- Add New Profile Modal -->
        <div id="add-profile-modal" class="modal secondary-modal" style="display: none;">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Create New Profile</h2>
                <form id="add-profile-form">
                    <div class="profile-preview">
                        <div class="profile-preview-key" id="add-profile-preview-key">
                            <span id="add-profile-preview-text">P</span>
                        </div>
                        <p class="profile-preview-label">Preview</p>
                    </div>
                    <div class="form-group">
                        <label for="profile-name-input">Profile Name:</label>
                        <input type="text" id="profile-name-input" name="name" required placeholder="e.g., Gaming, Work, VS Code">
                    </div>
                    <div class="form-group">
                        <label for="profile-color-input">Background Color:</label>
                        <div class="color-input-wrapper">
                            <input type="color" id="profile-color-input" value="#6366f1">
                            <span class="color-label" id="add-color-label">#6366f1</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="add-profile-icon-input">Icon Image:</label>
                        <div class="icon-upload-wrapper">
                            <input type="file" id="add-profile-icon-input" accept="image/*">
                            <button type="button" id="remove-add-profile-icon" class="btn-secondary" style="display: none;">Remove Image</button>
                        </div>
                        <p class="help-text">Upload a custom image for this profile (optional)</p>
                    </div>
                    <div class="form-actions">
                        <button type="button" id="cancel-add-profile">Cancel</button>
                        <button type="submit">Create Profile</button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- Edit Profile Modal -->
        <div id="edit-profile-modal" class="modal secondary-modal" style="display: none;">
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>Edit Profile</h2>
                <form id="edit-profile-form">
                    <div class="profile-preview">
                        <div class="profile-preview-key" id="profile-preview-key">
                            <span id="profile-preview-text">P</span>
                        </div>
                        <p class="profile-preview-label">Preview</p>
                    </div>
                    <div class="form-group">
                        <label for="edit-profile-name-input">Profile Name:</label>
                        <input type="text" id="edit-profile-name-input" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-profile-color-input">Background Color:</label>
                        <div class="color-input-wrapper">
                            <input type="color" id="edit-profile-color-input" value="#6366f1">
                            <span class="color-label" id="edit-color-label">#6366f1</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit-profile-icon-input">Icon Image:</label>
                        <div class="icon-upload-wrapper">
                            <input type="file" id="edit-profile-icon-input" accept="image/*">
                            <button type="button" id="remove-profile-icon" class="btn-secondary" style="display: none;">Remove Image</button>
                        </div>
                        <p class="help-text">Upload a custom image for this profile (optional)</p>
                    </div>
                    <div class="form-actions">
                        <button type="button" id="delete-profile-btn" class="btn-danger" style="margin-right: auto;">Delete Profile</button>
                        <button type="button" id="cancel-edit-profile">Cancel</button>
                        <button type="submit">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Setup dynamic scaling
    window.updateScale = setupDynamicScaling();
    
    // Set up modal controls
    setupModalControls();
}

function renderKeyboardTypeSelector() {
    const container = document.getElementById('keyboard-type-selector');
    if (!container) return;
    
    container.innerHTML = `
        <label for="keyboard-type-select">Keyboard Type:</label>
        <select id="keyboard-type-select">
            <option value="corne" ${currentKeyboardType === 'corne' ? 'selected' : ''}>Corne (Split 42-key)</option>
            <option value="tenkeyless" ${currentKeyboardType === 'tenkeyless' ? 'selected' : ''}>Tenkeyless (87-key)</option>
        </select>
    `;
    
    // Add change handler
    document.getElementById('keyboard-type-select').onchange = async (e) => {
        try {
            await SetKeyboardType(e.target.value);
            currentKeyboardType = e.target.value;
            await loadCurrentLayer();
            await loadLayers();
            renderKeyboard();
            renderLayerSelector();
            renderModifierPanel();
        } catch (error) {
            console.error('Failed to change keyboard type:', error);
        }
    };
}

function setupModalControls() {
    const keyModal = document.getElementById('key-editor-modal');
    const layerModal = document.getElementById('add-layer-modal');
    const paletteModal = document.getElementById('key-palette-modal');
    const paletteKeyEditorModal = document.getElementById('palette-key-editor-modal');
    const modifierModal = document.getElementById('add-modifier-modal');
    const settingsModal = document.getElementById('settings-modal');
    const closeBtns = document.querySelectorAll('.close');
    const cancelEditBtn = document.getElementById('cancel-key-edit');
    const saveEditBtn = document.getElementById('save-key-edit');
    const openPaletteBtn = document.getElementById('open-palette-btn');
    const addToPaletteBtn = document.getElementById('add-to-palette-btn');
    const cancelAddLayerBtn = document.getElementById('cancel-add-layer');
    const cancelAddModifierBtn = document.getElementById('cancel-add-modifier');
    const cancelPaletteKeyEditBtn = document.getElementById('cancel-palette-key-edit');
    const savePaletteKeyEditBtn = document.getElementById('save-palette-key-edit');
    
    // Close button handlers
    closeBtns.forEach(btn => {
        btn.onclick = () => {
            keyModal.style.display = 'none';
            layerModal.style.display = 'none';
            paletteModal.style.display = 'none';
            modifierModal.style.display = 'none';
            settingsModal.style.display = 'none';
            paletteKeyEditorModal.style.display = 'none';
        };
    });
    
    // Cancel button handlers
    cancelEditBtn.onclick = () => {
        keyModal.style.display = 'none';
        paletteModal.style.display = 'none';
    };
    cancelAddLayerBtn.onclick = () => layerModal.style.display = 'none';
    cancelAddModifierBtn.onclick = () => modifierModal.style.display = 'none';
    cancelPaletteKeyEditBtn.onclick = () => {
        paletteKeyEditorModal.style.display = 'none';
        resetPaletteKeyEditorHandlerFlags();
    };
    
    // Save button handler
    saveEditBtn.onclick = async () => {
        await saveKeyEdit();
    };
    
    // Save palette key edit button handler
    savePaletteKeyEditBtn.onclick = async () => {
        await savePaletteKeyEdit();
    };
    
    // Open palette button handler
    openPaletteBtn.onclick = () => {
        showKeyPalette();
    };
    
    // Add to palette button handler
    addToPaletteBtn.onclick = () => {
        addCurrentKeyToPalette();
    };
    
    // Setup image slot handlers
    setupImageSlotHandlers();
    
    // Click outside to close
    window.onclick = (event) => {
        if (event.target === keyModal) {
            keyModal.style.display = 'none';
            paletteModal.style.display = 'none';
        }
        if (event.target === layerModal) layerModal.style.display = 'none';
        if (event.target === paletteModal) paletteModal.style.display = 'none';
        if (event.target === paletteKeyEditorModal) {
        paletteKeyEditorModal.style.display = 'none';
        resetPaletteKeyEditorHandlerFlags();
    }
        if (event.target === modifierModal) modifierModal.style.display = 'none';
        if (event.target === settingsModal) settingsModal.style.display = 'none';
    };
    
    // Form submission handlers
    document.getElementById('add-layer-form').onsubmit = async (e) => {
        e.preventDefault();
        await addCustomLayer();
    };
    
    document.getElementById('add-modifier-form').onsubmit = (e) => {
        e.preventDefault();
        addCustomModifier();
    };
    
    // Setup color preview button for modifier modal
    const modifierColorInput = document.getElementById('modifier-color');
    const modifierColorPreview = document.getElementById('modifier-color-preview');
    const modifierColorText = modifierColorPreview?.querySelector('.color-preview-text');
    
    if (modifierColorInput && modifierColorPreview && modifierColorText) {
        // Update preview when color changes
        modifierColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            modifierColorText.textContent = color;
            modifierColorPreview.style.backgroundColor = color;
            modifierColorPreview.style.color = getContrastColor(color);
        });
        
        // Set initial preview color
        const initialColor = modifierColorInput.value;
        modifierColorPreview.style.backgroundColor = initialColor;
        modifierColorPreview.style.color = getContrastColor(initialColor);
    }
    
    // Settings button handler
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.onclick = () => {
            settingsModal.style.display = 'block';
            setupSettingsModal(); // Initialize settings content when opened
        };
    }
    
    // Setup color customization controls
    setupColorCustomization();
    
    // Setup persistent palette
    setupPersistentPalette();
    
    // Setup profile management
    setupProfileManagement();
}

function setupSettingsModal() {
    // Setup keyboard type selector in settings
    const settingsKeyboardSelector = document.getElementById('settings-keyboard-type-selector');
    if (settingsKeyboardSelector) {
        settingsKeyboardSelector.innerHTML = `
            <label for="settings-keyboard-type-select">Keyboard Type:</label>
            <select id="settings-keyboard-type-select">
                <option value="corne" ${currentKeyboardType === 'corne' ? 'selected' : ''}>Corne (Split 42-key)</option>
                <option value="tenkeyless" ${currentKeyboardType === 'tenkeyless' ? 'selected' : ''}>Tenkeyless (87-key)</option>
            </select>
        `;
        
        // Add change handler for keyboard type in settings
        document.getElementById('settings-keyboard-type-select').onchange = async (e) => {
            try {
                await SetKeyboardType(e.target.value);
                currentKeyboardType = e.target.value;
                await loadCurrentLayer();
                await loadLayers();
                renderKeyboard();
                renderLayerSelector();
                renderModifierPanel();
                
                // Update layer management section based on keyboard type
                updateLayerManagementSection();
            } catch (error) {
                console.error('Failed to change keyboard type:', error);
            }
        };
    }
    
    // Initialize layer management section based on current keyboard type
    updateLayerManagementSection();
    
    // Setup color customization in settings
    setupSettingsColorCustomization();
}

function updateLayerManagementSection() {
    const layerControlsContainer = document.querySelector('.settings-section .layer-controls');
    const layerHelpText = document.querySelector('.settings-section .help-text');
    
    if (!layerControlsContainer || !layerHelpText) return;
    
    if (currentKeyboardType === 'tenkeyless') {
        // Disable layer management for tenkeyless
        layerControlsContainer.innerHTML = `
            <button id="settings-add-layer-btn" class="btn-secondary" disabled title="Tenkeyless keyboards only support the base layer">+ Add Layer (Disabled)</button>
            <button id="settings-remove-layer-btn" class="btn-secondary" disabled title="Tenkeyless keyboards only support the base layer">- Remove Layer (Disabled)</button>
        `;
        layerHelpText.textContent = 'Tenkeyless keyboards only support a single base layer. Layer management is not available.';
        layerHelpText.style.color = '#999';
    } else {
        // Enable layer management for Corne
        layerControlsContainer.innerHTML = `
            <button id="settings-add-layer-btn" class="btn-secondary">+ Add Layer</button>
            <button id="settings-remove-layer-btn" class="btn-secondary">- Remove Layer</button>
        `;
        layerHelpText.textContent = 'Add custom layers or remove existing ones (base layers cannot be removed)';
        layerHelpText.style.color = '#6c757d';
        
        // Re-setup event handlers for enabled buttons
        setupLayerManagementHandlers();
    }
}

function setupLayerManagementHandlers() {
    const settingsAddLayerBtn = document.getElementById('settings-add-layer-btn');
    const settingsRemoveLayerBtn = document.getElementById('settings-remove-layer-btn');
    const layerModal = document.getElementById('add-layer-modal');
    
    if (settingsAddLayerBtn && !settingsAddLayerBtn.disabled) {
        settingsAddLayerBtn.onclick = () => {
            layerModal.style.display = 'block';
        };
    }
    
    if (settingsRemoveLayerBtn && !settingsRemoveLayerBtn.disabled) {
        settingsRemoveLayerBtn.onclick = async () => {
            if (currentLayer !== 'base' && currentLayer !== 'lower' && currentLayer !== 'raise') {
                if (confirm(`Are you sure you want to remove the "${currentLayer}" layer?`)) {
                    try {
                        const layerToRemove = currentLayer;
                        await RemoveCustomLayer(layerToRemove);
                        
                        // Reload the available layers
                        await loadLayers();
                        
                        // If we removed the current layer, switch to base layer
                        if (currentLayer === layerToRemove) {
                            currentLayer = 'base';
                            await SetCurrentLayer('base');
                        }
                        
                        // Refresh the UI
                        await loadCurrentLayer();
                        renderLayerSelector();
                        renderKeyboard();
                        
                    } catch (error) {
                        console.error('Failed to remove layer:', error);
                        alert('Failed to remove layer: ' + error);
                    }
                }
            } else {
                alert('Cannot remove built-in layers (base, lower, raise)');
            }
        };
    }
}

function setupSettingsColorCustomization() {
    const toggleBtn = document.getElementById('settings-toggle-color-customization');
    const panel = document.getElementById('settings-color-customization-panel');
    const controlsContainer = document.getElementById('settings-modifier-color-controls');
    const resetBtn = document.getElementById('settings-reset-colors');
    
    if (toggleBtn && panel && controlsContainer && resetBtn) {
        // Toggle color panel visibility
        toggleBtn.onclick = () => {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            toggleBtn.textContent = isVisible ? '🎨 Customize Colors' : '🎨 Hide Colors';
            
            if (!isVisible) {
                renderSettingsColorControls();
            }
        };
        
        // Reset to default colors
        resetBtn.onclick = () => {
            customModifierColors = {
                ctrl: '#ff6b6b',
                shift: '#51cf66',
                alt: '#ffd43b',
                gui: '#339af0'
            };
            saveCustomColors();
            renderSettingsColorControls();
            renderModifierPanel(); // Update the main modifier buttons
        };
    }
}

function renderSettingsColorControls() {
    const container = document.getElementById('settings-modifier-color-controls');
    if (!container) return;
    
    // Ensure availableModifiers is an array
    if (!Array.isArray(availableModifiers)) {
        console.warn('availableModifiers is not an array in renderSettingsColorControls:', availableModifiers);
        availableModifiers = ['ctrl', 'shift', 'alt', 'gui'];
    }
    
    container.innerHTML = availableModifiers.map(modifier => {
        const color = customModifierColors[modifier] || '#666666';
        // Ensure modifier is a string before using string methods
        const safeModifier = String(modifier || '');
        const modifierName = safeModifier.charAt(0).toUpperCase() + safeModifier.slice(1);
        
        return `
            <div class="color-control-group">
                <label class="color-control-label">${modifierName}</label>
                <div class="color-inputs">
                    <div class="color-input-item">
                        <input type="color" 
                               class="color-picker" 
                               data-modifier="${modifier}"
                               value="${color}">
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add change handlers to color pickers
    container.querySelectorAll('.color-picker').forEach(picker => {
        picker.onchange = (e) => {
            const modifier = e.target.dataset.modifier;
            const color = e.target.value;
            
            customModifierColors[modifier] = color;
            saveCustomColors();
            renderModifierPanel(); // Update the main modifier buttons immediately
        };
    });
}

function setupColorCustomization() {
    const toggleBtn = document.getElementById('toggle-color-customization');
    const panel = document.getElementById('color-customization-panel');
    const controlsContainer = document.getElementById('modifier-color-controls');
    const resetBtn = document.getElementById('reset-colors');
    
    // Load custom colors from localStorage (this should always work)
    loadCustomColors();
    loadCustomModifiers();
    
    // Only set up event handlers if the elements exist (they may not exist anymore since we moved them to settings)
    if (toggleBtn && panel && controlsContainer && resetBtn) {
        // Toggle color panel visibility
        toggleBtn.onclick = () => {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'block';
            toggleBtn.textContent = isVisible ? '🎨 Customize Colors' : '🎨 Hide Colors';
            
            if (!isVisible) {
                renderColorControls();
            }
        };
        
        // Reset to default colors
        resetBtn.onclick = () => {
            customModifierColors = {
                ctrl: '#ff6b6b',
                shift: '#51cf66',
                alt: '#ffd43b',
                gui: '#339af0'
            };
            saveCustomColors();
            renderColorControls();
            renderModifierPanel(); // Update the buttons
        };
    }
}

function renderColorControls() {
    const container = document.getElementById('modifier-color-controls');
    
    // Return early if container doesn't exist (it was moved to settings modal)
    if (!container) {
        return;
    }
    
    // Ensure availableModifiers is an array
    if (!Array.isArray(availableModifiers)) {
        console.warn('availableModifiers is not an array in renderColorControls:', availableModifiers);
        availableModifiers = ['ctrl', 'shift', 'alt', 'gui'];
    }
    
    container.innerHTML = availableModifiers.map(modifier => {
        const color = customModifierColors[modifier] || '#666666';
        // Ensure modifier is a string before using string methods
        const safeModifier = String(modifier || '');
        const modifierName = safeModifier.charAt(0).toUpperCase() + safeModifier.slice(1);
        
        return `
            <div class="color-control-group">
                <label class="color-control-label">${modifierName}</label>
                <div class="color-inputs">
                    <div class="color-input-item">
                        <input type="color" 
                               class="color-picker" 
                               data-modifier="${modifier}"
                               value="${color}">
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add change handlers to color pickers
    container.querySelectorAll('.color-picker').forEach(picker => {
        picker.onchange = (e) => {
            const modifier = e.target.dataset.modifier;
            const color = e.target.value;
            
            customModifierColors[modifier] = color;
            saveCustomColors();
            renderModifierPanel(); // Update the buttons immediately
        };
    });
}

function loadCustomColors() {
    try {
        const saved = localStorage.getItem('customModifierColors');
        if (saved) {
            customModifierColors = { ...customModifierColors, ...JSON.parse(saved) };
        }
    } catch (error) {
        console.error('Failed to load custom colors:', error);
    }
}

function saveCustomColors() {
    try {
        localStorage.setItem('customModifierColors', JSON.stringify(customModifierColors));
        localStorage.setItem('customModifiers', JSON.stringify(customModifiers));
    } catch (error) {
        console.error('Failed to save custom colors:', error);
    }
}

function showAddModifierModal() {
    const modal = document.getElementById('add-modifier-modal');
    const colorInput = document.getElementById('modifier-color');
    const colorPreview = document.getElementById('modifier-color-preview');
    const colorText = colorPreview?.querySelector('.color-preview-text');
    
    // Reset form
    document.getElementById('modifier-name').value = '';
    const defaultColor = '#8b5cf6';
    colorInput.value = defaultColor;
    
    // Update color preview
    if (colorPreview && colorText) {
        colorText.textContent = defaultColor;
        colorPreview.style.backgroundColor = defaultColor;
        colorPreview.style.color = getContrastColor(defaultColor);
    }
    
    modal.style.display = 'block';
}

function addCustomModifier() {
    const name = document.getElementById('modifier-name').value.trim().toLowerCase();
    const color = document.getElementById('modifier-color').value;
    
    if (!name) {
        alert('Please enter a modifier name');
        return;
    }
    
    // Check if name already exists
    const allExistingNames = [...availableModifiers, ...customModifiers.map(m => m.name)];
    if (allExistingNames.includes(name)) {
        alert('A modifier with this name already exists');
        return;
    }
    
    // Add new custom modifier
    customModifiers.push({ name, color });
    saveCustomColors();
    
    // Close modal and refresh UI
    document.getElementById('add-modifier-modal').style.display = 'none';
    renderModifierPanel();
}

function loadCustomModifiers() {
    try {
        const saved = localStorage.getItem('customModifiers');
        if (saved) {
            customModifiers = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Failed to load custom modifiers:', error);
        customModifiers = [];
    }
}

function deleteCustomModifier(modifierName) {
    if (!confirm(`Are you sure you want to delete the "${modifierName}" modifier? This cannot be undone.`)) {
        return;
    }
    
    // Remove from customModifiers array
    customModifiers = customModifiers.filter(mod => mod.name !== modifierName);
    
    // Remove from activeModifiers if it's currently active
    const activeIndex = activeModifiers.indexOf(modifierName);
    if (activeIndex > -1) {
        activeModifiers.splice(activeIndex, 1);
        // Update backend with new active modifiers
        SetActiveModifiers(JSON.stringify(activeModifiers)).catch(error => {
            console.error('Failed to update active modifiers:', error);
        });
    }
    
    // Save updated customModifiers to localStorage
    saveCustomColors();
    
    // Refresh UI
    renderModifierPanel();
}

function setupImageSlotHandlers() {
    const imageSlots = document.querySelectorAll('.image-slot');
    
    imageSlots.forEach(slot => {
        const slotType = slot.dataset.slot;
        const fileInput = slot.querySelector('.hidden-file-input');
        const slotContent = slot.querySelector('.slot-content');
        
        // Click to upload
        slot.addEventListener('click', () => {
            fileInput.click();
        });
        
        // File input change handler
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleImageFile(file, slot, slotType);
            }
        });
        
        // Drag and drop handlers
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.classList.add('drag-over');
        });
        
        slot.addEventListener('dragleave', () => {
            slot.classList.remove('drag-over');
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    handleImageFile(file, slot, slotType);
                } else {
                    alert('Please drop an image file');
                }
            }
        });
    });
}

function showPaletteKeyEditor(keyData) {
    const modal = document.getElementById('palette-key-editor-modal');
    
    // Extract extra data from description
    let extraData = {};
    let userDescription = '';
    if (keyData.description) {
        try {
            extraData = JSON.parse(keyData.description);
            userDescription = extraData.userDescription || '';
        } catch (e) {
            // Not JSON, treat as plain text description
            userDescription = keyData.description;
            extraData = {};
        }
    }
    
    // Populate form fields with current values
    document.getElementById('palette-key-label-input').value = keyData.label || '';
    document.getElementById('palette-key-description-input').value = userDescription;
    document.getElementById('palette-key-color-input').value = keyData.color || '#ffffff';
    
    // Update color label
    const colorLabel = document.querySelector('#palette-key-editor-modal .color-label');
    if (colorLabel) {
        colorLabel.textContent = keyData.color || '#ffffff';
    }
    
    // Remove any existing event listeners and add new color input change handler
    const colorInput = document.getElementById('palette-key-color-input');
    colorInput.replaceWith(colorInput.cloneNode(true));
    const newColorInput = document.getElementById('palette-key-color-input');
    newColorInput.value = keyData.color || '#ffffff';
    newColorInput.addEventListener('input', (e) => {
        colorLabel.textContent = e.target.value;
    });
    
    // Clear any existing image data in the modal
    clearModalData(modal);
    
    // Update image slots directly (bypassing the display check)
    updatePaletteKeyEditorImageSlot('primary', keyData.imageData);
    updatePaletteKeyEditorImageSlot('secondary', extraData.secondaryImageData);
    updatePaletteKeyEditorImageSlot('tertiary', extraData.tertiaryImageData);
    
    // Store the key ID for saving
    modal.dataset.editingKeyData = JSON.stringify(keyData);
    
    // Show the modal
    modal.style.display = 'block';
    
    // Setup image slot handlers for this modal
    setupPaletteKeyEditorImageSlots();
}

function setupPaletteKeyEditorImageSlots() {
    // Only set up if not already set up
    const primarySlot = document.querySelector('#palette-key-editor-modal .image-slot.primary-slot');
    if (primarySlot && !primarySlot.dataset.handlersSetup) {
        setupImageSlotHandlersForPaletteEditor();
        primarySlot.dataset.handlersSetup = 'true';
    }
}

function resetPaletteKeyEditorHandlerFlags() {
    const imageSlots = document.querySelectorAll('#palette-key-editor-modal .image-slot');
    imageSlots.forEach(slot => {
        // Reset the handler setup flag
        delete slot.dataset.handlersSetup;
    });
}

function setupImageSlotHandlersForPaletteEditor() {
    const imageSlots = document.querySelectorAll('#palette-key-editor-modal .image-slot');
    
    imageSlots.forEach(slot => {
        const slotType = slot.dataset.slot;
        const fileInput = slot.querySelector('.hidden-file-input');
        
        // Click to upload
        slot.addEventListener('click', (e) => {
            // Prevent multiple triggers
            if (e.target !== slot) return;
            fileInput.click();
        });
        
        // File input change handler
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleImageFile(file, slot, slotType);
            }
            // Clear the input to allow selecting the same file again
            e.target.value = '';
        });
        
        // Drag and drop handlers
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.classList.add('drag-over');
        });
        
        slot.addEventListener('dragleave', (e) => {
            // Only remove class if we're actually leaving the element
            if (!slot.contains(e.relatedTarget)) {
                slot.classList.remove('drag-over');
            }
        });
        
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    handleImageFile(file, slot, slotType);
                } else {
                    alert('Please drop an image file');
                }
            }
        });
    });
}

function handleImageFile(file, slot, slotType) {
    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;
        
        // Update the slot display
        updateSlotImage(slot, imageData, slotType);
        
        // Store for saving in the active modal
        let modal = null;
        const keyEditorModal = document.getElementById('key-editor-modal');
        const paletteKeyEditorModal = document.getElementById('palette-key-editor-modal');
        
        // Check which modal is currently active
        if (keyEditorModal && keyEditorModal.style.display !== 'none') {
            modal = keyEditorModal;
        } else if (paletteKeyEditorModal && paletteKeyEditorModal.style.display !== 'none') {
            modal = paletteKeyEditorModal;
        }
        
        // Fallback to key editor modal if neither is definitely active
        if (!modal) {
            modal = keyEditorModal || paletteKeyEditorModal;
        }
        
        if (modal) {
            // Ensure slotType is a string before using string methods
            const safeSlotType = String(slotType || '');
            const capitalizedSlotType = safeSlotType.charAt(0).toUpperCase() + safeSlotType.slice(1);
            modal.dataset[`pending${capitalizedSlotType}ImageData`] = imageData;
        }
    };
    reader.readAsDataURL(file);
}

function updateSlotImage(slot, imageData, slotType) {
    const slotContent = slot.querySelector('.slot-content');
    
    // Clear existing content
    slotContent.innerHTML = '';
    
    // Add the image
    const img = document.createElement('img');
    img.src = imageData;
    img.className = 'slot-image';
    img.alt = `${slotType} image`;
    slotContent.appendChild(img);
    
    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'slot-remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove image';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        clearSlotImage(slot, slotType);
    };
    slotContent.appendChild(removeBtn);
    
    // Mark as having image
    slot.classList.add('has-image');
}

function clearSlotImage(slot, slotType) {
    const slotContent = slot.querySelector('.slot-content');
    
    // Restore placeholder
    const iconMap = {
        primary: '📸',
        secondary: '🏷️',
        tertiary: '🔖'
    };
    
    const labelMap = {
        primary: 'Main Image',
        secondary: 'Top Corner',
        tertiary: 'Bottom Corner'
    };
    
    slotContent.innerHTML = `
        <div class="slot-placeholder">
            <div class="upload-icon">${iconMap[slotType]}</div>
            <div class="slot-label">${labelMap[slotType]}</div>
            <div class="slot-hint">Click or drop image</div>
        </div>
    `;
    
    // Remove class and clear data
    slot.classList.remove('has-image');
    
    // Work with the active modal
    let modal = null;
    const keyEditorModal = document.getElementById('key-editor-modal');
    const paletteKeyEditorModal = document.getElementById('palette-key-editor-modal');
    
    // Check which modal is currently active
    if (keyEditorModal && keyEditorModal.style.display !== 'none') {
        modal = keyEditorModal;
    } else if (paletteKeyEditorModal && paletteKeyEditorModal.style.display !== 'none') {
        modal = paletteKeyEditorModal;
    }
    
    // Fallback to key editor modal if neither is definitely active
    if (!modal) {
        modal = keyEditorModal || paletteKeyEditorModal;
    }
    
    if (modal) {
        // Ensure slotType is a string before using string methods
        const safeSlotType = String(slotType || '');
        const capitalizedSlotType = safeSlotType.charAt(0).toUpperCase() + safeSlotType.slice(1);
        const dataKey = `pending${capitalizedSlotType}ImageData`;
        delete modal.dataset[dataKey];
        
        // Mark for removal if it was previously saved
        const removeKey = `remove${capitalizedSlotType}`;
        modal.dataset[removeKey] = 'true';
    }
}


function setupDynamicScaling() {
    function updateScale() {
        const keyboardLayout = document.getElementById('keyboard-layout');
        const container = document.getElementById('keyboard-container');
        
        if (!keyboardLayout || !container) return;
        
        // Reset any existing transform to get natural dimensions
        keyboardLayout.style.transform = '';
        
        // Small delay to ensure layout is calculated
        setTimeout(() => {
            const layoutRect = keyboardLayout.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            // Calculate available space (minimal padding)
            const availableWidth = containerRect.width - 10;
            const availableHeight = containerRect.height - 10;
            
            if (layoutRect.width === 0 || layoutRect.height === 0) return;
            
            // Calculate scale factors
            const scaleX = availableWidth / layoutRect.width;
            const scaleY = availableHeight / layoutRect.height;
            
            // Use the smaller scale, but allow much larger scaling for high-res screens
            // Base scale on screen size - much higher limits for 1440p and 4K
            const screenWidth = window.innerWidth;
            let maxScale = 2.5; // Default for 1080p
            
            if (screenWidth >= 3840) {
                maxScale = 6.0; // 4K screens
            } else if (screenWidth >= 2560) {
                maxScale = 4.5; // 1440p screens
            } else if (screenWidth >= 1920) {
                maxScale = 3.0; // 1080p screens
            }
            
            const scale = Math.min(scaleX, scaleY, maxScale);
            
            // Apply the scale
            keyboardLayout.style.transform = `scale(${scale})`;
            keyboardLayout.style.transformOrigin = 'center center';
        }, 10);
    }
    
    // Update scale on window resize with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateScale, 50); // Faster response
    });
    
    // Initial scale update
    setTimeout(updateScale, 200);
    
    return updateScale;
}

function renderKeyboard() {
    const container = document.getElementById('keyboard-layout');
    if (!container || !currentKeys || !currentKeys.length) return;
    
    if (currentKeyboardType === 'tenkeyless') {
        renderTenkeylessKeyboard(container);
    } else {
        renderCorneKeyboard(container);
    }
    
    // Add click handlers to keys
    addKeyClickHandlers();
    
    // Update dynamic scaling after rendering
    if (window.updateScale) {
        setTimeout(window.updateScale, 50);
    }
}

function renderCorneKeyboard(container) {
    // Use absolute positioning for Corne layout like tenkeyless
    container.innerHTML = `
        <div class="keyboard-corne">
            <div class="corne-grid">
                ${renderAllCorneKeys(currentKeys)}
            </div>
        </div>
    `;
}

function renderAllCorneKeys(keys) {
    console.log('Rendering Corne keys:', keys.length, 'keys found');
    console.log('Sample keys:', keys.slice(0, 5).map(k => `${k.id}: ${k.label} (${k.row},${k.col},${k.side})`));
    
    return keys.map(key => {
        let keyContent = '';
        if (key.imageData && key.imageData.startsWith('data:image/')) {
            keyContent = `<img class=\"key-image\" src=\"${key.imageData}\" alt=\"${escapeHtml(key.label || 'Key image')}\" />`;
        } else if (key.label && key.label.trim() !== '') {
            keyContent = `<span class=\"key-label\">${escapeHtml(key.label)}</span>`;
        } else {
            keyContent = `<span class=\"key-placeholder\"></span>`;
        }
        
        // Extract extra data from description
        let extraData = {};
        if (key.description) {
            try {
                extraData = JSON.parse(key.description);
            } catch (e) {
                extraData = { userDescription: key.description };
            }
        }
        
        // Add overlay images
        let overlayImages = '';
        if (extraData.secondaryImageData) {
            overlayImages += `<img class=\"key-secondary-image\" src=\"${extraData.secondaryImageData}\" alt=\"Secondary image\" />`;
        }
        if (extraData.tertiaryImageData) {
            overlayImages += `<img class=\"key-tertiary-image\" src=\"${extraData.tertiaryImageData}\" alt=\"Tertiary image\" />`;
        }
        
        // Calculate position based on row, col, and side with proper spacing
        const keyWidth = 80;  // 4rem keys
        const keyHeight = 80; // 4rem keys
        
        let left, top;
        
        if (key.side === 'left') {
            // Left hand positioning
            left = key.col * keyWidth;
            top = key.row * keyHeight + 40; // Added 40px offset to lower the keyboard
            
            // Apply column stagger for left hand
            if (key.col === 2) top -= 13;       // Middle finger column slightly higher
            if (key.col === 3) top -= 27;       // Ring finger column higher
            if (key.col === 4) top -= 13;       // Pinky column slightly higher
            if (key.col === 5) top -= 0;        // Outer column normal
            
            // Thumb key positioning
            if (key.keyType.includes('thumb')) {
                const thumbIndex = key.col;
                if (thumbIndex === 0) { left = 293; top = 273; } // Lowered by 40px
                if (thumbIndex === 1) { left = 373; top = 287; } // Lowered by 40px
                if (thumbIndex === 2) { left = 453; top = 287; } // Lowered by 40px
            }
        } else {
            // Right hand positioning - offset to the right
            const rightHandOffset = 700; // Increased gap between hands (was 600)
            left = rightHandOffset + key.col * keyWidth;
            top = key.row * keyHeight + 40; // Added 40px offset to lower the keyboard
            
            // Apply column stagger for right hand (mirrored)
            if (key.col === 0) top -= 0;        // Outer column normal
            if (key.col === 1) top -= 13;       // Pinky column slightly higher
            if (key.col === 2) top -= 27;       // Ring finger column higher
            if (key.col === 3) top -= 13;       // Middle finger column slightly higher
            if (key.col === 4) top -= 0;        // Index finger normal
            if (key.col === 5) top -= 0;        // Index finger normal
            
            // Thumb key positioning
            if (key.keyType.includes('thumb')) {
                const thumbIndex = key.col;
                if (thumbIndex === 0) { left = rightHandOffset - 53; top = 287; } // Lowered by 40px
                if (thumbIndex === 1) { left = rightHandOffset + 27; top = 287; } // Lowered by 40px
                if (thumbIndex === 2) { left = rightHandOffset + 107; top = 273; } // Lowered by 40px
            }
        }
        
        // Get tooltip text from description
        let tooltipText = 'Click to add image';
        if (key.label && key.label.trim() !== '') {
            tooltipText = key.label;
        }
        if (extraData.userDescription) {
            tooltipText = extraData.userDescription;
        }
        
        // Special styling for different key types
        let keyClass = `key ${key.keyType}`;
        let backgroundColor = key.color || '#ffffff';
        
        // Use light grey for blank keys
        if (isBlankKey(key)) {
            backgroundColor = '#e0e0e0';
        }
        
        let keyStyle = `background-color: ${backgroundColor}; left: ${left}px; top: ${top}px; position: absolute;`;
        
        // Apply rotations for thumb keys
        if (key.id === 'L32') keyStyle += ' transform: rotate(25deg);';  // Left spacebar thumb
        if (key.id === 'R30') keyStyle += ' transform: rotate(-25deg);'; // Right enter thumb
        if (key.id === 'L31') keyStyle += ' transform: rotate(10deg);';  // Left lower thumb
        if (key.id === 'R31') keyStyle += ' transform: rotate(-10deg);'; // Right raise thumb
        
        return `
            <div class=\"${keyClass}\" 
                 data-key-id=\"${key.id}\" 
                 style=\"${keyStyle}\"
                 title=\"${tooltipText}\">
                ${keyContent}
                ${overlayImages}
            </div>
        `;
    }).join('');
}

function renderTenkeylessKeyboard(container) {
    // For tenkeyless, we need to render ALL keys, not filter them
    // The filtering was causing only 18 keys to show
    
    container.innerHTML = `
        <div class="keyboard-tenkeyless">
            <div class="tenkeyless-grid">
                ${renderAllTenkeylessKeys(currentKeys)}
            </div>
        </div>
    `;
}

function renderAllTenkeylessKeys(keys) {
    console.log('Rendering tenkeyless keys:', keys.length, 'keys found');
    console.log('Sample keys:', keys.slice(0, 5).map(k => `${k.id}: ${k.label} (${k.row},${k.col})`));
    
    return keys.map(key => {
        let keyContent = '';
        if (key.imageData && key.imageData.startsWith('data:image/')) {
            keyContent = `<img class="key-image" src="${key.imageData}" alt="${escapeHtml(key.label || 'Key image')}" />`;
        } else if (key.label && key.label.trim() !== '') {
            keyContent = `<span class="key-label">${escapeHtml(key.label)}</span>`;
        } else {
            keyContent = `<span class="key-placeholder"></span>`;
        }
        
        // Extract extra data from description
        let extraData = {};
        if (key.description) {
            try {
                extraData = JSON.parse(key.description);
            } catch (e) {
                extraData = { userDescription: key.description };
            }
        }
        
        // Add overlay images
        let overlayImages = '';
        if (extraData.secondaryImageData) {
            overlayImages += `<img class="key-secondary-image" src="${extraData.secondaryImageData}" alt="Secondary image" />`;
        }
        if (extraData.tertiaryImageData) {
            overlayImages += `<img class="key-tertiary-image" src="${extraData.tertiaryImageData}" alt="Tertiary image" />`;
        }
        
        // Calculate position based on row and col - proper tenkeyless spacing scaled for 4rem keys
        const keyWidth = 80;  // Scaled up from 60px for 4rem keys
        const keyHeight = 80; // Scaled up from 60px for 4rem keys
        let left = key.col * keyWidth;
        let top = key.row * keyHeight;
        
        // Apply proper TKL row stagger (but exclude specific keys that align with Esc)
        if (key.row === 0) {
            // Function row - no offset, Esc aligned with other rows
            if (key.id === 'ESC') {
                left = 0; // Esc at position 0
            }
        } else if (key.row === 1) {
            // Number row - backtick aligned with Esc (no offset)
        } else if (key.row === 2) {
            // Tab row - apply stagger to all keys except Tab
            if (key.id === 'TAB') {
                left = 0; // Tab at position 0, same as Esc
            } else {
                left += keyWidth * 0.75; // Stagger other keys
            }
        } else if (key.row === 3) {
            // Caps row - apply stagger to all keys except Caps
            if (key.id === 'CAPS') {
                left = 0; // Caps at position 0, same as Esc
            } else {
                left += keyWidth * 0.9; // Stagger other keys
            }
        } else if (key.row === 4) {
            // Shift row - apply stagger to all keys except Left Shift
            if (key.id === 'LSHIFT') {
                left = 0; // LShift at position 0, same as Esc
            } else {
                left += keyWidth * 1.25; // Stagger other keys
            }
        } else if (key.row === 5) {
            // Control row - apply stagger to all keys except specific positioning
            if (key.id === 'SPACE') {
                left = keyWidth * 3; // Center spacebar properly
            } else if (['RALT', 'RGUI', 'MENU', 'RCTRL'].includes(key.id)) {
                // Shift right modifiers to not overlap spacebar
                left = keyWidth * (key.col + 6); // Move them right
            } else {
                left += keyWidth * 0.1; // Small stagger for other keys
            }
        }
        
        // Fix navigation cluster alignment - NO stagger for nav keys
        if (key.side === 'right') {
            if (key.keyType === 'nav') {
                // Override any stagger for nav keys - use pure column positioning
                left = keyWidth * key.col;
                // Align Ins/Home/PgUp with Del/End/PgDn
                if (key.row === 1) {
                    top = keyHeight * 1; // Same as number row
                }
                if (key.row === 2) {
                    top = keyHeight * 2; // Same as QWERTY row
                }
            }
            if (key.keyType === 'arrow') {
                // NO stagger for arrow keys - use pure positioning
                if (key.id === 'UP') {
                    left = keyWidth * 16; // Same column as Down
                    top = keyHeight * 4;  // Above Down
                } else if (key.id === 'DOWN') {
                    left = keyWidth * 16; // Keep Down in middle
                    top = keyHeight * 5;  // Below Up
                } else if (key.id === 'LEFT') {
                    left = keyWidth * 15; // Left of Up/Down column
                    top = keyHeight * 5;  // Same row as Down
                } else if (key.id === 'RIGHT') {
                    left = keyWidth * 17; // Right of Up/Down column
                    top = keyHeight * 5;  // Same row as Down
                }
            }
        }
        
        // Get tooltip text from description
        let tooltipText = 'Click to add image';
        if (key.label && key.label.trim() !== '') {
            tooltipText = key.label;
        }
        if (extraData.userDescription) {
            tooltipText = extraData.userDescription;
        }
        
        // Special styling for different key types
        let keyClass = `key ${key.keyType}`;
        let backgroundColor = key.color || '#ffffff';
        
        // Use light grey for blank keys (no image and no user-modified content)
        if (isBlankKey(key)) {
            backgroundColor = '#e0e0e0';
        }
        
        let keyStyle = `background-color: ${backgroundColor}; left: ${left}px; top: ${top}px; position: absolute;`;
        
        // Special widths for certain keys (scaled up for 4rem keys)
        if (key.keyType === 'spacebar') {
            keyStyle += ' width: 547px;'; // Spacebar width scaled up (410px * 80/60)
        } else if (key.id === 'BACKSPACE') {
            keyStyle += ' width: 120px;'; // Scaled up (90px * 80/60)
        } else if (key.id === 'TAB') {
            keyStyle += ' width: 120px;'; // Scaled up (90px * 80/60)
        } else if (key.id === 'CAPS') {
            keyStyle += ' width: 133px;'; // Scaled up (100px * 80/60)
        } else if (key.id === 'ENTER') {
            keyStyle += ' width: 160px;'; // Scaled up (120px * 80/60)
        } else if (key.id === 'LSHIFT') {
            keyStyle += ' width: 160px;'; // Scaled up (120px * 80/60)
        } else if (key.id === 'RSHIFT') {
            keyStyle += ' width: 187px;'; // Scaled up (140px * 80/60)
        }
        
        return `
            <div class="${keyClass}" 
                 data-key-id="${key.id}" 
                 style="${keyStyle}"
                 title="${tooltipText}">
                ${keyContent}
                ${overlayImages}
            </div>
        `;
    }).join('');
}

function renderKeyGrid(keys, side) {
    // Separate regular keys from thumb keys
    const regularKeys = keys.filter(key => !key.keyType.includes('thumb'));
    const thumbKeys = keys.filter(key => key.keyType.includes('thumb'));
    
    let gridHtml = '';
    
    // Define exact Corne layout positions scaled for 4rem keys (was 3rem, now 33% bigger)
    const corneLayout = {
        left: {
            // Left hand positions - scaled up for bigger keys
            positions: [
                // Column 0 (leftmost for left hand)
                {col: 0, row: 0, x: 0, y: 40},
                {col: 0, row: 1, x: 0, y: 120},
                {col: 0, row: 2, x: 0, y: 200},
                // Column 1
                {col: 1, row: 0, x: 80, y: 40},
                {col: 1, row: 1, x: 80, y: 120},
                {col: 1, row: 2, x: 80, y: 200},
                // Column 2
                {col: 2, row: 0, x: 160, y: 27},
                {col: 2, row: 1, x: 160, y: 107},
                {col: 2, row: 2, x: 160, y: 187},
                // Column 3
                {col: 3, row: 0, x: 240, y: 0},
                {col: 3, row: 1, x: 240, y: 80},
                {col: 3, row: 2, x: 240, y: 160},
                // Column 4
                {col: 4, row: 0, x: 320, y: 13},
                {col: 4, row: 1, x: 320, y: 93},
                {col: 4, row: 2, x: 320, y: 173},
                // Column 5 (rightmost on left half)
                {col: 5, row: 0, x: 400, y: 27},
                {col: 5, row: 1, x: 400, y: 107},
                {col: 5, row: 2, x: 400, y: 187},
            ],
            thumbs: [
                {col: 0, x: 293, y: 253},
                {col: 1, x: 373, y: 267},
                {col: 2, x: 453, y: 267}
            ]
        },
        right: {
            // Right hand positions - scaled up for bigger keys
            positions: [
                // Column 0 (leftmost on right half)
                {col: 0, row: 0, x: 0, y: 27},
                {col: 0, row: 1, x: 0, y: 107},
                {col: 0, row: 2, x: 0, y: 187},
                // Column 1
                {col: 1, row: 0, x: 80, y: 13},
                {col: 1, row: 1, x: 80, y: 93},
                {col: 1, row: 2, x: 80, y: 173},
                // Column 2
                {col: 2, row: 0, x: 160, y: 0},
                {col: 2, row: 1, x: 160, y: 80},
                {col: 2, row: 2, x: 160, y: 160},
                // Column 3
                {col: 3, row: 0, x: 240, y: 27},
                {col: 3, row: 1, x: 240, y: 107},
                {col: 3, row: 2, x: 240, y: 187},
                // Column 4
                {col: 4, row: 0, x: 320, y: 40},
                {col: 4, row: 1, x: 320, y: 120},
                {col: 4, row: 2, x: 320, y: 200},
                // Column 5 (rightmost)
                {col: 5, row: 0, x: 400, y: 40},
                {col: 5, row: 1, x: 400, y: 120},
                {col: 5, row: 2, x: 400, y: 200},
            ],
            thumbs: [
                {col: 0, x: -53, y: 267},
                {col: 1, x: 27, y: 267},
                {col: 2, x: 107, y: 253}
            ]
        }
    };
    
    const layout = corneLayout[side];
    
    // Render regular keys
    regularKeys.forEach(key => {
        // Find the position for this key
        const position = layout.positions.find(pos => pos.col === key.col && pos.row === key.row);
        if (!position) return; // Skip if no position found
        
        let keyContent = '';
        if (key.imageData && key.imageData.startsWith('data:image/')) {
            keyContent = `<img class="key-image" src="${key.imageData}" alt="${escapeHtml(key.label || 'Key image')}" />`;
        } else if (key.label && key.label.trim() !== '') {
            keyContent = `<span class="key-label">${escapeHtml(key.label)}</span>`;
        } else {
            keyContent = `<span class="key-placeholder"></span>`;
        }
        
        // Extract extra data from description
        let extraData = {};
        if (key.description) {
            try {
                extraData = JSON.parse(key.description);
            } catch (e) {
                // Not JSON, treat as plain text description
                extraData = { userDescription: key.description };
            }
        }
        
        // Add overlay images
        let overlayImages = '';
        // Check for secondary image (top-right)
        if (extraData.secondaryImageData) {
            overlayImages += `<img class="key-secondary-image" src="${extraData.secondaryImageData}" alt="Secondary image" />`;
        }
        // Check for tertiary image (bottom-right)
        if (extraData.tertiaryImageData) {
            overlayImages += `<img class="key-tertiary-image" src="${extraData.tertiaryImageData}" alt="Tertiary image" />`;
        }
        
        const left = position.x;
        const top = position.y;
        
        // Get background color - use light grey for blank keys
        let backgroundColor = key.color || '#ffffff';
        if (isBlankKey(key)) {
            backgroundColor = '#e0e0e0';
        }
        
        // Get tooltip text from description
        let tooltipText = 'Click to add image';
        if (key.label && key.label.trim() !== '') {
            tooltipText = key.label;
        }
        if (extraData.userDescription) {
            tooltipText = extraData.userDescription;
        } else if (key.description && !extraData.userDescription) {
            // Fallback for old format
            try {
                JSON.parse(key.description);
                // It's JSON but no user description
                tooltipText = key.label || 'Click to add image';
            } catch (e) {
                // It's plain text
                tooltipText = key.description;
            }
        }
        
        gridHtml += `
            <div class="key ${key.keyType}" 
                 data-key-id="${key.id}" 
                 style="background-color: ${backgroundColor}; left: ${left}px; top: ${top}px;"
                 title="${tooltipText}">
                ${keyContent}
                ${overlayImages}
            </div>
        `;
    });
    
    // Render thumb keys
    thumbKeys.forEach((key, index) => {
        const thumbPos = layout.thumbs[index];
        if (!thumbPos) return;
        
        let keyContent = '';
        if (key.imageData && key.imageData.startsWith('data:image/')) {
            keyContent = `<img class="key-image" src="${key.imageData}" alt="${escapeHtml(key.label || 'Key image')}" />`;
        } else if (key.label && key.label.trim() !== '') {
            keyContent = `<span class="key-label">${escapeHtml(key.label)}</span>`;
        } else {
            keyContent = `<span class="key-placeholder"></span>`;
        }
        
        // Extract extra data from description
        let extraData = {};
        if (key.description) {
            try {
                extraData = JSON.parse(key.description);
            } catch (e) {
                // Not JSON, treat as plain text description
                extraData = { userDescription: key.description };
            }
        }
        
        // Add overlay images
        let overlayImages = '';
        // Check for secondary image (top-right)
        if (extraData.secondaryImageData) {
            overlayImages += `<img class="key-secondary-image" src="${extraData.secondaryImageData}" alt="Secondary image" />`;
        }
        // Check for tertiary image (bottom-right)
        if (extraData.tertiaryImageData) {
            overlayImages += `<img class="key-tertiary-image" src="${extraData.tertiaryImageData}" alt="Tertiary image" />`;
        }
        
        const left = thumbPos.x;
        const top = thumbPos.y;
        
        // Get background color - use light grey for blank keys
        let backgroundColor = key.color || '#ffffff';
        if (isBlankKey(key)) {
            backgroundColor = '#e0e0e0';
        }
        
        // Get tooltip text from description
        let tooltipText = 'Click to add image';
        if (key.label && key.label.trim() !== '') {
            tooltipText = key.label;
        }
        if (extraData.userDescription) {
            tooltipText = extraData.userDescription;
        } else if (key.description && !extraData.userDescription) {
            // Fallback for old format
            try {
                JSON.parse(key.description);
                // It's JSON but no user description
                tooltipText = key.label || 'Click to add image';
            } catch (e) {
                // It's plain text
                tooltipText = key.description;
            }
        }
        
        gridHtml += `
            <div class="key ${key.keyType}" 
                 data-key-id="${key.id}" 
                 style="background-color: ${backgroundColor}; left: ${left}px; top: ${top}px;"
                 title="${tooltipText}">
                ${keyContent}
                ${overlayImages}
            </div>
        `;
    });
    
    return gridHtml;
}

function renderLayerSelector() {
    const container = document.getElementById('layer-selector');
    if (!container) return;
    
    // For tenkeyless, hide layer selector since it only has base layer
    if (currentKeyboardType === 'tenkeyless') {
        container.innerHTML = `
            <label>Layer:</label>
            <span style="padding: 0.5rem; color: #666;">Base (Only Layer)</span>
        `;
        return;
    }
    
    container.innerHTML = `
        <label for="layer-select">Layer:</label>
        <select id="layer-select">
            ${availableLayers.map(layer => 
                `<option value="${layer}" ${layer === currentLayer ? 'selected' : ''}>${layer}</option>`
            ).join('')}
        </select>
    `;
    
    // Add change handler only for Corne
    const layerSelect = document.getElementById('layer-select');
    if (layerSelect) {
        layerSelect.onchange = async (e) => {
            try {
                await SetCurrentLayer(e.target.value);
                currentLayer = e.target.value;
                await loadCurrentLayer();
                renderKeyboard();
            } catch (error) {
                console.error('Failed to change layer:', error);
            }
        };
    }
}

function renderModifierPanel() {
    const displayContainer = document.getElementById('current-modifier-display');
    const selectorContainer = document.getElementById('modifier-selector');
    
    if (!displayContainer || !selectorContainer) return;
    
    // Show modifier panel for both keyboard types
    const modifierPanel = document.getElementById('modifier-panel');
    if (modifierPanel) {
        modifierPanel.style.display = 'block';
    }
    
    // Ensure activeModifiers and availableModifiers are initialized as arrays
    if (!Array.isArray(activeModifiers)) {
        console.warn('activeModifiers is not an array, initializing:', activeModifiers);
        activeModifiers = [];
    }
    if (!Array.isArray(availableModifiers)) {
        console.warn('availableModifiers is not an array, initializing:', availableModifiers);
        availableModifiers = ['ctrl', 'shift', 'alt', 'gui'];
    }
    if (!Array.isArray(customModifiers)) {
        console.warn('customModifiers is not an array, initializing:', customModifiers);
        customModifiers = [];
    }
    
    // Display current active modifiers
    const displayText = activeModifiers.length > 0 
        ? activeModifiers.map(mod => {
            // Ensure mod is a string before using string methods
            const safeMod = String(mod || '');
            return safeMod.charAt(0).toUpperCase() + safeMod.slice(1);
          }).join(' + ')
        : 'None';
    
    displayContainer.innerHTML = `
        <div class="current-mod-display">
            <strong>Active: ${displayText}</strong>
        </div>
    `;
    
    // Combine built-in and custom modifiers
    const allModifiers = [...availableModifiers, ...customModifiers.map(m => m.name)];
    
    // Render big modifier buttons + add button
    selectorContainer.innerHTML = allModifiers.map(modifier => {
        const isActive = activeModifiers.includes(modifier);
        // Ensure modifier is a string before using string methods
        const safeModifier = String(modifier || '');
        const modifierName = safeModifier.charAt(0).toUpperCase() + safeModifier.slice(1);
        
        // Check if this is a custom modifier (not built-in)
        const isCustomModifier = !availableModifiers.includes(modifier);
        
        return `
            <button class="modifier-button ${isActive ? 'active' : ''} ${isCustomModifier ? 'custom-modifier' : ''}" 
                    data-modifier="${modifier}"
                    title="Toggle ${modifierName} modifier${isCustomModifier ? ' (Custom)' : ''}">
                <span class="modifier-button-text">${modifierName}</span>
                ${isCustomModifier ? '<button class="modifier-delete-btn" data-modifier="' + modifier + '" title="Delete custom modifier">×</button>' : ''}
            </button>
        `;
    }).join('') + `
        <button class="modifier-button add-modifier-button" 
                id="add-modifier-btn"
                title="Add custom modifier">
            <span class="modifier-button-text">+</span>
        </button>
    `;
    
    // Apply custom colors dynamically
    applyCustomModifierColors();
    
    // Add click handlers to modifier buttons
    selectorContainer.querySelectorAll('.modifier-button:not(.add-modifier-button)').forEach(button => {
        button.onclick = async (e) => {
            // Check if click was on delete button
            if (e.target.classList.contains('modifier-delete-btn')) {
                e.stopPropagation();
                const modifierToDelete = e.target.dataset.modifier;
                deleteCustomModifier(modifierToDelete);
                return;
            }
            
            const modifier = button.dataset.modifier;
            
            // Toggle modifier state
            const newModifiers = [...activeModifiers];
            const index = newModifiers.indexOf(modifier);
            
            if (index > -1) {
                // Remove modifier
                newModifiers.splice(index, 1);
            } else {
                // Add modifier
                newModifiers.push(modifier);
            }
            
            try {
                await SetActiveModifiers(JSON.stringify(newModifiers));
                activeModifiers = newModifiers;
                await loadCurrentLayer();
                renderKeyboard();
                renderModifierPanel(); // Update display
            } catch (error) {
                console.error('Failed to set active modifiers:', error);
                // Revert button state on failure
                renderModifierPanel();
            }
        };
    });
    
    // Add click handler for + button
    const addBtn = document.getElementById('add-modifier-btn');
    if (addBtn) {
        addBtn.onclick = () => {
            showAddModifierModal();
        };
    }
}

function createPersistentPaletteKeyElement(keyData, index) {
    const keyElement = document.createElement('div');
    keyElement.className = 'persistent-palette-key';
    keyElement.style.backgroundColor = keyData.color || '#ffffff';
    keyElement.draggable = true;
    keyElement.dataset.keyData = JSON.stringify(keyData);
    
    // Extract extra data from description
    let extraData = {};
    if (keyData.description) {
        try {
            extraData = JSON.parse(keyData.description);
        } catch (e) {
            // Not JSON, treat as plain text description
        }
    }
    
    let keyContent = '';
    if (keyData.imageData && keyData.imageData.startsWith('data:image/')) {
        keyContent = `<img class="persistent-palette-key-image" src="${keyData.imageData}" alt="${escapeHtml(keyData.label || 'Key image')}" />`;
    } else if (keyData.label) {
        keyContent = `<span class="persistent-palette-key-label">${escapeHtml(keyData.label)}</span>`;
    } else {
        keyContent = `<span class="persistent-palette-key-label">?</span>`;
    }
    
    // Add overlay images
    let overlayImages = '';
    if (extraData.secondaryImageData) {
        overlayImages += `<img class="persistent-palette-secondary-image" src="${extraData.secondaryImageData}" alt="Secondary" />`;
    }
    if (extraData.tertiaryImageData) {
        overlayImages += `<img class="persistent-palette-tertiary-image" src="${extraData.tertiaryImageData}" alt="Tertiary" />`;
    }
    
    // Determine text label to show
    let displayLabel = '';
    if (extraData.userDescription) {
        displayLabel = extraData.userDescription;
    } else if (keyData.label) {
        displayLabel = keyData.label;
    } else {
        displayLabel = 'Untitled';
    }
    
    keyElement.innerHTML = `
        <div class="persistent-palette-key-content">
            ${keyContent}
            <div class="persistent-palette-key-overlay-images">
                ${overlayImages}
            </div>
        </div>
        <div class="persistent-palette-key-text-label" title="${escapeHtml(displayLabel)}">${escapeHtml(displayLabel)}</div>
        <button class="persistent-palette-key-delete" title="Delete from palette">×</button>
        <button class="persistent-palette-key-favorite-toggle ${keyData.favorite ? 'favorited' : ''}" title="${keyData.favorite ? 'Remove from favorites' : 'Add to favorites'}">
            ${keyData.favorite ? '❤️' : '🤍'}
        </button>
        <button class="persistent-palette-key-edit" title="Edit key design">✏️</button>
    `;
    
    // Add drag handlers
    setupPaletteKeyDragHandlers(keyElement, keyData);
    
    // Add delete button handler
    const deleteBtn = keyElement.querySelector('.persistent-palette-key-delete');
    deleteBtn.replaceWith(deleteBtn.cloneNode(true));
    keyElement.querySelector('.persistent-palette-key-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (confirm('Delete this design from your palette? This cannot be undone.')) {
            // Remove from history
            if (deleteFromKeyPaletteHistory(keyData.id)) {
                applyPaletteFilters();
            }
        }
    });
    
    // Add favorite toggle handler
    const favoriteBtn = keyElement.querySelector('.persistent-palette-key-favorite-toggle');
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePaletteItemFavorite(keyData.id);
    });
    
    // Add edit button handler
    const editBtn = keyElement.querySelector('.persistent-palette-key-edit');
    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPaletteKeyEditor(keyData);
    });
    
    // Add double-click handler for editing (alternative way to edit)
    keyElement.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        showPaletteKeyEditor(keyData);
    });
    
    // Add click handler to apply the design to the current key
    keyElement.addEventListener('click', (e) => {
        // Don't apply if clicking on action buttons
        if (e.target.closest('.persistent-palette-key-delete') || 
            e.target.closest('.persistent-palette-key-favorite-toggle') || 
            e.target.closest('.persistent-palette-key-edit')) {
            return;
        }
        
        // Apply the palette key design to the currently selected key
        applyPaletteKeyToCurrentKey(keyData);
    });
    
    return keyElement;
}

function applyCustomModifierColors() {
    // Remove existing custom style tag if it exists
    const existingStyle = document.getElementById('custom-modifier-colors');
    if (existingStyle) {
        existingStyle.remove();
    }
    
    // Create new style tag with custom colors
    const styleTag = document.createElement('style');
    styleTag.id = 'custom-modifier-colors';
    
    let css = '';
    
    // Ensure availableModifiers is an array
    if (!Array.isArray(availableModifiers)) {
        console.warn('availableModifiers is not an array in applyCustomModifierColors:', availableModifiers);
        availableModifiers = ['ctrl', 'shift', 'alt', 'gui'];
    }
    
    // Built-in modifiers
    availableModifiers.forEach(modifier => {
        const color = customModifierColors[modifier] || '#666666';
        const shadowColor = color;
        
        // Active state with solid color
        css += `
        .modifier-button[data-modifier="${modifier}"].active {
            background: ${color} !important;
            color: ${getContrastColor(color)} !important;
            box-shadow: 0 6px 20px ${hexToRgba(shadowColor, 0.4)} !important;
        }
        `;
    });
    
    // Ensure customModifiers is an array
    if (!Array.isArray(customModifiers)) {
        console.warn('customModifiers is not an array in applyCustomModifierColors:', customModifiers);
        customModifiers = [];
    }
    
    // Custom modifiers
    customModifiers.forEach(customMod => {
        const color = customMod.color || '#666666';
        const shadowColor = color;
        
        css += `
        .modifier-button[data-modifier="${customMod.name}"].active {
            background: ${color} !important;
            color: ${getContrastColor(color)} !important;
            box-shadow: 0 6px 20px ${hexToRgba(shadowColor, 0.4)} !important;
        }
        `;
    });
    
    // Add button styling
    css += `
    .modifier-button.add-modifier-button {
        background: linear-gradient(135deg, #e9ecef, #dee2e6) !important;
        color: #6c757d !important;
        border: 2px dashed #adb5bd !important;
        font-size: 1.5rem !important;
    }
    .modifier-button.add-modifier-button:hover {
        background: linear-gradient(135deg, #f8f9fa, #e9ecef) !important;
        color: #495057 !important;
        border-color: #6c757d !important;
        transform: translateY(-1px) !important;
    }
    `;
    
    styleTag.textContent = css;
    document.head.appendChild(styleTag);
}

function hexToRgba(hex, alpha) {
    // Ensure hex is a string and has the correct format
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#') || hex.length < 7) {
        console.warn('Invalid hex color format:', hex);
        hex = '#666666'; // Fallback to gray
    }
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastColor(hexColor) {
    // Ensure hexColor is a string and has the correct format
    if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#') || hexColor.length < 7) {
        console.warn('Invalid hex color format in getContrastColor:', hexColor);
        hexColor = '#666666'; // Fallback to gray
    }
    
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black or white based on luminance
    return luminance > 0.5 ? '#333333' : '#ffffff';
}

function addKeyClickHandlers() {
    document.querySelectorAll('.key').forEach(keyElement => {
        keyElement.addEventListener('click', (e) => {
            // Prevent event bubbling
            e.preventDefault();
            e.stopPropagation();
            
            const keyId = keyElement.dataset.keyId;
            const key = currentKeys.find(k => k.id === keyId);
            if (key) {
                showKeyEditor(key);
            }
        });
    });
}


function showKeyEditor(key) {
    const modal = document.getElementById('key-editor-modal');
    
    // Extract extra data from description
    let extraData = {};
    let userDescription = '';
    if (key.description) {
        try {
            extraData = JSON.parse(key.description);
            userDescription = extraData.userDescription || '';
        } catch (e) {
            // Not JSON, treat as plain text description
            userDescription = key.description;
            extraData = {};
        }
    }
    
    // Populate form fields with current values
    document.getElementById('key-label-input').value = key.label || '';
    document.getElementById('key-description-input').value = userDescription;
    document.getElementById('key-color-input').value = key.color || '#ffffff';
    
    // Update color label
    const colorLabel = document.querySelector('.color-label');
    if (colorLabel) {
        colorLabel.textContent = key.color || '#ffffff';
    }
    
    // Remove any existing event listeners and add new color input change handler
    const colorInput = document.getElementById('key-color-input');
    colorInput.replaceWith(colorInput.cloneNode(true));
    const newColorInput = document.getElementById('key-color-input');
    newColorInput.value = key.color || '#ffffff';
    newColorInput.addEventListener('input', (e) => {
        colorLabel.textContent = e.target.value;
    });
    
    // Update image slots
    updateImageSlotDisplay('primary', key.imageData);
    updateImageSlotDisplay('secondary', extraData.secondaryImageData);
    updateImageSlotDisplay('tertiary', extraData.tertiaryImageData);
    
    // Clear pending data and flags
    clearAllModalData();
    
    // Store the key ID for saving
    modal.dataset.editingKeyId = key.id;
    
    // Show the modal
    modal.style.display = 'block';
}

async function showKeyPalette() {
    const paletteModal = document.getElementById('key-palette-modal');
    const paletteGrid = document.getElementById('key-palette-grid');
    
    // Show loading state
    paletteGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 2rem;">
            <p>Loading your saved designs...</p>
        </div>
    `;
    paletteModal.style.display = 'block';
    
    try {
        // Use only the manually saved palette history
        const designs = [...keyPaletteHistory];
        
        // Sort designs by timestamp (newest first)
        designs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        // Clear and populate the grid
        paletteGrid.innerHTML = '';
        
        if (designs.length === 0) {
            paletteGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 2rem;">
                    <p>No saved key designs found.</p>
                    <p>Use the "Add to Palette" button in the key editor to save your favorite designs!</p>
                </div>
            `;
        } else {
            designs.forEach((design, index) => {
                const paletteKeyElement = createPaletteKeyElement(design, index);
                paletteGrid.appendChild(paletteKeyElement);
            });
        }
        
    } catch (error) {
        console.error('Failed to load key palette:', error);
        paletteGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: #f87171; padding: 2rem;">
                <p>Error loading designs: ${error.message}</p>
            </div>
        `;
    }
}

function addCurrentKeyToPalette() {
    const modal = document.getElementById('key-editor-modal');
    const keyId = modal.dataset.editingKeyId;
    
    if (!keyId) {
        alert('No key selected to add to palette');
        return;
    }
    
    // Find the current key
    const key = currentKeys.find(k => k.id === keyId);
    if (!key) {
        alert('Key not found');
        return;
    }
    
    // Create a temporary key object with current form values
    const tempKey = { ...key };
    
    // Get current form values
    tempKey.label = document.getElementById('key-label-input').value || '';
    tempKey.color = document.getElementById('key-color-input').value || '';
    
    // Handle images
    if (modal.dataset.pendingPrimaryImageData) {
        tempKey.imageData = modal.dataset.pendingPrimaryImageData;
    }
    
    // Parse existing description and add current form data
    let extraData = {};
    try {
        if (tempKey.description) {
            extraData = JSON.parse(tempKey.description);
        }
    } catch (e) {
        extraData = {};
    }
    
    // Add current description from form
    const userDescription = document.getElementById('key-description-input').value || '';
    if (userDescription) {
        extraData.userDescription = userDescription;
    }
    
    // Add pending secondary/tertiary images
    if (modal.dataset.pendingSecondaryImageData) {
        extraData.secondaryImageData = modal.dataset.pendingSecondaryImageData;
    }
    if (modal.dataset.pendingTertiaryImageData) {
        extraData.tertiaryImageData = modal.dataset.pendingTertiaryImageData;
    }
    
    tempKey.description = JSON.stringify(extraData);
    
    // Check if this key has custom content (images)
    if (hasCustomContent(tempKey)) {
        addToKeyPaletteHistory(tempKey);
        alert('Design added to your key palette!');
    } else {
        alert('Only keys with images can be added to the palette');
    }
}

function deleteFromKeyPaletteHistory(designId) {
    // Remove design from history array
    const index = keyPaletteHistory.findIndex(design => design.id === designId);
    if (index !== -1) {
        keyPaletteHistory.splice(index, 1);
        // Update localStorage
        localStorage.setItem('keyPaletteHistory', JSON.stringify(keyPaletteHistory));
        console.log('Removed design from palette history:', designId);
        // Refresh persistent palette
        applyPaletteFilters();
        return true;
    }
    return false;
}

function addToKeyPaletteHistory(key) {
    // Get the current key being edited to access tags
    const modal = document.getElementById('key-editor-modal');
    const keyId = modal.dataset.editingKeyId;
    
    // Determine keyboard type from current configuration
    const keyboardType = currentKeyboardType || 'corne';
    
    // Count keys in current layer for better keyboard type detection
    let layerKeysCount = 0;
    if (currentKeys && Array.isArray(currentKeys)) {
        layerKeysCount = currentKeys.length;
    }
    
    // Create a design object with just the visual properties
    const design = {
        id: `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
        imageData: key.imageData || null,
        label: key.label || '',
        color: key.color || '#ffffff',
        description: key.description || '{}',
        timestamp: Date.now(),
        sourceLayer: currentLayer,
        sourceLayerKeysCount: layerKeysCount,
        sourceModifiers: [...activeModifiers],
        sourceKeyboardType: keyboardType,
        // New fields for advanced features
        favorite: false, // Default to not favorited
        keyType: key.keyType || 'normal',
        usageCount: 0
    };
    
    // Check if this exact design already exists in history (avoid duplicates)
    const existingDesign = keyPaletteHistory.find(existing => 
        existing.imageData === design.imageData &&
        existing.label === design.label &&
        existing.color === design.color &&
        existing.description === design.description
    );
    
    if (!existingDesign) {
        keyPaletteHistory.push(design);
        // Save to localStorage for persistence
        localStorage.setItem('keyPaletteHistory', JSON.stringify(keyPaletteHistory));
        console.log('Added design to palette history:', design.id);
        
        // Refresh persistent palette
        renderPersistentPalette();
    }
}

function loadKeyPaletteHistory() {
    try {
        const saved = localStorage.getItem('keyPaletteHistory');
        if (saved) {
            keyPaletteHistory = JSON.parse(saved);
            
            // Ensure all items have the required fields with default values
            keyPaletteHistory = keyPaletteHistory.map(item => ({
                id: item.id || `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                imageData: item.imageData || null,
                label: item.label || '',
                color: item.color || '#ffffff',
                description: item.description || '{}',
                timestamp: item.timestamp || Date.now(),
                sourceLayer: item.sourceLayer || 'base',
                sourceLayerKeysCount: item.sourceLayerKeysCount || 0,
                sourceModifiers: item.sourceModifiers || [],
                sourceKeyboardType: item.sourceKeyboardType || 'corne',
                // New fields with defaults
                favorite: typeof item.favorite === 'boolean' ? item.favorite : false,
                keyType: item.keyType || 'normal',
                usageCount: typeof item.usageCount === 'number' ? item.usageCount : 0
            }));
            
            console.log('Loaded palette history:', keyPaletteHistory.length, 'designs');
        }
    } catch (error) {
        console.error('Failed to load palette history:', error);
        keyPaletteHistory = [];
    }
}

// Create a new blank custom key and add it to the palette
function createNewCustomKey() {
    // Create a new blank key design
    const newKeyDesign = {
        id: `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
        imageData: null,
        label: '',
        color: '#ffffff',
        description: '{}',
        timestamp: Date.now(),
        sourceLayer: currentLayer,
        sourceModifiers: [...activeModifiers],
        favorite: false,
        keyType: 'normal',
        usageCount: 0
    };
    
    // Add to palette history
    keyPaletteHistory.push(newKeyDesign);
    
    // Save to localStorage for persistence
    localStorage.setItem('keyPaletteHistory', JSON.stringify(keyPaletteHistory));
    
    // Refresh persistent palette
    applyPaletteFilters();
    
    // Show a message to the user
    console.log('Added new custom key to palette');
}

function setupPersistentPalette() {
    const palettePanel = document.getElementById('palette-panel');
    const toggleBtn = document.getElementById('toggle-palette-btn');
    const showPaletteBtn = document.getElementById('show-palette-btn');
    const searchInput = document.getElementById('palette-search-input');
    const sortBtn = document.getElementById('palette-sort-btn');
    const resizeHandle = document.getElementById('palette-resize-handle');
    const toggleUnusedBtn = document.getElementById('toggle-unused-btn');

    if (!palettePanel || !toggleBtn || !showPaletteBtn || !searchInput || !sortBtn || !resizeHandle) {
        console.warn('Persistent palette elements not found');
        return;
    }

    // Toggle palette visibility
    toggleBtn.onclick = () => {
        hidePalette();
    };

    // Show palette button click handler
    showPaletteBtn.onclick = () => {
        showPalette();
    };

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        filterPaletteKeys(searchTerm);
    });

    // Sort toggle functionality
    let currentSortType = 'time'; // Default to time sorting
    sortBtn.addEventListener('click', () => {
        // Toggle between time and color sorting
        currentSortType = currentSortType === 'time' ? 'color' : 'time';

        // Update button appearance and text
        if (currentSortType === 'color') {
            sortBtn.innerHTML = '🎨 Color';
            sortBtn.classList.add('active-color');
            sortBtn.title = 'Toggle sort: Color / Time';
        } else {
            sortBtn.innerHTML = '📅 Time';
            sortBtn.classList.remove('active-color');
            sortBtn.title = 'Toggle sort: Time / Color';
        }

        // Apply new sorting
        sortPaletteKeys(currentSortType);
    });

    // Add custom key button functionality
    const addCustomKeyBtn = document.getElementById('add-custom-key-btn');
    if (addCustomKeyBtn) {
        addCustomKeyBtn.addEventListener('click', () => {
            createNewCustomKey();
        });
    }

    // Toggle unused keys button functionality
    if (toggleUnusedBtn) {
        toggleUnusedBtn.addEventListener('click', () => {
            toggleUnusedKeysFilter();
        });
    }

    // Clear search on escape
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterPaletteKeys('');
        }
    });

    // Add event listener for advanced search/filter options
    setupAdvancedPaletteFilters();

    // Setup resize functionality
    setupPaletteResize(resizeHandle, palettePanel);

    // Initial render
    applyPaletteFilters();
}

function toggleUnusedKeysFilter() {
    showOnlyUnusedKeys = !showOnlyUnusedKeys;
    const toggleUnusedBtn = document.getElementById('toggle-unused-btn');
    if (showOnlyUnusedKeys) {
        toggleUnusedBtn.innerHTML = '<span>🔄</span> Show All';
        toggleUnusedBtn.title = 'Show all keys in the palette';
        toggleUnusedBtn.classList.add('active');
    } else {
        toggleUnusedBtn.innerHTML = '<span>🔄</span> Show Unused';
        toggleUnusedBtn.title = 'Show only unused keys';
        toggleUnusedBtn.classList.remove('active');
    }
    applyPaletteFilters();
}

function renderPersistentPalette(sortBy = 'time', searchTerm = '') {
    const grid = document.getElementById('persistent-palette-grid');
    const emptyState = document.getElementById('palette-empty-state');
    const noResults = document.getElementById('palette-no-results');
    
    let keysToRender = [...keyPaletteHistory];

    // Filter by search term
    if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        keysToRender = keysToRender.filter(key => {
            const label = key.label || '';
            const description = key.description || '';
            return label.toLowerCase().includes(lowerCaseSearchTerm) ||
                   description.toLowerCase().includes(lowerCaseSearchTerm);
        });
    }

    // Filter for unused keys if the toggle is active
    if (showOnlyUnusedKeys) {
        const usedKeyIds = new Set(currentKeys.map(k => k.id));
        keysToRender = keysToRender.filter(key => !usedKeyIds.has(key.id));
    }

    // Sort keys
    if (sortBy === 'color') {
        keysToRender.sort((a, b) => {
            const colorA = a.color || '#ffffff';
            const colorB = b.color || '#ffffff';
            return colorA.localeCompare(colorB);
        });
    } else { // Default to sorting by time (most recent first)
        keysToRender.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    if (keysToRender.length === 0) {
        grid.innerHTML = '';
        if (searchTerm) {
            emptyState.style.display = 'none';
            noResults.style.display = 'block';
        } else {
            emptyState.style.display = 'block';
            noResults.style.display = 'none';
        }
        return;
    }

    emptyState.style.display = 'none';
    noResults.style.display = 'none';

    grid.innerHTML = keysToRender.map(key => {
        let keyContent = '';
        if (key.imageData && key.imageData.startsWith('data:image/')) {
            keyContent = `<img class="key-image" src="${key.imageData}" alt="${escapeHtml(key.label || 'Key image')}" />`;
        } else if (key.label && key.label.trim() !== '') {
            keyContent = `<span class="key-label">${escapeHtml(key.label)}</span>`;
        } else {
            keyContent = `<span class="key-placeholder"></span>`;
        }

        let extraData = {};
        if (key.description) {
            try {
                extraData = JSON.parse(key.description);
            } catch (e) {
                extraData = { userDescription: key.description };
            }
        }

        let overlayImages = '';
        if (extraData.secondaryImageData) {
            overlayImages += `<img class="key-secondary-image" src="${extraData.secondaryImageData}" alt="Secondary image" />`;
        }
        if (extraData.tertiaryImageData) {
            overlayImages += `<img class="key-tertiary-image" src="${extraData.tertiaryImageData}" alt="Tertiary image" />`;
        }

        const tooltipText = extraData.userDescription || key.label || 'Custom key';
        const backgroundColor = key.color || '#ffffff';

        return `
            <div class="key palette-key" 
                 data-key-data='${escapeHtml(JSON.stringify(key))}'
                 style="background-color: ${backgroundColor};"
                 title="${tooltipText}">
                ${keyContent}
                ${overlayImages}
                <div class="palette-key-actions">
                    <button class="palette-key-edit-btn" title="Edit Key">✏️</button>
                    <button class="palette-key-delete-btn" title="Delete Key">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners for the new palette keys
    grid.querySelectorAll('.palette-key').forEach(keyEl => {
        keyEl.addEventListener('click', (e) => {
            // Don't trigger key application if clicking a button
            if (e.target.closest('button')) return;

            const keyData = JSON.parse(keyEl.dataset.keyData);
            applyPaletteKeyToActiveKey(keyData);
        });

        keyEl.querySelector('.palette-key-edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const keyData = JSON.parse(keyEl.dataset.keyData);
            showPaletteKeyEditor(keyData);
        });

        keyEl.querySelector('.palette-key-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const keyData = JSON.parse(keyEl.dataset.keyData);
            deleteKeyFromPalette(keyData.id);
        });
    });
}

function setupAdvancedPaletteFilters() {
    // Create advanced filter elements if they don't exist
    const paletteHeader = document.querySelector('.palette-header');
    if (!paletteHeader) return;
    
    // Check if advanced filters already exist
    let advancedFilters = document.getElementById('palette-advanced-filters');
    if (!advancedFilters) {
        // Create and add the advanced filters if they don't exist
        advancedFilters = document.createElement('div');
        advancedFilters.id = 'palette-advanced-filters';
        advancedFilters.className = 'palette-advanced-filters';
        advancedFilters.innerHTML = `
            <div class="palette-filter-group">
                <button id="palette-filter-favorites" class="btn-secondary palette-filter-btn" title="Show only favorites">
                    ❤️ Favorites
                </button>
                <select id="palette-key-type-filter" class="palette-key-type-filter" title="Filter by key type">
                    <option value="all">All Types</option>
                    <option value="corne">Corne Keys</option>
                    <option value="tenkeyless">TKL Keys</option>
                </select>
            </div>
        `;
        
        // Insert after the existing controls
        const existingControls = paletteHeader.querySelector('.palette-controls');
        if (existingControls) {
            paletteHeader.insertBefore(advancedFilters, existingControls);
        } else {
            paletteHeader.appendChild(advancedFilters);
        }
    }
    
    // Always add event listeners for advanced filters to ensure they work
    const favoritesBtn = document.getElementById('palette-filter-favorites');
    const keyTypeFilter = document.getElementById('palette-key-type-filter');
    
    if (favoritesBtn) {
        // Remove any existing event listeners to prevent duplicates
        const newFavoritesBtn = favoritesBtn.cloneNode(true);
        favoritesBtn.parentNode.replaceChild(newFavoritesBtn, favoritesBtn);
        newFavoritesBtn.addEventListener('click', toggleFavoritesFilter);
    }
    
    if (keyTypeFilter) {
        // Remove any existing event listeners to prevent duplicates
        const newKeyTypeFilter = keyTypeFilter.cloneNode(true);
        keyTypeFilter.parentNode.replaceChild(newKeyTypeFilter, keyTypeFilter);
        newKeyTypeFilter.addEventListener('change', () => {
            applyPaletteFilters();
        });
    }
}

function toggleFavoritesFilter() {
    const favBtn = document.getElementById('palette-filter-favorites');
    const isFiltered = favBtn.classList.contains('active');
    
    if (isFiltered) {
        favBtn.classList.remove('active');
        favBtn.innerHTML = '❤️ Favorites';
        favBtn.title = 'Show only favorites';
    } else {
        favBtn.classList.add('active');
        favBtn.innerHTML = '❤️ Showing Favorites';
        favBtn.title = 'Show all items';
    }
    
    applyPaletteFilters();
}



function resetPaletteFilters() {
    // Reset all filter controls (except key types dropdown which was removed)
    const favBtn = document.getElementById('palette-filter-favorites');
    const searchInput = document.getElementById('palette-search-input');
    
    if (favBtn) {
        favBtn.classList.remove('active');
        favBtn.innerHTML = '❤️ Favorites';
        favBtn.title = 'Show only favorites';
    }
    if (searchInput) searchInput.value = '';
    
    // Reset unused keys toggle
    showOnlyUnusedKeys = false;
    const unusedBtn = document.getElementById('toggle-unused-btn');
    if (unusedBtn) {
        unusedBtn.innerHTML = '<span>🔄</span> Show Unused';
        unusedBtn.title = 'Show only unused keys';
        unusedBtn.classList.remove('active');
    }
    
    // Re-render the palette with all items
    renderPersistentPalette();
}

// Helper function to check if a palette key design is used in the current keyboard layout
function isKeyUsedInLayout(paletteKeyDesign) {
    // Check if any key in the current layout matches this palette design
    return currentKeys.some(key => {
        // Compare by image data (primary image)
        if (key.imageData && paletteKeyDesign.imageData && 
            key.imageData === paletteKeyDesign.imageData) {
            return true;
        }
        
        // Compare by label and color when no image
        if (!key.imageData && !paletteKeyDesign.imageData &&
            key.label === paletteKeyDesign.label &&
            key.color === paletteKeyDesign.color) {
            return true;
        }
        
        // Check secondary/tertiary images
        let keyExtraData = {};
        let paletteExtraData = {};
        
        try {
            if (key.description) keyExtraData = JSON.parse(key.description);
            if (paletteKeyDesign.description) paletteExtraData = JSON.parse(paletteKeyDesign.description);
        } catch (e) {
            // Ignore parsing errors
        }
        
        // Compare secondary images
        if (keyExtraData.secondaryImageData && paletteExtraData.secondaryImageData &&
            keyExtraData.secondaryImageData === paletteExtraData.secondaryImageData) {
            return true;
        }
        
        // Compare tertiary images
        if (keyExtraData.tertiaryImageData && paletteExtraData.tertiaryImageData &&
            keyExtraData.tertiaryImageData === paletteExtraData.tertiaryImageData) {
            return true;
        }
        
        return false;
    });
}

function applyPaletteFilters() {
    const searchTerm = document.getElementById('palette-search-input').value.toLowerCase().trim();
    const favoritesOnly = document.getElementById('palette-filter-favorites').classList.contains('active');
    const keyTypeFilter = document.getElementById('palette-key-type-filter');
    const keyTypeValue = keyTypeFilter ? keyTypeFilter.value : 'all';
    
    // Filter designs based on all criteria
    const filteredDesigns = keyPaletteHistory.filter(design => {
        // Search term filter
        if (searchTerm) {
            const matchesSearch = 
                (design.label && design.label.toLowerCase().includes(searchTerm)) ||
                (design.description && design.description.toLowerCase().includes(searchTerm));
            
            if (!matchesSearch) return false;
        }
        
        // Favorites filter
        if (favoritesOnly && !design.favorite) {
            return false;
        }
        
        // Unused keys filter
        if (showOnlyUnusedKeys && isKeyUsedInLayout(design)) {
            return false;
        }
        
        // Key type filter
        if (keyTypeValue !== 'all') {
            // Check if design has source information about keyboard type
            if (design.sourceKeyboardType) {
                if (keyTypeValue === 'corne' && design.sourceKeyboardType !== 'corne') {
                    return false;
                }
                if (keyTypeValue === 'tenkeyless' && design.sourceKeyboardType !== 'tenkeyless') {
                    return false;
                }
            } else if (design.sourceLayer) {
                // Infer keyboard type from layer information
                // Corne layouts typically have fewer than 50 keys
                const isCorneDesign = design.sourceLayer === 'base' || 
                                     design.sourceLayer === 'lower' || 
                                     design.sourceLayer === 'raise' ||
                                     (design.sourceLayerKeysCount && design.sourceLayerKeysCount <= 50);
                
                if (keyTypeValue === 'corne' && !isCorneDesign) {
                    return false;
                }
                if (keyTypeValue === 'tenkeyless' && isCorneDesign) {
                    return false;
                }
            }
        }
        
        return true;
    });
    
    // Render filtered results
    renderFilteredPalette(filteredDesigns);
}

function renderFilteredPalette(filteredDesigns) {
    const paletteGrid = document.getElementById('persistent-palette-grid');
    const emptyState = document.getElementById('palette-empty-state');
    const noResultsState = document.getElementById('palette-no-results');
    
    if (!paletteGrid) return;
    
    // Clear existing content
    paletteGrid.innerHTML = '';
    
    if (filteredDesigns.length === 0) {
        if (emptyState) emptyState.style.display = 'none';
        if (noResultsState) noResultsState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (noResultsState) noResultsState.style.display = 'none';
    
    // Check if we're in favorites-only mode
    const favoritesOnly = document.getElementById('palette-filter-favorites').classList.contains('active');
    
    // Adjust layout based on favorites mode
    if (favoritesOnly) {
        // Use flex layout for favorites to reduce spacing
        paletteGrid.style.display = 'flex';
        paletteGrid.style.flexWrap = 'wrap';
        paletteGrid.style.justifyContent = 'flex-start';
        paletteGrid.style.gap = '0.5rem';
    } else {
        // Use grid layout for normal view - ensure consistent spacing
        paletteGrid.style.display = 'grid';
        paletteGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(80px, 1fr))';
        paletteGrid.style.gap = '0.75rem';
    }
    
    // Sort filtered designs
    const sortBtn = document.getElementById('palette-sort-btn');
    const currentSort = (sortBtn && sortBtn.classList.contains('active-color')) ? 'color' : 'time';
    
    let sortedFilteredDesigns = [...filteredDesigns];
    if (currentSort === 'time') {
        sortedFilteredDesigns.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else if (currentSort === 'color') {
        sortedFilteredDesigns.sort((a, b) => {
            const colorA = a.color || '#ffffff';
            const colorB = b.color || '#ffffff';
            const hslA = hexToHsl(colorA);
            const hslB = hexToHsl(colorB);
            
            if (hslA.h !== hslB.h) return hslA.h - hslB.h;
            if (hslA.s !== hslB.s) return hslB.s - hslA.s;
            return hslB.l - hslA.l;
        });
    }
    
    // Render filtered and sorted designs
    sortedFilteredDesigns.forEach((design, index) => {
        const paletteKeyElement = createPersistentPaletteKeyElement(design, index);
        paletteGrid.appendChild(paletteKeyElement);
    });
}

function setupPaletteResize(resizeHandle, palettePanel) {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    
    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startY = e.clientY;
        startHeight = palettePanel.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaY = startY - e.clientY; // Inverted because we're resizing from bottom
        const newHeight = Math.min(Math.max(startHeight + deltaY, 120), window.innerHeight * 0.6);
        
        palettePanel.style.height = newHeight + 'px';
        updateMainContentHeight(newHeight);
        
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Save the height preference
            const currentHeight = palettePanel.offsetHeight;
            localStorage.setItem('paletteHeight', currentHeight.toString());
        }
    });
    
    // Load saved height and set initial position
    const savedHeight = localStorage.getItem('paletteHeight');
    if (savedHeight) {
        const height = Math.min(Math.max(parseInt(savedHeight), 120), window.innerHeight * 0.6);
        palettePanel.style.height = height + 'px';
        updateMainContentHeight(height);
    } else {
        // Set initial height for main content layout
        updateMainContentHeight(palettePanel.offsetHeight);
    }
    
    // Check if palette starts hidden and adjust main content accordingly
    if (palettePanel.classList.contains('hidden')) {
        updateMainContentHeight(0);
    }
}

function updateMainContentHeight(paletteHeight) {
    document.documentElement.style.setProperty('--palette-height', paletteHeight + 'px');
}

function hidePalette() {
    const palettePanel = document.getElementById('palette-panel');
    const showPaletteBtn = document.getElementById('show-palette-btn');
    
    if (palettePanel && showPaletteBtn) {
        palettePanel.classList.add('hidden');
        showPaletteBtn.style.display = 'block';
        
        // Update main content height when palette is hidden
        updateMainContentHeight(0);
    }
}

function showPalette() {
    const palettePanel = document.getElementById('palette-panel');
    const showPaletteBtn = document.getElementById('show-palette-btn');
    
    if (palettePanel && showPaletteBtn) {
        palettePanel.classList.remove('hidden');
        showPaletteBtn.style.display = 'none';
        
        // Restore main content height when palette is shown
        const currentHeight = palettePanel.offsetHeight;
        updateMainContentHeight(currentHeight);
    }
}



function sortPaletteKeys(sortType) {
    const paletteGrid = document.getElementById('persistent-palette-grid');
    const emptyState = document.getElementById('palette-empty-state');
    const noResultsState = document.getElementById('palette-no-results');
    
    if (!paletteGrid) {
        return;
    }
    
    // Check if we're in favorites-only mode
    const favoritesOnly = document.getElementById('palette-filter-favorites').classList.contains('active');
    
    // Filter designs based on current mode
    let designsToSort = [...keyPaletteHistory];
    if (favoritesOnly) {
        designsToSort = designsToSort.filter(design => design.favorite);
    }
    
    if (designsToSort.length === 0) {
        return;
    }
    
    let sortedDesigns = [...designsToSort];
    
    if (sortType === 'time') {
        // Sort by timestamp (newest first)
        sortedDesigns.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else if (sortType === 'color') {
        // Sort by color (group similar colors together)
        sortedDesigns.sort((a, b) => {
            const colorA = a.color || '#ffffff';
            const colorB = b.color || '#ffffff';
            
            // Convert to HSL for better color grouping
            const hslA = hexToHsl(colorA);
            const hslB = hexToHsl(colorB);
            
            // Sort by hue first, then saturation, then lightness
            if (hslA.h !== hslB.h) {
                return hslA.h - hslB.h;
            }
            if (hslA.s !== hslB.s) {
                return hslB.s - hslA.s; // Higher saturation first
            }
            return hslB.l - hslA.l; // Higher lightness first
        });
    }
    
    // Clear and re-render with sorted data
    paletteGrid.innerHTML = '';
    emptyState.style.display = 'none';
    noResultsState.style.display = 'none';
    
    // Adjust layout based on favorites mode
    if (favoritesOnly) {
        // Use flex layout for favorites to reduce spacing
        paletteGrid.style.display = 'flex';
        paletteGrid.style.flexWrap = 'wrap';
        paletteGrid.style.justifyContent = 'flex-start';
        paletteGrid.style.gap = '0.5rem';
    } else {
        // Use grid layout for normal view - ensure consistent spacing
        paletteGrid.style.display = 'grid';
        paletteGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(80px, 1fr))';
        paletteGrid.style.gap = '0.75rem';
    }
    
    sortedDesigns.forEach((design, index) => {
        const paletteKeyElement = createPersistentPaletteKeyElement(design, index);
        paletteGrid.appendChild(paletteKeyElement);
    });
}

// Helper function to convert hex color to HSL
function hexToHsl(hex) {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l;
    
    l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // Achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function filterPaletteKeys(searchTerm) {
    // Instead of implementing filtering here, we'll trigger the unified filter system
    applyPaletteFilters();
}

function togglePaletteItemFavorite(itemId) {
    // Find the item in the palette history
    const item = keyPaletteHistory.find(design => design.id === itemId);
    if (!item) return;
    
    // Toggle favorite status
    item.favorite = !item.favorite;
    
    // Save to localStorage
    localStorage.setItem('keyPaletteHistory', JSON.stringify(keyPaletteHistory));
    
    // Re-render the palette
    applyPaletteFilters();
}

// Function to apply a palette key design to the currently selected key in the editor
function applyPaletteKeyToCurrentKey(paletteKeyData) {
    // Get the key editor modal
    const keyEditorModal = document.getElementById('key-editor-modal');
    
    // Check if the key editor is open
    if (keyEditorModal && keyEditorModal.style.display !== 'none') {
        // Extract extra data from palette key description
        let extraData = {};
        if (paletteKeyData.description) {
            try {
                extraData = JSON.parse(paletteKeyData.description);
            } catch (e) {
                // Not JSON, treat as plain text description
                extraData = {};
            }
        }
        
        // Update the key editor form with the palette key's properties
        document.getElementById('key-label-input').value = paletteKeyData.label || '';
        document.getElementById('key-description-input').value = extraData.userDescription || '';
        document.getElementById('key-color-input').value = paletteKeyData.color || '#ffffff';
        
        // Update color label
        const colorLabel = document.querySelector('#key-editor-modal .color-label');
        if (colorLabel) {
            colorLabel.textContent = paletteKeyData.color || '#ffffff';
        }
        
        // Update image slots with the palette key's images
        updateImageSlotDisplay('primary', paletteKeyData.imageData);
        updateImageSlotDisplay('secondary', extraData.secondaryImageData);
        updateImageSlotDisplay('tertiary', extraData.tertiaryImageData);
        
        // Store the palette key's data for saving
        if (paletteKeyData.imageData) {
            keyEditorModal.dataset.pendingPrimaryImageData = paletteKeyData.imageData;
        }
        if (extraData.secondaryImageData) {
            keyEditorModal.dataset.pendingSecondaryImageData = extraData.secondaryImageData;
        }
        if (extraData.tertiaryImageData) {
            keyEditorModal.dataset.pendingTertiaryImageData = extraData.tertiaryImageData;
        }
        
        // Visual feedback
        const paletteKeys = document.querySelectorAll('.persistent-palette-key');
        paletteKeys.forEach(key => key.classList.remove('selected'));
    }
}

function setupPaletteKeyDragHandlers(keyElement, keyData) {
    keyElement.addEventListener('dragstart', (e) => {
        keyElement.classList.add('dragging');
        console.log('Dragging key data:', keyData);
        e.dataTransfer.setData('application/json', JSON.stringify(keyData));
        e.dataTransfer.effectAllowed = 'copy';
        
        // Setup drop zones on all keys
        setupDropZones();
    });
    
    keyElement.addEventListener('dragend', () => {
        keyElement.classList.remove('dragging');
        clearDropZones();
    });
}

function setupDropZones() {
    document.querySelectorAll('.key').forEach(keyEl => {
        keyEl.classList.add('drop-zone');
        
        keyEl.addEventListener('dragover', handleDragOver);
        keyEl.addEventListener('dragenter', handleDragEnter);
        keyEl.addEventListener('dragleave', handleDragLeave);
        keyEl.addEventListener('drop', handleDrop);
    });
}

function clearDropZones() {
    document.querySelectorAll('.key').forEach(keyEl => {
        keyEl.classList.remove('drop-zone', 'drop-target', 'drop-invalid');
        
        keyEl.removeEventListener('dragover', handleDragOver);
        keyEl.removeEventListener('dragenter', handleDragEnter);
        keyEl.removeEventListener('dragleave', handleDragLeave);
        keyEl.removeEventListener('drop', handleDrop);
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drop-target');
}

function handleDragLeave(e) {
    // Only remove if we're actually leaving the element (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drop-target');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-target');
    
    try {
        const droppedKeyData = JSON.parse(e.dataTransfer.getData('application/json'));
        const targetKeyId = e.currentTarget.dataset.keyId;
        
        console.log('Dropped key data:', droppedKeyData);
        console.log('Target key ID:', targetKeyId);
        
        if (!targetKeyId || !droppedKeyData) {
            console.error('Invalid drop data');
            return;
        }
        
        // Apply the dropped key design to the target key
        await applyKeyDesignToTarget(droppedKeyData, targetKeyId);
        
        // Visual feedback
        e.currentTarget.style.transform = 'scale(1.1)';
        setTimeout(() => {
            e.currentTarget.style.transform = '';
        }, 200);
        
    } catch (error) {
        console.error('Failed to handle drop:', error);
        e.currentTarget.classList.add('drop-invalid');
        setTimeout(() => {
            e.currentTarget.classList.remove('drop-invalid');
        }, 1000);
    }
}

async function applyKeyDesignToTarget(sourceKeyData, targetKeyId) {
    // Find the target key in current keys
    const targetKey = currentKeys.find(k => k.id === targetKeyId);
    if (!targetKey) {
        throw new Error(`Target key ${targetKeyId} not found`);
    }
    
    console.log('Source key data:', sourceKeyData);
    console.log('Target key before update:', targetKey);
    
    // Create updated key with source design
    const updatedKey = { ...targetKey };
    
    // Apply visual properties from source
    updatedKey.label = sourceKeyData.label || '';
    updatedKey.color = sourceKeyData.color || '#ffffff';
    updatedKey.imageData = sourceKeyData.imageData || '';
    updatedKey.description = sourceKeyData.description || '';
    
    console.log('Updated key:', updatedKey);
    
    // Update the key (handles both base layer and modifier combinations)
    if (!activeModifiers || activeModifiers.length === 0) {
        await UpdateKey(JSON.stringify(updatedKey));
    } else {
        await UpdateModifierKey(JSON.stringify(updatedKey));
    }
    
    // Reload and refresh UI
    await loadCurrentLayer();
    renderKeyboard();
}

function hasCustomContent(key) {
    // STRICT: Only show keys that have images
    // A key is custom ONLY if it has any kind of image (primary, secondary, or tertiary)
    
    // 1. User uploaded a primary image through the file picker
    if (key.imageData && key.imageData.startsWith('data:image/')) {
        return true;
    }
    
    // 2. User added secondary or tertiary overlay images through the editor
    if (key.description) {
        try {
            const parsed = JSON.parse(key.description);
            
            // User uploaded secondary overlay image
            if (parsed.secondaryImageData && parsed.secondaryImageData.startsWith('data:image/')) {
                return true;
            }
            
            // User uploaded tertiary overlay image
            if (parsed.tertiaryImageData && parsed.tertiaryImageData.startsWith('data:image/')) {
                return true;
            }
            
        } catch (e) {
            // Not JSON, ignore
        }
    }
    
    // No images found - not a custom key for the palette
    return false;
}

function createPaletteKeyElement(key, index) {
    const keyElement = document.createElement('div');
    keyElement.className = 'palette-key';
    keyElement.style.backgroundColor = key.color || '#ffffff';
    keyElement.dataset.keyData = JSON.stringify(key);
    
    // Extract extra data from description
    let extraData = {};
    if (key.description) {
        try {
            extraData = JSON.parse(key.description);
        } catch (e) {
            // Not JSON, treat as plain text description
        }
    }
    
    let keyContent = '';
    if (key.imageData && key.imageData.startsWith('data:image/')) {
        keyContent = `<img class="palette-key-image" src="${key.imageData}" alt="${escapeHtml(key.label || 'Key image')}" />`;
    } else if (key.label) {
        keyContent = `<span class="palette-key-label">${escapeHtml(key.label)}</span>`;
    } else {
        keyContent = `<span class="palette-key-placeholder">+</span>`;
    }
    
    // Add overlay images
    let overlayImages = '';
    if (extraData.secondaryImageData) {
        overlayImages += `<img class="palette-secondary-image" src="${extraData.secondaryImageData}" alt="Secondary" />`;
    }
    if (extraData.tertiaryImageData) {
        overlayImages += `<img class="palette-tertiary-image" src="${extraData.tertiaryImageData}" alt="Tertiary" />`;
    }
    
    // Add info overlay with source information
    let infoText = '';
    if (extraData.userDescription) {
        infoText = extraData.userDescription;
    } else if (key.label) {
        infoText = key.label;
    } else {
        infoText = `Key ${index + 1}`;
    }
    
    // Add source layer and modifier info
    let sourceInfo = '';
    if (key.sourceInfo) {
        sourceInfo = key.sourceInfo.layer;
        if (key.sourceInfo.modifiers && key.sourceInfo.modifiers.length > 0) {
            sourceInfo += ` (${key.sourceInfo.modifiers.join('+')})`;
        }
    }
    
    keyElement.innerHTML = `
        <div class="palette-key-content">
            ${keyContent}
            <div class="palette-key-overlay-images">
                ${overlayImages}
            </div>
            <div class="palette-key-info">${escapeHtml(infoText)}</div>
            ${sourceInfo ? `<div class="palette-key-source">${escapeHtml(sourceInfo)}</div>` : ''}
            <button class="palette-key-delete-btn" title="Delete from palette">×</button>
        </div>
    `;
    
    // Add click handler for applying the key
    keyElement.addEventListener('click', (e) => {
        // Don't apply if clicking the delete button
        if (e.target.classList.contains('palette-key-delete-btn')) {
            return;
        }
        applyKeyFromPalette(key);
    });
    
    // Add delete button handler
    const deleteBtn = keyElement.querySelector('.palette-key-delete-btn');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this design from your palette? This cannot be undone.')) {
            // Remove from history
            if (deleteFromKeyPaletteHistory(key.id)) {
                // Remove from UI
                keyElement.remove();
                
                // If no keys left, show empty state
                const paletteGrid = document.getElementById('key-palette-grid');
                if (paletteGrid.children.length === 0) {
                    paletteGrid.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 2rem;">
                            <p>No custom key designs found.</p>
                            <p>Create some keys with images first!</p>
                        </div>
                    `;
                }
            }
        }
    });
    
    return keyElement;
}

function applyKeyFromPalette(sourceKey) {
    // Extract extra data from source key
    let extraData = {}
    if (sourceKey.description) {
        try {
            extraData = JSON.parse(sourceKey.description);
        } catch (e) {
            extraData = {};
        }
    }
    
    // Update the key editor form with the selected key's properties
    document.getElementById('key-label-input').value = sourceKey.label || '';
    document.getElementById('key-description-input').value = extraData.userDescription || '';
    document.getElementById('key-color-input').value = sourceKey.color || '#ffffff';
    
    // Update color label
    const colorLabel = document.querySelector('.color-label');
    if (colorLabel) {
        colorLabel.textContent = sourceKey.color || '#ffffff';
    }
    
    // Update image slots with the source key's images
    updateImageSlotDisplay('primary', sourceKey.imageData);
    updateImageSlotDisplay('secondary', extraData.secondaryImageData);
    updateImageSlotDisplay('tertiary', extraData.tertiaryImageData);
    
    // Store the source key's data for saving
    const keyModal = document.getElementById('key-editor-modal');
    if (sourceKey.imageData) {
        keyModal.dataset.pendingPrimaryImageData = sourceKey.imageData;
    }
    if (extraData.secondaryImageData) {
        keyModal.dataset.pendingSecondaryImageData = extraData.secondaryImageData;
    }
    if (extraData.tertiaryImageData) {
        keyModal.dataset.pendingTertiaryImageData = extraData.tertiaryImageData;
    }
    
    // Close the palette
    document.getElementById('key-palette-modal').style.display = 'none';
    
    // Visual feedback
    const paletteKeys = document.querySelectorAll('.palette-key');
    paletteKeys.forEach(key => key.classList.remove('selected'));
}

function updateImageSlotDisplay(slotType, imageData) {
    // Try to find slot in the active modal (key editor or palette key editor)
    let slot = null;
    const keyEditorModal = document.getElementById('key-editor-modal');
    const paletteKeyEditorModal = document.getElementById('palette-key-editor-modal');
    
    // Check which modal is currently active
    if (keyEditorModal && keyEditorModal.style.display !== 'none') {
        slot = keyEditorModal.querySelector(`[data-slot="${slotType}"]`);
    } else if (paletteKeyEditorModal && paletteKeyEditorModal.style.display !== 'none') {
        slot = paletteKeyEditorModal.querySelector(`[data-slot="${slotType}"]`);
    }
    
    // Fallback to any slot if neither modal is active
    if (!slot) {
        slot = document.querySelector(`[data-slot="${slotType}"]`);
    }
    
    if (!slot) return;
    
    if (imageData && imageData.startsWith('data:image/')) {
        updateSlotImage(slot, imageData, slotType);
    } else {
        clearSlotImage(slot, slotType);
    }
}

function clearModalData(modal) {
    // Clear all pending data
    delete modal.dataset.pendingPrimaryImageData;
    delete modal.dataset.pendingSecondaryImageData;
    delete modal.dataset.pendingTertiaryImageData;
    delete modal.dataset.removePrimary;
    delete modal.dataset.removeSecondary;
    delete modal.dataset.removeTertiary;
    
    // Clear file inputs
    const fileInputs = modal.querySelectorAll('.hidden-file-input');
    fileInputs.forEach(input => input.value = '');
}

function updatePaletteKeyEditorImageSlot(slotType, imageData) {
    // Find slot specifically in the palette key editor modal
    const modal = document.getElementById('palette-key-editor-modal');
    if (!modal) return;
    
    const slot = modal.querySelector(`[data-slot="${slotType}"]`);
    if (!slot) return;
    
    if (imageData && imageData.startsWith('data:image/')) {
        updateSlotImage(slot, imageData, slotType);
    } else {
        clearSlotImage(slot, slotType);
    }
}

function clearAllModalData() {
    // Clear data from both modals
    const keyEditorModal = document.getElementById('key-editor-modal');
    const paletteKeyEditorModal = document.getElementById('palette-key-editor-modal');
    
    if (keyEditorModal) {
        clearModalData(keyEditorModal);
    }
    
    if (paletteKeyEditorModal) {
        clearModalData(paletteKeyEditorModal);
    }
}

async function saveKeyEdit() {
    const modal = document.getElementById('key-editor-modal');
    const keyId = modal.dataset.editingKeyId;
    
    if (!keyId) {
        console.error('No key ID found for editing');
        return;
    }
    
    try {
        // Find the current key for other updates
        if (!currentKeys || !Array.isArray(currentKeys)) {
            console.error('currentKeys is not available or not an array');
            await loadCurrentLayer(); // Try to reload
            if (!currentKeys || !Array.isArray(currentKeys)) {
                throw new Error('Unable to load current keys');
            }
        }
        
        const key = currentKeys.find(k => k.id === keyId);
        if (key) {
            // Get values from form
            const newLabel = document.getElementById('key-label-input').value || '';
            const newColor = document.getElementById('key-color-input').value || '#ffffff';
            const newUserDescription = document.getElementById('key-description-input').value || '';
            
            // Check if anything was actually changed by the user
            let hasChanges = false;
            
            // Update label if changed
            if (newLabel !== (key.label || '')) {
                key.label = newLabel;
                hasChanges = true;
            }
            
            // Update color if changed (but don't consider this a "custom" change for palette purposes)
            if (newColor !== (key.color || '#ffffff')) {
                key.color = newColor;
                // Note: Color change alone doesn't make a key "custom" for the palette
            }
            
            // Parse existing description to extract extra data
            let extraData = {};
            
            // Try to parse existing description for extra data (preserving secondary/tertiary images)
            if (key.description) {
                try {
                    const parsed = JSON.parse(key.description);
                    // Keep existing extra data
                    extraData = parsed;
                } catch (e) {
                    // Old format, just text description - start fresh
                    extraData = {};
                }
            }
            
            // Update user description if changed
            if (newUserDescription !== (extraData.userDescription || '')) {
                extraData.userDescription = newUserDescription;
                hasChanges = true;
            }
            
            // Handle secondary image
            if (modal.dataset.pendingSecondaryImageData) {
                extraData.secondaryImageData = modal.dataset.pendingSecondaryImageData;
                hasChanges = true;
            }
            if (modal.dataset.removeSecondary === 'true') {
                delete extraData.secondaryImageData;
                hasChanges = true;
            }
            
            // Handle tertiary image
            if (modal.dataset.pendingTertiaryImageData) {
                extraData.tertiaryImageData = modal.dataset.pendingTertiaryImageData;
                hasChanges = true;
            }
            if (modal.dataset.removeTertiary === 'true') {
                delete extraData.tertiaryImageData;
                hasChanges = true;
            }
            
            // Handle primary image
            if (modal.dataset.pendingPrimaryImageData) {
                key.imageData = modal.dataset.pendingPrimaryImageData;
                hasChanges = true; // Image upload counts as a change
            }
            if (modal.dataset.removePrimary === 'true') {
                key.imageData = "";
                hasChanges = true;
            }
            
            // Store as JSON in description field
            key.description = JSON.stringify(extraData);
            
            console.log('Updating key with data:', key);
            
            // Update the key (this handles both base layer and modifier combinations)
            if (!activeModifiers || activeModifiers.length === 0) {
                await UpdateKey(JSON.stringify(key));
            } else {
                await UpdateModifierKey(JSON.stringify(key));
            }
            
        } else {
            throw new Error(`Key with ID ${keyId} not found in current keys`);
        }
        
        // Final reload and render
        await loadCurrentLayer();
        renderKeyboard();
        
        // Close modal
        modal.style.display = 'none';
        
        console.log('Key edit saved successfully');
        
    } catch (error) {
        console.error('Failed to save key:', error);
        alert('Failed to save key changes: ' + error.message);
    }
}

async function savePaletteKeyEdit() {
    const modal = document.getElementById('palette-key-editor-modal');
    const keyDataJson = modal.dataset.editingKeyData;
    
    if (!keyDataJson) {
        console.error('No key data found for editing');
        return;
    }
    
    try {
        // Parse the key data
        let keyData = JSON.parse(keyDataJson);
        
        // Get values from form
        const newLabel = document.getElementById('palette-key-label-input').value || '';
        const newColor = document.getElementById('palette-key-color-input').value || '#ffffff';
        const newUserDescription = document.getElementById('palette-key-description-input').value || '';
        
        // Update key data
        keyData.label = newLabel;
        keyData.color = newColor;
        
        // Parse existing description to extract extra data
        let extraData = {};
        if (keyData.description) {
            try {
                extraData = JSON.parse(keyData.description);
            } catch (e) {
                // Not JSON, treat as plain text description
                extraData = {};
            }
        }
        
        // Update user description
        extraData.userDescription = newUserDescription;
        
        // Handle images - check both pending data and current slot states
        if (modal.dataset.pendingPrimaryImageData) {
            keyData.imageData = modal.dataset.pendingPrimaryImageData;
        }
        if (modal.dataset.removePrimary === 'true') {
            keyData.imageData = "";
        }
        
        if (modal.dataset.pendingSecondaryImageData) {
            extraData.secondaryImageData = modal.dataset.pendingSecondaryImageData;
        }
        if (modal.dataset.removeSecondary === 'true') {
            delete extraData.secondaryImageData;
        }
        
        if (modal.dataset.pendingTertiaryImageData) {
            extraData.tertiaryImageData = modal.dataset.pendingTertiaryImageData;
        }
        if (modal.dataset.removeTertiary === 'true') {
            delete extraData.tertiaryImageData;
        }
        
        // Store as JSON in description field
        keyData.description = JSON.stringify(extraData);
        
        // Update the key in the palette history
        const index = keyPaletteHistory.findIndex(item => item.id === keyData.id);
        if (index !== -1) {
            keyPaletteHistory[index] = keyData;
            // Save to localStorage for persistence
            localStorage.setItem('keyPaletteHistory', JSON.stringify(keyPaletteHistory));
            console.log('Palette key updated successfully');
        } else {
            throw new Error(`Key with ID ${keyData.id} not found in palette history`);
        }
        
        // Close modal and reset handler setup flag
        modal.style.display = 'none';
        resetPaletteKeyEditorHandlerFlags();
        
        // Refresh persistent palette
        applyPaletteFilters();
        
        console.log('Palette key edit saved successfully');
        
    } catch (error) {
        console.error('Failed to save palette key:', error);
        alert('Failed to save palette key changes: ' + error.message);
    }
}

async function addCustomLayer() {
    const layerName = document.getElementById('layer-name').value.trim();
    
    if (!layerName) {
        alert('Please enter a layer name');
        return;
    }
    
    try {
        await AddCustomLayer(layerName);
        
        // Reload layers and update UI
        await loadLayers();
        renderLayerSelector();
        
        // Close modal and clear form
        document.getElementById('add-layer-modal').style.display = 'none';
        document.getElementById('layer-name').value = '';
        
        // Switch to the new layer
        currentLayer = layerName;
        await SetCurrentLayer(layerName);
        await loadCurrentLayer();
        renderKeyboard();
        
    } catch (error) {
        console.error('Failed to add layer:', error);
        alert('Failed to add layer: ' + error);
    }
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function isBlankKey(key) {
    // Check if key has any custom content (user-added images or labels)
    const hasImage = key.imageData && key.imageData.startsWith('data:image/');
    const hasLabel = key.label && key.label.trim() !== '';
    
    // Key is considered blank if it has no image and no labels
    return !hasImage && !hasLabel;
}

function isDefaultLabel(label) {
    // Since we've cleared all default labels from backend, 
    // any non-empty label is now considered custom
    return false;
}

// Initialize the app
initializeApp();

// Profile Management Functions

function setupProfileManagement() {
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-management-modal');
    const addProfileModal = document.getElementById('add-profile-modal');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const addNewProfileBtn = document.getElementById('add-new-profile-btn');
    const cancelAddProfile = document.getElementById('cancel-add-profile');
    const cancelEditProfile = document.getElementById('cancel-edit-profile');
    const deleteProfileBtn = document.getElementById('delete-profile-btn');
    
    if (!profileBtn || !profileModal || !addProfileModal || !editProfileModal) {
        console.warn('Profile management elements not found');
        return;
    }
    
    // Profile button click handler
    profileBtn.onclick = () => {
        showProfileManagementModal();
    };
    
    // Add new profile button handler
    addNewProfileBtn.onclick = () => {
        profileModal.style.display = 'none';
        addProfileModal.style.display = 'block';
    };
    
    // Cancel add profile handler
    cancelAddProfile.onclick = () => {
        addProfileModal.style.display = 'none';
        profileModal.style.display = 'block';
    };
    
    // Cancel edit profile handler
    cancelEditProfile.onclick = () => {
        editProfileModal.style.display = 'none';
        profileModal.style.display = 'block';
    };
    
    // Close button handlers for profile modals
    const profileCloseButtons = [profileModal, addProfileModal, editProfileModal].map(modal => modal?.querySelector('.close')).filter(btn => btn);
    profileCloseButtons.forEach(closeBtn => {
        closeBtn.onclick = () => {
            profileModal.style.display = 'none';
            addProfileModal.style.display = 'none';
            editProfileModal.style.display = 'none';
        };
    });
    
    // Click outside modal to close
    [profileModal, addProfileModal, editProfileModal].forEach(modal => {
        if (modal) {
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            };
        }
    });
    
    // Add profile form submission
    const addProfileForm = document.getElementById('add-profile-form');
    addProfileForm.onsubmit = async (e) => {
        e.preventDefault();
        await createNewProfile();
    };
    
    // Edit profile form submission
    const editProfileForm = document.getElementById('edit-profile-form');
    editProfileForm.onsubmit = async (e) => {
        e.preventDefault();
        await saveProfileEdits();
    };
    
    // Setup profile editor functionality
    setupProfileEditor();
    
    // Setup add profile form functionality
    setupAddProfileForm();
    
    // Update profile selector button appearance
    updateProfileSelectorButton();
}

function updateProfileSelectorButton() {
    const profileIconText = document.getElementById('profile-icon-text');
    const profileBtn = document.getElementById('profile-btn');
    
    if (!profileIconText || !profileBtn) {
        return;
    }
    
    if (activeProfile) {
        // Update icon
        if (activeProfile.icon && activeProfile.icon.startsWith('data:image/')) {
            profileIconText.innerHTML = `<img src="${activeProfile.icon}" alt="${activeProfile.name}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; border-radius: 6px;">`;
        } else {
            profileIconText.textContent = activeProfile.name.charAt(0).toUpperCase();
        }
        
        // Update background color
        profileBtn.style.backgroundColor = activeProfile.backgroundColor || '#6366f1';
        
        // Update tooltip
        profileBtn.title = `Switch profiles (Current: ${activeProfile.name})`;
    } else {
        // Default appearance
        profileIconText.textContent = 'P';
        profileBtn.style.backgroundColor = '#6366f1';
        profileBtn.title = 'Switch profiles';
    }
}

async function showProfileManagementModal() {
    const profileModal = document.getElementById('profile-management-modal');
    const profilesGrid = document.getElementById('profiles-grid');
    
    if (!profileModal || !profilesGrid) {
        return;
    }
    
    // Show loading state
    profilesGrid.innerHTML = `
        <div class="profiles-loading">
            <p>Loading profiles...</p>
        </div>
    `;
    
    profileModal.style.display = 'block';
    
    try {
        // Reload profiles to get latest data
        await loadProfiles();
        renderProfilesGrid();
    } catch (error) {
        console.error('Failed to load profiles:', error);
        profilesGrid.innerHTML = `
            <div class="profiles-error">
                <p>Error loading profiles: ${error.message}</p>
                <button onclick="showProfileManagementModal()">Retry</button>
            </div>
        `;
    }
}

function renderProfilesGrid() {
    const profilesGrid = document.getElementById('profiles-grid');
    
    if (!profilesGrid) {
        return;
    }
    
    if (!profiles || profiles.length === 0) {
        profilesGrid.innerHTML = `
            <div class="profiles-empty">
                <p>No profiles found.</p>
            </div>
        `;
        return;
    }
    
    profilesGrid.innerHTML = profiles.map(profile => {
        const isActive = activeProfile && activeProfile.id === profile.id;
        
        // Determine icon content
        let iconContent;
        if (profile.icon && profile.icon.startsWith('data:image/')) {
            iconContent = `<img src="${profile.icon}" alt="${profile.name}" class="profile-grid-icon-img">`;
        } else {
            iconContent = `<span>${profile.name.charAt(0).toUpperCase()}</span>`;
        }
        
        return `
            <div class="profile-grid-item-container">
                <div class="profile-grid-item ${isActive ? 'active' : ''}" 
                     data-profile-id="${profile.id}"
                     style="background-color: ${profile.backgroundColor || '#6366f1'};"
                     onclick="switchToProfile('${profile.id}')">
                    <div class="profile-grid-icon">
                        ${iconContent}
                    </div>
                    <button class="profile-grid-edit-cogwheel" data-profile-id="${profile.id}" title="Edit profile">
                        ⚙️
                    </button>
                </div>
                <div class="profile-grid-name">${escapeHtml(profile.name)}</div>
            </div>
        `;
    }).join('');
    
    // Add event listeners to profile items
    setupProfileGridEvents();
}

function setupProfileGridEvents() {
    // Edit profile cogwheel buttons
    document.querySelectorAll('.profile-grid-edit-cogwheel').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const profileId = btn.dataset.profileId;
            openProfileEditor(profileId);
        };
    });
}

// Make switchToProfile globally available for onclick handlers
window.switchToProfile = switchToProfile;

async function switchToProfile(profileId) {
    try {
        await SetActiveProfile(profileId);
        
        // Reload application state
        await loadProfiles();
        await loadCurrentLayer();
        await loadLayers();
        await loadActiveModifiers();
        await loadKeyboardType();
        
        // Update UI
        updateProfileSelectorButton();
        renderKeyboard();
        renderLayerSelector();
        renderModifierPanel();
        
        // Close modal and show success
        document.getElementById('profile-management-modal').style.display = 'none';
        
        console.log('Switched to profile:', profileId);
        
    } catch (error) {
        console.error('Failed to switch profile:', error);
        alert('Failed to switch profile: ' + error.message);
    }
}

async function createNewProfile() {
    const nameInput = document.getElementById('profile-name-input');
    const colorInput = document.getElementById('profile-color-input');
    const previewText = document.getElementById('add-profile-preview-text');
    
    if (!nameInput || !colorInput) {
        return;
    }
    
    const name = nameInput.value.trim();
    const backgroundColor = colorInput.value;
    
    if (!name) {
        alert('Please enter a profile name');
        return;
    }
    
    try {
        // Determine icon data
        let iconData = '';
        const imgElement = previewText.querySelector('img');
        if (imgElement && imgElement.src.startsWith('data:image/')) {
            iconData = imgElement.src;
        }
        
        // Create the profile
        const newProfileJson = await CreateNewProfile(name);
        const newProfile = JSON.parse(newProfileJson);
        
        // Update the profile's appearance with icon
        await UpdateProfileAppearance(newProfile.id, name, backgroundColor, iconData);
        
        // Reload profiles
        await loadProfiles();
        
        // Close modals
        document.getElementById('add-profile-modal').style.display = 'none';
        document.getElementById('profile-management-modal').style.display = 'none';
        
        // Clear form
        nameInput.value = '';
        colorInput.value = '#6366f1';
        document.getElementById('add-color-label').textContent = '#6366f1';
        document.getElementById('add-profile-icon-input').value = '';
        document.getElementById('remove-add-profile-icon').style.display = 'none';
        document.getElementById('add-profile-preview-key').style.backgroundColor = '#6366f1';
        previewText.innerHTML = 'P';
        
        console.log('Created new profile:', newProfile);
        
    } catch (error) {
        console.error('Failed to create profile:', error);
        alert('Failed to create profile: ' + error.message);
    }
}

async function deleteProfile(profileId) {
    try {
        await DeleteProfile(profileId);
        
        // Reload profiles and update UI
        await loadProfiles();
        updateProfileSelectorButton();
        renderProfilesGrid();
        
        // If we deleted the active profile, reload everything
        if (activeProfile && activeProfile.id === profileId) {
            await loadCurrentLayer();
            await loadLayers();
            await loadActiveModifiers();
            await loadKeyboardType();
            renderKeyboard();
            renderLayerSelector();
            renderModifierPanel();
        }
        
        console.log('Deleted profile:', profileId);
        
    } catch (error) {
        console.error('Failed to delete profile:', error);
        alert('Failed to delete profile: ' + error.message);
    }
}

function setupAddProfileForm() {
    const colorInput = document.getElementById('profile-color-input');
    const colorLabel = document.getElementById('add-color-label');
    const nameInput = document.getElementById('profile-name-input');
    const iconInput = document.getElementById('add-profile-icon-input');
    const removeIconBtn = document.getElementById('remove-add-profile-icon');
    const previewKey = document.getElementById('add-profile-preview-key');
    const previewText = document.getElementById('add-profile-preview-text');
    
    if (!colorInput || !colorLabel || !nameInput || !iconInput || !previewKey || !previewText) {
        return;
    }
    
    // Color input handler
    colorInput.oninput = (e) => {
        const color = e.target.value;
        colorLabel.textContent = color.toUpperCase();
        previewKey.style.backgroundColor = color;
    };
    
    // Name input handler
    nameInput.oninput = (e) => {
        const name = e.target.value || 'P';
        if (!previewText.querySelector('img')) {
            previewText.textContent = name.charAt(0).toUpperCase();
        }
    };
    
    // Icon upload handler
    iconInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                previewText.innerHTML = `<img src="${imageData}" alt="Profile Icon" style="width: 100%; height: 100%; object-fit: cover; object-position: center; border-radius: 6px;">`;
                removeIconBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };
    
    // Remove icon handler
    removeIconBtn.onclick = () => {
        previewText.innerHTML = nameInput.value ? nameInput.value.charAt(0).toUpperCase() : 'P';
        iconInput.value = '';
        removeIconBtn.style.display = 'none';
    };
}

let currentEditingProfileId = null;

function setupProfileEditor() {
    const colorInput = document.getElementById('edit-profile-color-input');
    const colorLabel = document.getElementById('edit-color-label');
    const nameInput = document.getElementById('edit-profile-name-input');
    const iconInput = document.getElementById('edit-profile-icon-input');
    const removeIconBtn = document.getElementById('remove-profile-icon');
    const previewKey = document.getElementById('profile-preview-key');
    const previewText = document.getElementById('profile-preview-text');
    
    if (!colorInput || !colorLabel || !nameInput || !iconInput || !previewKey || !previewText) {
        return;
    }
    
    // Color input handler
    colorInput.oninput = (e) => {
        const color = e.target.value;
        colorLabel.textContent = color.toUpperCase();
        previewKey.style.backgroundColor = color;
    };
    
    // Name input handler
    nameInput.oninput = (e) => {
        const name = e.target.value || 'P';
        if (!previewText.querySelector('img')) {
            previewText.textContent = name.charAt(0).toUpperCase();
        }
    };
    
    // Icon upload handler
    iconInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                previewText.innerHTML = `<img src="${imageData}" alt="Profile Icon" style="width: 100%; height: 100%; object-fit: cover; object-position: center; border-radius: 6px;">`;
                removeIconBtn.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };
    
    // Remove icon handler
    removeIconBtn.onclick = () => {
        previewText.innerHTML = nameInput.value ? nameInput.value.charAt(0).toUpperCase() : 'P';
        iconInput.value = '';
        removeIconBtn.style.display = 'none';
    };
}

function openProfileEditor(profileId) {
    if (!profiles) {
        console.error('profiles is not defined');
        return;
    }
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
        console.error('Profile not found:', profileId);
        return;
    }
    
    currentEditingProfileId = profileId;
    
    // Populate form fields
    const nameInput = document.getElementById('edit-profile-name-input');
    const colorInput = document.getElementById('edit-profile-color-input');
    const colorLabel = document.getElementById('edit-color-label');
    const iconInput = document.getElementById('edit-profile-icon-input');
    const removeIconBtn = document.getElementById('remove-profile-icon');
    const previewKey = document.getElementById('profile-preview-key');
    const previewText = document.getElementById('profile-preview-text');
    
    if (!nameInput || !colorInput || !previewKey || !previewText) {
        return;
    }
    
    // Set form values
    nameInput.value = profile.name;
    colorInput.value = profile.backgroundColor || '#6366f1';
    colorLabel.textContent = (profile.backgroundColor || '#6366f1').toUpperCase();
    
    // Set preview
    previewKey.style.backgroundColor = profile.backgroundColor || '#6366f1';
    
    if (profile.icon && profile.icon.startsWith('data:image/')) {
        previewText.innerHTML = `<img src="${profile.icon}" alt="Profile Icon" style="width: 100%; height: 100%; object-fit: cover; object-position: center; border-radius: 6px;">`;
        removeIconBtn.style.display = 'block';
    } else {
        previewText.textContent = profile.name.charAt(0).toUpperCase();
        removeIconBtn.style.display = 'none';
    }
    
    // Clear file input
    iconInput.value = '';
    
    // Show modal
    document.getElementById('profile-management-modal').style.display = 'none';
    document.getElementById('edit-profile-modal').style.display = 'block';
    
    // Setup delete handler now that modal is open
    const deleteBtn = document.getElementById('delete-profile-btn');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (!currentEditingProfileId) return;
            
            const profile = profiles.find(p => p.id === currentEditingProfileId);
            if (!profile) return;
            
            if (profiles.length <= 1) {
                alert('Cannot delete the last remaining profile.');
                return;
            }
            
            if (confirm(`Are you sure you want to delete the "${profile.name}" profile? This cannot be undone.`)) {
                try {
                    await deleteProfile(currentEditingProfileId);
                    document.getElementById('edit-profile-modal').style.display = 'none';
                    document.getElementById('profile-management-modal').style.display = 'block';
                    renderProfilesGrid();
                } catch (error) {
                    alert('Failed to delete profile: ' + error.message);
                }
            }
        };
    }
}

async function saveProfileEdits() {
    if (!currentEditingProfileId) {
        return;
    }
    
    const nameInput = document.getElementById('edit-profile-name-input');
    const colorInput = document.getElementById('edit-profile-color-input');
    const iconInput = document.getElementById('edit-profile-icon-input');
    const previewText = document.getElementById('profile-preview-text');
    
    if (!nameInput || !colorInput) {
        return;
    }
    
    const name = nameInput.value.trim();
    const backgroundColor = colorInput.value;
    
    if (!name) {
        alert('Please enter a profile name');
        return;
    }
    
    try {
        // Determine icon data
        let iconData = '';
        const imgElement = previewText.querySelector('img');
        if (imgElement && imgElement.src.startsWith('data:image/')) {
            iconData = imgElement.src;
        }
        
        // Update the profile
        await UpdateProfileAppearance(currentEditingProfileId, name, backgroundColor, iconData);
        
        // Reload profiles
        await loadProfiles();
        updateProfileSelectorButton();
        
        // Close modal and refresh grid
        document.getElementById('edit-profile-modal').style.display = 'none';
        document.getElementById('profile-management-modal').style.display = 'block';
        renderProfilesGrid();
        
        console.log('Profile updated successfully');
        
    } catch (error) {
        console.error('Failed to update profile:', error);
        alert('Failed to update profile: ' + error.message);
    } finally {
        currentEditingProfileId = null;
    }
}
