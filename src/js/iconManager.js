// Icon Manager - Handles desktop icon positioning, dragging, and selection
class IconManagerClass {
    constructor() {
        this.icons = new Map();
        this.selectedIcons = new Set();
        this.isDragging = false;
        this.isSelecting = false;
        this.suppressClearClick = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.selectionStart = { x: 0, y: 0 };
        this.gridSize = 20; // Snap to grid
        this.snapToGrid = true;
        this.autoArrange = true; // Automatically find next free grid cell on overlap
        
        this.defaultAppIcons = [
            { id: 'calculator', icon: '🔢', label: 'Calculator', type: 'app', x: 20, y: 20 },
            { id: 'notes', icon: '📝', label: 'Notes', type: 'app', x: 20, y: 130 },
            { id: 'explorer', icon: '📂', label: 'Explorer', type: 'app', x: 20, y: 240 },
            { id: 'settings', icon: '⚙️', label: 'Settings', type: 'app', x: 20, y: 350 },
            { id: 'about', icon: 'ℹ️', label: 'About', type: 'app', x: 20, y: 460 }
        ];
    }

    init() {
        this.loadIconPositions();
        this.createDefaultIcons();
        this.setupEventListeners();
        this.loadFileIcons();
    }

    loadIconPositions() {
        const saved = localStorage.getItem('iconPositions');
        if (saved) {
            const positions = JSON.parse(saved);
            positions.forEach(pos => {
                this.icons.set(pos.id, pos);
            });
        }
    }

    saveIconPositions() {
        const positions = Array.from(this.icons.values());
        localStorage.setItem('iconPositions', JSON.stringify(positions));
    }

    createDefaultIcons() {
        const desktop = document.getElementById('desktop');
        
        this.defaultAppIcons.forEach(iconData => {
            // Check if position is saved
            const savedIcon = this.icons.get(iconData.id);
            const position = savedIcon || iconData;
            
            if (!savedIcon) {
                this.icons.set(iconData.id, iconData);
            }
            
            this.createIcon(position, desktop);
        });
    }

    createIcon(iconData, container) {
        const desktop = container || document.getElementById('desktop');
        
        // Remove existing icon if it exists
        const existing = desktop.querySelector(`[data-icon-id="${iconData.id}"]`);
        if (existing) {
            existing.remove();
        }
        
        const iconEl = document.createElement('div');
        // Treat filesystem entries (file or folder) uniformly as file icons
        iconEl.className = (iconData.type === 'file' || iconData.type === 'folder') ? 'file-icon' : 'desktop-icon';
        iconEl.setAttribute('data-icon-id', iconData.id);
        iconEl.setAttribute('data-type', iconData.type);
        if (iconData.type === 'app') {
            iconEl.setAttribute('data-app', iconData.id);
        }
        
        iconEl.style.left = iconData.x + 'px';
        iconEl.style.top = iconData.y + 'px';
        
        iconEl.innerHTML = `
            <div class="icon">${iconData.icon}</div>
            <div class="icon-label">${iconData.label}</div>
        `;
        
        this.setupIconEvents(iconEl, iconData);
        desktop.appendChild(iconEl);
        
        return iconEl;
    }

    setupIconEvents(iconEl, iconData) {
        // Single click to select
        iconEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleIconClick(iconEl, e.ctrlKey || e.metaKey);
        });
        
        // Double click to open
        iconEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.handleIconDoubleClick(iconData);
        });
        
        // Drag to move
        iconEl.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click only
                this.startDraggingIcon(iconEl, e);
            }
        });
        
        // Right-click for context menu
        iconEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!this.selectedIcons.has(iconEl)) {
                this.clearSelection();
                this.selectIcon(iconEl);
            }
            ContextMenu.show(e.clientX, e.clientY, true);
        });
    }

    handleIconClick(iconEl, multiSelect) {
        if (multiSelect) {
            // Toggle selection
            if (this.selectedIcons.has(iconEl)) {
                this.deselectIcon(iconEl);
            } else {
                this.selectIcon(iconEl);
            }
        } else {
            // Single selection
            this.clearSelection();
            this.selectIcon(iconEl);
        }
    }

    handleIconDoubleClick(iconData) {
        if (iconData.type === 'app') {
            WindowManager.openApp(iconData.id);
        } else if (iconData.type === 'file') {
            // Use the raw file name (with extension) for filesystem operations
            const fileName = iconData.rawName || iconData.label;
            this.openFile(fileName);
        } else if (iconData.type === 'folder') {
            const folderName = iconData.id.replace('file_', '');
            WindowManager.openFolderInExplorer(folderName);
        }
    }

    async openFile(fileName) {
        const response = await window.electronAPI.readFile(fileName);
        if (response.success) {
            WindowManager.openFileInNotes(fileName, response.content);
        }
    }

    selectIcon(iconEl) {
        this.selectedIcons.add(iconEl);
        iconEl.classList.add('selected');
    }

    deselectIcon(iconEl) {
        this.selectedIcons.delete(iconEl);
        iconEl.classList.remove('selected');
    }

    clearSelection() {
        this.selectedIcons.forEach(icon => {
            icon.classList.remove('selected');
        });
        this.selectedIcons.clear();
    }

    selectAll() {
        const desktop = document.getElementById('desktop');
        const allIcons = desktop.querySelectorAll('.desktop-icon, .file-icon');
        allIcons.forEach(icon => this.selectIcon(icon));
    }

    startDraggingIcon(iconEl, e) {
        // If the clicked icon is not selected, select only it
        if (!this.selectedIcons.has(iconEl)) {
            this.clearSelection();
            this.selectIcon(iconEl);
        }
        
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        // Store initial positions for all selected icons
        this.dragInitialPositions = new Map();
        this.selectedIcons.forEach(icon => {
            this.dragInitialPositions.set(icon, {
                x: parseInt(icon.style.left) || 0,
                y: parseInt(icon.style.top) || 0
            });
            icon.classList.add('dragging');
        });
        
        const mouseMoveHandler = (e) => {
            if (this.isDragging) {
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                const deltaX = e.clientX - this.dragStartX;
                const deltaY = e.clientY - this.dragStartY;
                
                this.selectedIcons.forEach(icon => {
                    const initial = this.dragInitialPositions.get(icon);
                    let newX = initial.x + deltaX;
                    let newY = initial.y + deltaY;
                    
                    // Snap to grid if enabled
                    if (this.snapToGrid) {
                        newX = Math.round(newX / this.gridSize) * this.gridSize;
                        newY = Math.round(newY / this.gridSize) * this.gridSize;
                    }
                    
                    // Keep within bounds
                    const desktop = document.getElementById('desktop');
                    const maxX = desktop.clientWidth - 80;
                    const maxY = desktop.clientHeight - 90;
                    
                    newX = Math.max(0, Math.min(newX, maxX));
                    newY = Math.max(0, Math.min(newY, maxY));
                    
                    icon.style.left = newX + 'px';
                    icon.style.top = newY + 'px';
                });
            }
        };
        
        const mouseUpHandler = async (e) => {
            if (this.isDragging) {
                this.isDragging = false;

                // Remove dragging class
                this.selectedIcons.forEach(icon => icon.classList.remove('dragging'));

                // First: if files were dropped onto a folder, move them (supports multi-select)
                if (window.electronAPI && window.electronAPI.moveFile) {
                    const desktop = document.getElementById('desktop');
                    const folderIcons = Array.from(desktop.querySelectorAll('.file-icon[data-type="folder"]'));
                    let mx = (e && typeof e.clientX === 'number') ? e.clientX : this.lastMouseX;
                    let my = (e && typeof e.clientY === 'number') ? e.clientY : this.lastMouseY;
                    // For single selection, prefer the dragged icon center as drop coordinate
                    if (this.selectedIcons.size === 1) {
                        const dragged = Array.from(this.selectedIcons)[0];
                        const rect = dragged.getBoundingClientRect();
                        mx = rect.left + rect.width / 2;
                        my = rect.top + rect.height / 2;
                    }
                    const dropTarget = folderIcons.find(f => {
                        const r = f.getBoundingClientRect();
                        return mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom;
                    });
                    if (dropTarget) {
                        const folderAttr = dropTarget.getAttribute('data-icon-id');
                        const folderName = (folderAttr || '').replace(/^file_/, '');
                        const filesToMove = Array.from(this.selectedIcons).filter(el => el.getAttribute('data-type') === 'file');
                        if (filesToMove.length > 0) {
                            let anySuccess = false;
                            for (const el of filesToMove) {
                                const fileAttr = el.getAttribute('data-icon-id');
                                const fileName = (fileAttr || '').replace(/^file_/, '');
                                const res = await window.electronAPI.moveFile(fileName, `${folderName}/${fileName}`);
                                if (res && res.success) anySuccess = true;
                            }
                            if (anySuccess) {
                                if (typeof IconManager !== 'undefined' && IconManager.loadFileIcons) {
                                    IconManager.loadFileIcons();
                                }
                                // End drag early since icons will refresh
                                document.removeEventListener('mousemove', mouseMoveHandler);
                                document.removeEventListener('mouseup', mouseUpHandler);
                                return;
                            }
                        }
                    }
                }

                // Update stored positions to reflect final drop locations
                this.selectedIcons.forEach(icon => {
                    const iconId = icon.getAttribute('data-icon-id');
                    const iconData = this.icons.get(iconId);
                    if (iconData) {
                        iconData.x = parseInt(icon.style.left) || 0;
                        iconData.y = parseInt(icon.style.top) || 0;
                    }
                });

                // Enforce non-overlap: if any selected icon overlaps a non-selected icon, revert
                const desktop = document.getElementById('desktop');
                const allIcons = Array.from(desktop.querySelectorAll('.file-icon, .desktop-icon'));
                const selectedSet = new Set(this.selectedIcons);
                const others = allIcons.filter(i => !selectedSet.has(i));
                const intersects = (a, b) => {
                    const ra = a.getBoundingClientRect();
                    const rb = b.getBoundingClientRect();
                    return !(ra.right <= rb.left || ra.left >= rb.right || ra.bottom <= rb.top || ra.top >= rb.bottom);
                };
                let overlapFound = false;
                for (const s of this.selectedIcons) {
                    for (const o of others) {
                        if (intersects(s, o)) { overlapFound = true; break; }
                    }
                    if (overlapFound) break;
                }
                if (overlapFound) {
                    const desktop = document.getElementById('desktop');
                    const gridSize = this.gridSize || 20;
                    if (this.autoArrange) {
                        // Move to next free grid cell(s)
                        this.selectedIcons.forEach(icon => {
                            const posX = parseInt(icon.style.left) || 0;
                            const posY = parseInt(icon.style.top) || 0;
                            const othersNow = Array.from(desktop.querySelectorAll('.file-icon, .desktop-icon')).filter(i => !this.selectedIcons.has(i));
                            const free = this.findFreeGridPosition(posX, posY, icon, othersNow);
                            icon.style.left = `${free.x}` + 'px';
                            icon.style.top = `${free.y}` + 'px';
                            const iconId = icon.getAttribute('data-icon-id');
                            const iconData = this.icons.get(iconId);
                            if (iconData) { iconData.x = free.x; iconData.y = free.y; }
                        });
                    } else {
                        // Revert to initial positions
                        this.selectedIcons.forEach(icon => {
                            const pos = this.dragInitialPositions.get(icon);
                            if (pos) {
                                const x = Math.round(pos.x / gridSize) * gridSize;
                                const y = Math.round(pos.y / gridSize) * gridSize;
                                icon.style.left = `${x}px`;
                                icon.style.top = `${y}px`;
                                const iconId = icon.getAttribute('data-icon-id');
                                const iconData = this.icons.get(iconId);
                                if (iconData) { iconData.x = x; iconData.y = y; }
                            }
                        });
                    }
                }

                this.saveIconPositions();
            }

            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    // Find a free grid-aligned position near desired coordinates avoiding overlap with others
    findFreeGridPosition(desiredX, desiredY, iconEl, others) {
        const desktop = document.getElementById('desktop');
        const grid = this.gridSize || 20;
        const iconW = iconEl.offsetWidth || 80;
        const iconH = iconEl.offsetHeight || 90;
        const maxX = Math.max(0, (desktop.clientWidth || 800) - iconW);
        const maxY = Math.max(0, (desktop.clientHeight || 600) - iconH);
        const snap = (v) => Math.max(0, Math.min(Math.round(v / grid) * grid, maxX));
        const snapY = (v) => Math.max(0, Math.min(Math.round(v / grid) * grid, maxY));

        const startX = snap(desiredX);
        const startY = snapY(desiredY);

        const collides = (x, y) => {
            for (const o of others) {
                const ox = parseInt(o.style.left) || 0;
                const oy = parseInt(o.style.top) || 0;
                const ow = o.offsetWidth || 80;
                const oh = o.offsetHeight || 90;
                if (!(x + iconW <= ox || x >= ox + ow || y + iconH <= oy || y >= oy + oh)) {
                    return true;
                }
            }
            return false;
        };

        // Scan row-major from desired position to bottom-right
        for (let y = startY; y <= maxY; y += grid) {
            for (let x = startX; x <= maxX; x += grid) {
                if (!collides(x, y)) return { x, y };
            }
        }
        // Fallback: scan from top-left
        for (let y = 0; y <= maxY; y += grid) {
            for (let x = 0; x <= maxX; x += grid) {
                if (!collides(x, y)) return { x, y };
            }
        }
        // Final fallback: clamp desired
        return { x: startX, y: startY };
    }

    setupEventListeners() {
        const desktop = document.getElementById('desktop');
        
        // Click on empty desktop to clear selection
        desktop.addEventListener('click', (e) => {
            // If a drag selection just occurred, skip clearing on the synthetic click
            if (this.suppressClearClick) {
                this.suppressClearClick = false;
                return;
            }
            if (e.target === desktop) {
                this.clearSelection();
            }
        });
        
        // Drag selection rectangle: start when clicking anywhere on desktop
        // except when starting on icons, windows, or context menus
        desktop.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;

            const isIcon = e.target.closest('.desktop-icon, .file-icon');
            const isWindow = e.target.closest('.window');
            const isMenu = e.target.closest('.context-menu, .context-submenu');

            if (!isIcon && !isWindow && !isMenu) {
                this.startDragSelection(e);
            }
        });
        
        // Keyboard shortcuts (ignore when typing, inside windows, or when a modal is open)
        document.addEventListener('keydown', (e) => {
            // If a modal dialog is open, ignore desktop shortcuts entirely
            const modalOpen = !!document.querySelector('.modal-overlay');
            if (modalOpen) return;
            const active = document.activeElement;
            const tag = active && active.tagName ? active.tagName.toLowerCase() : '';
            const isTyping = tag === 'input' || tag === 'textarea' || (active && active.isContentEditable);
            const inWindow = !!(active && active.closest && active.closest('.window')) || !!(e.target && e.target.closest && e.target.closest('.window'));
            if (isTyping || inWindow) {
                // Let the app/window handle its own keyboard events
                return;
            }
            // Ctrl+A or Cmd+A to select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.selectAll();
            }
            
            // Delete key to delete selected files
            if (e.key === 'Delete') {
                this.deleteSelectedFiles();
            }
            
            // Escape to clear selection
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }

    startDragSelection(e) {
        this.isSelecting = true;
        this.suppressClearClick = true;
        this.selectionStart = {
            x: e.clientX,
            y: e.clientY
        };
        
        const selectionRect = document.getElementById('selectionRectangle');
        selectionRect.style.left = e.clientX + 'px';
        selectionRect.style.top = e.clientY + 'px';
        selectionRect.style.width = '0px';
        selectionRect.style.height = '0px';
        selectionRect.classList.add('active');
        
        // Clear previous selection if not holding Ctrl
        if (!e.ctrlKey && !e.metaKey) {
            this.clearSelection();
        }
        
        const mouseMoveHandler = (e) => {
            if (this.isSelecting) {
                const currentX = e.clientX;
                const currentY = e.clientY;
                
                const left = Math.min(this.selectionStart.x, currentX);
                const top = Math.min(this.selectionStart.y, currentY);
                const width = Math.abs(currentX - this.selectionStart.x);
                const height = Math.abs(currentY - this.selectionStart.y);
                
                selectionRect.style.left = left + 'px';
                selectionRect.style.top = top + 'px';
                selectionRect.style.width = width + 'px';
                selectionRect.style.height = height + 'px';
                
                // Select icons within rectangle
                this.selectIconsInRectangle(left, top, width, height, e.ctrlKey || e.metaKey);
            }
        };
        
        const mouseUpHandler = () => {
            this.isSelecting = false;
            selectionRect.classList.remove('active');
            
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            // Prevent the trailing click event from clearing the selection
            // Reset suppression on next tick so subsequent clicks behave normally
            setTimeout(() => { this.suppressClearClick = false; }, 0);
        };
        
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    // Return info for a single selected desktop entry (file or folder)
    getSingleSelectedEntry() {
        if (this.selectedIcons.size !== 1) return null;
        const [icon] = this.selectedIcons;
        if (!icon) return null;
        const type = icon.getAttribute('data-type');
        if (type !== 'file' && type !== 'folder') return null;
        const iconId = icon.getAttribute('data-icon-id');
        const name = iconId.replace('file_', '');
        return { name, type, icon, iconId };
    }

    selectIconsInRectangle(rectLeft, rectTop, rectWidth, rectHeight, addToSelection) {
        const desktop = document.getElementById('desktop');
        if (!desktop) return;
        const allIcons = desktop.querySelectorAll('.desktop-icon, .file-icon');

        // Use the computed rectangle bounds directly to avoid relying on DOM layout timing
        const selLeft = rectLeft;
        const selTop = rectTop;
        const selRight = rectLeft + rectWidth;
        const selBottom = rectTop + rectHeight;

        if (!addToSelection) {
            this.clearSelection();
        }

        allIcons.forEach(icon => {
            const r = icon.getBoundingClientRect();
            const intersects = !(r.right < selLeft || r.left > selRight || r.bottom < selTop || r.top > selBottom);
            if (intersects) {
                this.selectIcon(icon);
            }
        });
    }

    async loadFileIcons() {
        // Skip in non-Electron/browser preview where electronAPI is not available
        if (!window.electronAPI || !window.electronAPI.listFiles) {
            return;
        }
        const response = await window.electronAPI.listFiles();
        if (response.success) {
            // Remove old file/folder icons
            const desktop = document.getElementById('desktop');
            desktop.querySelectorAll('.file-icon, .folder-icon').forEach(el => el.remove());
            
            // Create new entry icons
            response.files.forEach((entry, index) => {
                this.createFileIcon(entry, index);
            });
        }
    }

    createFileIcon(entry, index) {
        const fileName = entry.name || entry;
        const type = entry.type || 'file';
        const iconId = `file_${fileName}`;

        // Display label: hide .txt extension for notes to match Explorer
        const displayLabel = (type === 'file' && typeof fileName === 'string' && fileName.toLowerCase().endsWith('.txt'))
            ? fileName.slice(0, -4)
            : fileName;

        // Check if position is saved
        let iconData = this.icons.get(iconId);

        if (!iconData) {
            // Default position: start from top-right, stack downward
            iconData = {
                id: iconId,
                icon: type === 'folder' ? '📁' : '📄',
                label: displayLabel,
                rawName: fileName,
                type,
                x: window.innerWidth - 120,
                y: 20 + (index * 110)
            };
            this.icons.set(iconId, iconData);
        } else {
            // Update label/type in case entry changed
            iconData.label = displayLabel;
            iconData.rawName = fileName;
            iconData.icon = type === 'folder' ? '📁' : '📄';
            iconData.type = type;
        }

        this.createIcon(iconData);
    }

    placeNewEntryIcon(name, type, clickX, clickY) {
        const iconId = `file_${name}`;
        const desktop = document.getElementById('desktop');
        const maxX = desktop.clientWidth - 80;
        const maxY = desktop.clientHeight - 90;
        let newX = Math.max(0, Math.min((clickX - 40), maxX));
        let newY = Math.max(0, Math.min((clickY - 45), maxY));
        if (this.snapToGrid) {
            newX = Math.round(newX / this.gridSize) * this.gridSize;
            newY = Math.round(newY / this.gridSize) * this.gridSize;
        }
        // Display label: hide .txt extension for notes
        const displayLabel = (type === 'file' && typeof name === 'string' && name.toLowerCase().endsWith('.txt'))
            ? name.slice(0, -4)
            : name;
        const iconData = {
            id: iconId,
            icon: type === 'folder' ? '📁' : '📄',
            label: displayLabel,
            rawName: name,
            type,
            x: newX,
            y: newY
        };
        this.icons.set(iconId, iconData);
        this.createIcon(iconData);
        this.saveIconPositions();
    }

    async deleteSelectedFiles() {
        const entriesToDelete = [];

        this.selectedIcons.forEach(icon => {
            const iconType = icon.getAttribute('data-type');
            if (iconType === 'file' || iconType === 'folder') {
                const iconId = icon.getAttribute('data-icon-id');
                const fileName = iconId.replace('file_', '');
                entriesToDelete.push({ fileName, icon, iconId });
            }
        });

        if (entriesToDelete.length > 0) {
            const ok = await UI.showConfirmDialog({
                title: 'Delete',
                message: `Delete ${entriesToDelete.length} item(s)?`,
                confirmText: 'Delete',
                cancelText: 'Cancel'
            });
            if (ok) {
                for (const entry of entriesToDelete) {
                    const response = await window.electronAPI.deleteFile(entry.fileName);
                    if (response.success) {
                        entry.icon.remove();
                        this.icons.delete(entry.iconId);
                        this.selectedIcons.delete(entry.icon);
                    } else {
                        UI.showToast({ message: `Failed to delete ${entry.fileName}: ${response.error}`, type: 'error', duration: 2400 });
                    }
                }
                this.saveIconPositions();
            }
        }
    }

    getSelectedFileCount() {
        let count = 0;
        this.selectedIcons.forEach(icon => {
            const type = icon.getAttribute('data-type');
            if (type === 'file' || type === 'folder') {
                count++;
            }
        });
        return count;
    }
}

// Create global instance
const IconManager = new IconManagerClass();
