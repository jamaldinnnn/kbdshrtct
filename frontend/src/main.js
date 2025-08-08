import './style.css';
import './app.css';

import {
    GetCurrentLayer,
    GetAvailableLayers,
    SetCurrentLayer,
    UpdateKey,
    UpdateModifierKey,
    SetActiveModifiers,
    GetActiveModifiers,
    GetAvailableModifiers,
    AddCustomLayer,
    RemoveCustomLayer,
    UploadKeyImage,
    RemoveKeyImage,
    GetKeyImage,
    ExportLayout,
    ImportLayout,
    GetKeyboardType,
    SetKeyboardType,
    GetAvailableKeyboardTypes
} from '../wailsjs/go/main/App';

// Global state
let currentKeys = [];
let currentLayer = 'base';
let currentKeyboardType = 'corne'; // 'corne' or 'tenkeyless'
let availableLayers = [];
let activeModifiers = [];
let availableModifiers = [];
let keyPaletteHistory = []; // Persistent library of custom key designs

// Zoom and pan state
let zoomLevel = 1.0;
let panX = 0;
let panY = 0;
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        console.log('Initializing app...');
        
        // Load palette history first
        loadKeyPaletteHistory();
        
        // Load initial data in sequence to avoid race conditions
        console.log('Loading keyboard type...');
        await loadKeyboardType();
        
        console.log('Loading layers...');
        await loadLayers();
        
        console.log('Loading available modifiers...');
        await loadAvailableModifiers();
        
        console.log('Loading active modifiers...');
        await loadActiveModifiers();
        
        console.log('Loading current layer...');
        await loadCurrentLayer();
        
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
            currentKeys = JSON.parse(keysJson);
            console.log(`Loaded ${currentKeys.length} keys for ${currentKeyboardType}`);
            console.log('First few key IDs:', currentKeys.slice(0, 10).map(k => k.id));
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
        availableModifiers = JSON.parse(modsJson);
    } catch (error) {
        console.error('Failed to load available modifiers:', error);
        availableModifiers = ['ctrl', 'shift', 'alt', 'gui'];
    }
}

async function loadActiveModifiers() {
    try {
        const activeJson = await GetActiveModifiers();
        if (activeJson && activeJson !== "null") {
            activeModifiers = JSON.parse(activeJson);
        } else {
            activeModifiers = [];
        }
    } catch (error) {
        console.error('Failed to load active modifiers:', error);
        activeModifiers = [];
    }
}

function renderApp() {
    document.querySelector('#app').innerHTML = `
        <div class="keyboard-app">
            <header class="app-header">
                <h1>kbdshrtct (α build)</h1>
                <div class="controls">
                    <div id="keyboard-type-selector" class="keyboard-type-selector"></div>
                    <div id="layer-selector"></div>
                    <div class="zoom-controls">
                        <button id="zoom-out-btn" class="btn-secondary">-</button>
                        <span id="zoom-display" class="zoom-display">100%</span>
                        <button id="zoom-in-btn" class="btn-secondary">+</button>
                        <button id="zoom-reset-btn" class="btn-secondary">Reset</button>
                    </div>
                    <div class="layer-controls">
                        <button id="add-layer-btn" class="btn-secondary">+ Add Layer</button>
                        <button id="remove-layer-btn" class="btn-secondary">- Remove</button>
                        <button id="reset-positions-btn" class="btn-secondary">Reset Layout</button>
                    </div>
                </div>
            </header>
            
            <div class="main-content">
                <aside class="modifier-panel" id="modifier-panel">
                    <h3>Active Modifiers</h3>
                    <div id="current-modifier-display" class="current-modifier"></div>
                    <div class="modifier-selector" id="modifier-selector"></div>
                </aside>
                
                <main class="keyboard-container" id="keyboard-container">
                    <div id="keyboard-layout" class="keyboard-layout"></div>
                </main>
            </div>
        </div>
        
        <!-- Key Editor Modal -->
        <div id="key-editor-modal" class="modal" style="display: none;">
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
        <div id="key-palette-modal" class="modal" style="display: none;">
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
        
        <!-- Add Layer Modal -->
        <div id="add-layer-modal" class="modal" style="display: none;">
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
    `;
    
    // Set up modal controls
    setupModalControls();
    
    // Render keyboard type selector
    renderKeyboardTypeSelector();
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
    const closeBtns = document.querySelectorAll('.close');
    const cancelEditBtn = document.getElementById('cancel-key-edit');
    const saveEditBtn = document.getElementById('save-key-edit');
    const openPaletteBtn = document.getElementById('open-palette-btn');
    const addToPaletteBtn = document.getElementById('add-to-palette-btn');
    const cancelAddLayerBtn = document.getElementById('cancel-add-layer');
    
    // Close button handlers
    closeBtns.forEach(btn => {
        btn.onclick = () => {
            keyModal.style.display = 'none';
            layerModal.style.display = 'none';
            paletteModal.style.display = 'none';
        };
    });
    
    // Cancel button handlers
    cancelEditBtn.onclick = () => {
        keyModal.style.display = 'none';
        paletteModal.style.display = 'none';
    };
    cancelAddLayerBtn.onclick = () => layerModal.style.display = 'none';
    
    // Save button handler
    saveEditBtn.onclick = async () => {
        await saveKeyEdit();
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
    };
    
    // Add Layer Modal form submission
    document.getElementById('add-layer-form').onsubmit = async (e) => {
        e.preventDefault();
        await addCustomLayer();
    };
    
    // Layer management button handlers
    document.getElementById('add-layer-btn').onclick = () => {
        layerModal.style.display = 'block';
    };
    
    document.getElementById('remove-layer-btn').onclick = async () => {
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
    
    // Reset positions button handler
    document.getElementById('reset-positions-btn').onclick = async () => {
        if (confirm('Are you sure you want to reset all keys to their default positions? This cannot be undone.')) {
            try {
                await resetKeyPositions();
                await loadCurrentLayer();
                renderKeyboard();
                console.log('Key positions reset to defaults');
            } catch (error) {
                console.error('Failed to reset positions:', error);
                alert('Failed to reset key positions: ' + error);
            }
        }
    };
    
    // Zoom control handlers
    setupZoomControls();
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
        
        // Store for saving
        const modal = document.getElementById('key-editor-modal');
        modal.dataset[`pending${slotType.charAt(0).toUpperCase() + slotType.slice(1)}ImageData`] = imageData;
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
    const modal = document.getElementById('key-editor-modal');
    const dataKey = `pending${slotType.charAt(0).toUpperCase() + slotType.slice(1)}ImageData`;
    delete modal.dataset[dataKey];
    
    // Mark for removal if it was previously saved
    const removeKey = `remove${slotType.charAt(0).toUpperCase() + slotType.slice(1)}`;
    modal.dataset[removeKey] = 'true';
}

function setupZoomControls() {
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    const keyboardContainer = document.getElementById('keyboard-container');
    
    // Zoom in
    zoomInBtn.onclick = () => {
        zoomLevel = Math.min(zoomLevel * 1.25, 3.0);
        applyZoomAndPan();
    };
    
    // Zoom out
    zoomOutBtn.onclick = () => {
        zoomLevel = Math.max(zoomLevel / 1.25, 0.25);
        applyZoomAndPan();
    };
    
    // Reset zoom and pan
    zoomResetBtn.onclick = () => {
        zoomLevel = 1.0;
        panX = 0;
        panY = 0;
        applyZoomAndPan();
    };
    
    // Mouse wheel zoom
    keyboardContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        const rect = keyboardContainer.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate mouse position relative to container center
        const mouseX = e.clientX - rect.left - centerX;
        const mouseY = e.clientY - rect.top - centerY;
        
        const oldZoom = zoomLevel;
        
        // Zoom in/out based on wheel direction
        if (e.deltaY < 0) {
            zoomLevel = Math.min(zoomLevel * 1.1, 3.0);
        } else {
            zoomLevel = Math.max(zoomLevel / 1.1, 0.25);
        }
        
        // Adjust pan to zoom into mouse position
        const zoomFactor = zoomLevel / oldZoom;
        panX = mouseX - (mouseX - panX) * zoomFactor;
        panY = mouseY - (mouseY - panY) * zoomFactor;
        
        applyZoomAndPan();
    });
    
    // Pan functionality
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    
    keyboardContainer.addEventListener('mousedown', (e) => {
        // Only start panning if not clicking on a key
        if (!e.target.closest('.key')) {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            keyboardContainer.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            panX += deltaX;
            panY += deltaY;
            
            lastX = e.clientX;
            lastY = e.clientY;
            
            applyZoomAndPan();
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            keyboardContainer.style.cursor = '';
        }
    });
}

function applyZoomAndPan() {
    const keyboardLayout = document.getElementById('keyboard-layout');
    if (!keyboardLayout) return;
    
    keyboardLayout.style.transform = `scale(${zoomLevel}) translate(${panX / zoomLevel}px, ${panY / zoomLevel}px)`;
    keyboardLayout.style.transformOrigin = 'center center';
    
    // Update zoom display
    const zoomDisplay = document.getElementById('zoom-display');
    if (zoomDisplay) {
        zoomDisplay.textContent = `${Math.round(zoomLevel * 100)}%`;
    }
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
}

function renderCorneKeyboard(container) {
    // Separate left and right keys
    const leftKeys = currentKeys.filter(key => key.side === 'left').sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
    });
    
    const rightKeys = currentKeys.filter(key => key.side === 'right').sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
    });
    
    container.innerHTML = `
        <div class="keyboard-split">
            <div class="keyboard-half left-half">
                <div class="keys-grid left-grid">
                    ${renderKeyGrid(leftKeys, 'left')}
                </div>
            </div>
            
            <div class="keyboard-gap"></div>
            
            <div class="keyboard-half right-half">
                <div class="keys-grid right-grid">
                    ${renderKeyGrid(rightKeys, 'right')}
                </div>
            </div>
        </div>
    `;
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
        } else if (key.label) {
            keyContent = `<span class="key-label">${escapeHtml(key.label)}</span>`;
        } else {
            keyContent = `<span class="key-placeholder">+</span>`;
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
        
        // Calculate position based on row and col - proper tenkeyless spacing with row stagger
        const keyWidth = 60; 
        const keyHeight = 60; 
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
        let tooltipText = key.label || 'Click to add image';
        if (extraData.userDescription) {
            tooltipText = extraData.userDescription;
        }
        
        // Special styling for different key types
        let keyClass = `key ${key.keyType}`;
        let keyStyle = `background-color: ${key.color}; left: ${left}px; top: ${top}px; position: absolute;`;
        
        // Special widths for certain keys (adjust based on stagger)
        if (key.keyType === 'spacebar') {
            keyStyle += ' width: 410px;'; // Spacebar width to just reach right Alt
        } else if (key.id === 'BACKSPACE') {
            keyStyle += ' width: 90px;';
        } else if (key.id === 'TAB') {
            keyStyle += ' width: 90px;';
        } else if (key.id === 'CAPS') {
            keyStyle += ' width: 100px;';
        } else if (key.id === 'ENTER') {
            keyStyle += ' width: 120px;';
        } else if (key.id === 'LSHIFT') {
            keyStyle += ' width: 120px;';
        } else if (key.id === 'RSHIFT') {
            keyStyle += ' width: 140px;';
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
    
    // Define exact Corne layout positions based on corne.png
    const corneLayout = {
        left: {
            // Left hand positions - should match RIGHT side of corne.png (since we're looking at it from user perspective)
            positions: [
                // Column 0 (leftmost for left hand)
                {col: 0, row: 0, x: 0, y: 30},
                {col: 0, row: 1, x: 0, y: 90},
                {col: 0, row: 2, x: 0, y: 150},
                // Column 1
                {col: 1, row: 0, x: 60, y: 30},
                {col: 1, row: 1, x: 60, y: 90},
                {col: 1, row: 2, x: 60, y: 150},
                // Column 2
                {col: 2, row: 0, x: 120, y: 20},
                {col: 2, row: 1, x: 120, y: 80},
                {col: 2, row: 2, x: 120, y: 140},
                // Column 3
                {col: 3, row: 0, x: 180, y: 0},
                {col: 3, row: 1, x: 180, y: 60},
                {col: 3, row: 2, x: 180, y: 120},
                // Column 4
                {col: 4, row: 0, x: 240, y: 10},
                {col: 4, row: 1, x: 240, y: 70},
                {col: 4, row: 2, x: 240, y: 130},
                // Column 5 (rightmost on left half)
                {col: 5, row: 0, x: 300, y: 20},
                {col: 5, row: 1, x: 300, y: 80},
                {col: 5, row: 2, x: 300, y: 140},
            ],
            thumbs: [
                {col: 0, x: 220, y: 190},
                {col: 1, x: 280, y: 200},
                {col: 2, x: 340, y: 200}
            ]
        },
        right: {
            // Right hand positions - should match LEFT side of corne.png
            positions: [
                // Column 0 (leftmost on right half)
                {col: 0, row: 0, x: 0, y: 20},
                {col: 0, row: 1, x: 0, y: 80},
                {col: 0, row: 2, x: 0, y: 140},
                // Column 1
                {col: 1, row: 0, x: 60, y: 10},
                {col: 1, row: 1, x: 60, y: 70},
                {col: 1, row: 2, x: 60, y: 130},
                // Column 2
                {col: 2, row: 0, x: 120, y: 0},
                {col: 2, row: 1, x: 120, y: 60},
                {col: 2, row: 2, x: 120, y: 120},
                // Column 3
                {col: 3, row: 0, x: 180, y: 20},
                {col: 3, row: 1, x: 180, y: 80},
                {col: 3, row: 2, x: 180, y: 140},
                // Column 4
                {col: 4, row: 0, x: 240, y: 30},
                {col: 4, row: 1, x: 240, y: 90},
                {col: 4, row: 2, x: 240, y: 150},
                // Column 5 (rightmost)
                {col: 5, row: 0, x: 300, y: 30},
                {col: 5, row: 1, x: 300, y: 90},
                {col: 5, row: 2, x: 300, y: 150},
            ],
            thumbs: [
                {col: 0, x: -40, y: 200},
                {col: 1, x: 20, y: 200},
                {col: 2, x: 80, y: 190}
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
        } else if (key.label) {
            keyContent = `<span class="key-label">${escapeHtml(key.label)}</span>`;
        } else {
            keyContent = `<span class="key-placeholder">+</span>`;
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
        
        const left = key.isCustomPosition ? key.customX : position.x;
        const top = key.isCustomPosition ? key.customY : position.y;
        
        // Get tooltip text from description
        let tooltipText = key.label || 'Click to add image';
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
                 style="background-color: ${key.color}; left: ${left}px; top: ${top}px;"
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
        } else if (key.label) {
            keyContent = `<span class="key-label">${escapeHtml(key.label)}</span>`;
        } else {
            keyContent = `<span class="key-placeholder">+</span>`;
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
        
        const left = key.isCustomPosition ? key.customX : thumbPos.x;
        const top = key.isCustomPosition ? key.customY : thumbPos.y;
        
        // Get tooltip text from description
        let tooltipText = key.label || 'Click to add image';
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
                 style="background-color: ${key.color}; left: ${left}px; top: ${top}px;"
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
    
    // Ensure activeModifiers and availableModifiers are initialized
    if (!Array.isArray(activeModifiers)) activeModifiers = [];
    if (!Array.isArray(availableModifiers)) availableModifiers = ['ctrl', 'shift', 'alt', 'gui'];
    
    // Display current active modifiers
    const displayText = activeModifiers.length > 0 
        ? activeModifiers.map(mod => mod.charAt(0).toUpperCase() + mod.slice(1)).join(' + ')
        : 'None';
    
    displayContainer.innerHTML = `
        <div class="current-mod-display">
            <strong>Active: ${displayText}</strong>
        </div>
    `;
    
    // Render modifier checkboxes
    selectorContainer.innerHTML = availableModifiers.map(modifier => `
        <label class="modifier-checkbox">
            <input type="checkbox" value="${modifier}" ${activeModifiers.includes(modifier) ? 'checked' : ''}>
            <span class="modifier-label">${modifier.charAt(0).toUpperCase() + modifier.slice(1)}</span>
        </label>
    `).join('');
    
    // Add change handlers
    selectorContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.onchange = async () => {
            // Get all checked modifiers
            const checkedBoxes = selectorContainer.querySelectorAll('input[type="checkbox"]:checked');
            const newModifiers = Array.from(checkedBoxes).map(cb => cb.value);
            
            try {
                await SetActiveModifiers(JSON.stringify(newModifiers));
                activeModifiers = newModifiers;
                await loadCurrentLayer();
                renderKeyboard();
                renderModifierPanel(); // Update display
            } catch (error) {
                console.error('Failed to set active modifiers:', error);
                // Revert checkbox state on failure
                checkbox.checked = activeModifiers.includes(checkbox.value);
            }
        };
    });
}

function addKeyClickHandlers() {
    document.querySelectorAll('.key').forEach(keyElement => {
        let isDragging = false;
        let dragStartTime = 0;
        let dragStartX = 0;
        let dragStartY = 0;
        let keyStartX = 0;
        let keyStartY = 0;

        // Mouse down event
        keyElement.addEventListener('mousedown', (e) => {
            dragStartTime = Date.now();
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            // Get key's current position from its style properties (pre-transform coordinates)
            keyStartX = parseFloat(keyElement.style.left) || 0;
            keyStartY = parseFloat(keyElement.style.top) || 0;
            
            // Ensure absolute positioning
            if (keyElement.style.position !== 'absolute') {
                keyElement.style.position = 'absolute';
                keyElement.style.left = keyStartX + 'px';
                keyElement.style.top = keyStartY + 'px';
            }
            
            // Prevent text selection
            e.preventDefault();
        });

        // Mouse move event
        const handleMouseMove = (e) => {
            if (!isDragging) {
                // Check if we should start dragging (hold for 200ms or move 10px)
                const timeSinceStart = Date.now() - dragStartTime;
                const distanceMoved = Math.sqrt(
                    Math.pow(e.clientX - dragStartX, 2) + 
                    Math.pow(e.clientY - dragStartY, 2)
                );
                
                if (timeSinceStart > 200 || distanceMoved > 10) {
                    isDragging = true;
                    keyElement.classList.add('dragging');
                    keyElement.style.zIndex = '1000';
                    // Position is already absolute from mousedown
                }
            }

            if (isDragging) {
                const deltaX = (e.clientX - dragStartX) / zoomLevel;
                const deltaY = (e.clientY - dragStartY) / zoomLevel;
                
                let newX = keyStartX + deltaX;
                let newY = keyStartY + deltaY;
                
                keyElement.style.left = newX + 'px';
                keyElement.style.top = newY + 'px';
            }
        };

        // Mouse up event
        const handleMouseUp = (e) => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            
            if (isDragging) {
                isDragging = false;
                keyElement.classList.remove('dragging');
                keyElement.style.zIndex = '';
                
                // Save the new position
                saveKeyPosition(keyElement);
            } else {
                // If not dragging, treat as click
                const keyId = keyElement.dataset.keyId;
                const key = currentKeys.find(k => k.id === keyId);
                if (key) {
                    showKeyEditor(key);
                }
            }
        };

        // Add global event listeners when mouse is pressed
        keyElement.addEventListener('mousedown', () => {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
    });
}

async function saveKeyPosition(keyElement) {
    const keyId = keyElement.dataset.keyId;
    const key = currentKeys.find(k => k.id === keyId);
    
    if (key) {
        // Update key position in data relative to the keys-grid container
        const container = keyElement.closest('.keys-grid');
        const containerRect = container.getBoundingClientRect();
        const keyRect = keyElement.getBoundingClientRect();
        
        // Store position as custom properties
        key.customX = keyRect.left - containerRect.left;
        key.customY = keyRect.top - containerRect.top;
        key.isCustomPosition = true;
        
        try {
            // Update the key (this handles both base layer and modifier combinations)
            if (!activeModifiers || activeModifiers.length === 0) {
                await UpdateKey(JSON.stringify(key));
            } else {
                await UpdateModifierKey(JSON.stringify(key));
            }
            
            console.log('Key position saved:', keyId, key.customX, key.customY);
        } catch (error) {
            console.error('Failed to save key position:', error);
        }
    }
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
    clearModalData(modal);
    
    // Store the key ID for saving
    modal.dataset.editingKeyId = key.id;
    
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
    tempKey.color = document.getElementById('key-color-input').value || '#ffffff';
    
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
        return true;
    }
    return false;
}

function addToKeyPaletteHistory(key) {
    // Create a design object with just the visual properties
    const design = {
        id: `design_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
        imageData: key.imageData || null,
        label: key.label || '',
        color: key.color || '#ffffff',
        description: key.description || '{}',
        timestamp: Date.now(),
        sourceLayer: currentLayer,
        sourceModifiers: [...activeModifiers]
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
    }
}

function loadKeyPaletteHistory() {
    try {
        const saved = localStorage.getItem('keyPaletteHistory');
        if (saved) {
            keyPaletteHistory = JSON.parse(saved);
            console.log('Loaded palette history:', keyPaletteHistory.length, 'designs');
        }
    } catch (error) {
        console.error('Failed to load palette history:', error);
        keyPaletteHistory = [];
    }
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
    let extraData = {};
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
    const slot = document.querySelector(`[data-slot="${slotType}"]`);
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

async function saveKeyEdit() {
    const modal = document.getElementById('key-editor-modal');
    const keyId = modal.dataset.editingKeyId;
    
    if (!keyId) {
        console.error('No key ID found for editing');
        return;
    }
    
    try {
        // Handle primary image upload if there's pending image data
        if (modal.dataset.pendingPrimaryImageData) {
            console.log('Uploading primary image for key:', keyId);
            await UploadKeyImage(keyId, modal.dataset.pendingPrimaryImageData);
            console.log('Primary image upload successful');
            // After uploading image, reload current layer to get updated data with image
            await loadCurrentLayer();
        }
        
        // Find the current key for other updates (now includes image data if uploaded)
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
            
            // Handle primary image (already uploaded above if present)
            if (modal.dataset.pendingPrimaryImageData) {
                hasChanges = true; // Image upload counts as a change
            }
            if (modal.dataset.removePrimary === 'true') {
                // Remove primary image from key
                try {
                    await RemoveKeyImage(keyId);
                    console.log('Primary image removed successfully');
                    // Reload current layer to get updated key data without image
                    await loadCurrentLayer();
                    // Update the key reference to the newly loaded data
                    const updatedKey = currentKeys.find(k => k.id === keyId);
                    if (updatedKey) {
                        // Copy fresh data but preserve our current changes
                        key.imageData = updatedKey.imageData; // Should be null/empty now
                        key.label = newLabel; // Keep our label change
                        key.color = newColor; // Keep our color change
                        // Description will be updated below with extraData
                    }
                    hasChanges = true;
                } catch (error) {
                    console.error('Failed to remove primary image:', error);
                    alert('Failed to remove primary image: ' + error.message);
                }
            }
            
            // Store as JSON in description field
            key.description = JSON.stringify(extraData);
            
            // Mark key as user-modified if any changes were made
            if (hasChanges) {
                key.userModified = true; // Add explicit flag
            }
            
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

async function resetKeyPositions() {
    if (!currentKeys || !Array.isArray(currentKeys)) {
        console.error('No current keys available to reset');
        return;
    }

    // Reset custom position data for all keys
    for (let key of currentKeys) {
        if (key.isCustomPosition) {
            key.customX = 0;
            key.customY = 0;
            key.isCustomPosition = false;
            
            try {
                // Update the key (this handles both base layer and modifier combinations)
                if (!activeModifiers || activeModifiers.length === 0) {
                    await UpdateKey(JSON.stringify(key));
                } else {
                    await UpdateModifierKey(JSON.stringify(key));
                }
            } catch (error) {
                console.error('Failed to reset key position for:', key.id, error);
            }
        }
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize the app
initializeApp();
