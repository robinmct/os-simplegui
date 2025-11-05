// Context Menu Handler
class ContextMenuClass {
    constructor() {
        this.menu = document.getElementById('contextMenu');
        this.newSubmenu = document.getElementById('newSubmenu');
        this.hasSelectedIcons = false;
        this.lastX = 0;
        this.lastY = 0;
        this.submenuHideTimer = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Right-click on desktop
        const desktop = document.getElementById('desktop');
        desktop.addEventListener('contextmenu', (e) => {
            // Only show if clicking on desktop itself, not on icons
            if (e.target === desktop) {
                e.preventDefault();
                this.show(e.clientX, e.clientY, false);
            }
        });

        // Menu item clicks
        this.menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.getAttribute('data-action');
                
                // Check if item is disabled
                if (item.classList.contains('disabled')) {
                    return;
                }
                
                // 'New' is hover-driven; clicking it does nothing
                if (action === 'new') return;
                this.handleAction(action);
                this.hide();
            });
        });

        // Hover interactions for 'New' submenu
        const newItem = this.menu.querySelector('[data-action="new"]');
        if (newItem) {
            newItem.addEventListener('mouseenter', () => {
                this.showNewSubmenu(newItem);
            });
            newItem.addEventListener('mouseleave', () => {
                this.scheduleHideSubmenu();
            });
        }
        if (this.newSubmenu) {
            this.newSubmenu.addEventListener('mouseenter', () => {
                if (this.submenuHideTimer) {
                    clearTimeout(this.submenuHideTimer);
                    this.submenuHideTimer = null;
                }
            });
            this.newSubmenu.addEventListener('mouseleave', () => {
                this.hideSubmenus();
            });
        }
    }

    show(x, y, hasSelectedIcons = false) {
        this.hasSelectedIcons = hasSelectedIcons;
        this.menu.classList.remove('hidden');
        this.lastX = x;
        this.lastY = y;
        
        // Enable/disable delete option based on selection
        const deleteItem = this.menu.querySelector('[data-action="deleteSelected"]');
        const renameItem = this.menu.querySelector('[data-action="renameSelected"]');
        const selectedFileCount = IconManager.getSelectedFileCount();
        
        if (selectedFileCount > 0) {
            deleteItem.classList.remove('disabled');
            deleteItem.querySelector('span').nextSibling.textContent = ` Delete Selected (${selectedFileCount})`;
        } else {
            deleteItem.classList.add('disabled');
            deleteItem.querySelector('span').nextSibling.textContent = ' Delete Selected';
        }

        // Enable rename only when exactly one entry selected
        if (renameItem) {
            if (selectedFileCount === 1) {
                renameItem.classList.remove('disabled');
            } else {
                renameItem.classList.add('disabled');
            }
        }
        
        // Position the menu
        this.menu.style.left = x + 'px';
        this.menu.style.top = y + 'px';
        
        // Adjust if menu goes off screen
        const menuRect = this.menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        if (menuRect.right > windowWidth) {
            this.menu.style.left = (windowWidth - menuRect.width - 10) + 'px';
        }
        
        if (menuRect.bottom > windowHeight) {
            this.menu.style.top = (windowHeight - menuRect.height - 10) + 'px';
        }
    }

    hide() {
        this.menu.classList.add('hidden');
    }

    async handleAction(action) {
        switch(action) {
            case 'newNote':
                await this.createNewNote();
                break;
            case 'newFolder':
                await this.createNewFolder();
                break;
            case 'refresh':
                this.refresh();
                break;
            case 'changeWallpaper':
                this.changeWallpaper();
                break;
            case 'deleteSelected':
                await IconManager.deleteSelectedFiles();
                break;
            case 'renameSelected':
                await this.renameSelected();
                break;
        }
    }

    async createNewNote() {
        if (!window.electronAPI || !window.electronAPI.writeFile || !window.electronAPI.listFiles) {
            UI.showToast({ message: 'Creating notes is only available in the Electron app.', type: 'error', duration: 2400 });
            return;
        }
        // Auto-generate a unique file name near the click location
        const listResponse = await window.electronAPI.listFiles();
        if (!listResponse.success) {
            UI.showToast({ message: 'Unable to list directory: ' + listResponse.error, type: 'error', duration: 2400 });
            return;
        }
        const baseName = 'untitled';
        const extension = '.txt';
        const existing = new Set((listResponse.files || []).map(f => f.name));
        let candidate = `${baseName}${extension}`;
        let counter = 2;
        while (existing.has(candidate)) {
            candidate = `${baseName} (${counter++})${extension}`;
        }
        const response = await window.electronAPI.writeFile(candidate, '');
        if (response.success) {
            // Rely on a fresh load of filesystem entries to render the new note
            await IconManager.loadFileIcons();
            this.hide();
        } else {
            UI.showToast({ message: 'Failed to create note: ' + response.error, type: 'error', duration: 2400 });
        }
    }

    async createNewFolder() {
        if (!window.electronAPI || !window.electronAPI.createFolder || !window.electronAPI.listFiles) {
            UI.showToast({ message: 'Creating folders is only available in the Electron app.', type: 'error', duration: 2400 });
            return;
        }
        // Auto-generate a unique folder name near the click location
        const listResponse = await window.electronAPI.listFiles();
        if (!listResponse.success) {
            UI.showToast({ message: 'Unable to list directory: ' + listResponse.error, type: 'error', duration: 2400 });
            return;
        }
        const base = 'New Folder';
        const existing = new Set((listResponse.files || []).map(f => f.name));
        let candidate = base;
        let counter = 2;
        while (existing.has(candidate)) {
            candidate = `${base} (${counter++})`;
        }
        const response = await window.electronAPI.createFolder(candidate);
        if (response.success) {
            IconManager.placeNewEntryIcon(candidate, 'folder', this.lastX, this.lastY);
            await IconManager.loadFileIcons();
            this.hide();
        } else {
            UI.showToast({ message: 'Failed to create folder: ' + response.error, type: 'error', duration: 2400 });
        }
    }

    refresh() {
        IconManager.loadFileIcons();
    }

    changeWallpaper() {
        const wallpapers = ['wallpaper-1', 'wallpaper-2', 'wallpaper-3', 'wallpaper-4'];
        const desktop = document.getElementById('desktop');
        const currentWallpaper = localStorage.getItem('wallpaper') || 'wallpaper-1';
        const currentIndex = wallpapers.indexOf(currentWallpaper);
        const nextIndex = (currentIndex + 1) % wallpapers.length;
        const nextWallpaper = wallpapers[nextIndex];
        
        desktop.className = `desktop ${nextWallpaper}`;
        localStorage.setItem('wallpaper', nextWallpaper);
    }

    async renameSelected() {
        const entry = IconManager.getSingleSelectedEntry();
        if (!entry) return;
        const defaultName = entry.name;
        // Preserve extension for files
        let base = defaultName;
        let ext = '';
        if (entry.type === 'file') {
            const dot = defaultName.lastIndexOf('.');
            if (dot > 0) {
                base = defaultName.substring(0, dot);
                ext = defaultName.substring(dot);
            }
        }
        const input = await UI.showTextInputDialog({
            title: 'Rename',
            label: entry.type === 'file' ? 'Enter new file name (without extension):' : 'Enter new folder name:',
            defaultValue: base,
            placeholder: entry.type === 'file' ? base : base,
            confirmText: 'Rename',
            cancelText: 'Cancel'
        });
        if (!input || input.trim() === '') return;
        const proposed = entry.type === 'file' ? (input + ext) : input;
        if (proposed === defaultName) return;
        if (!window.electronAPI || !window.electronAPI.moveFile || !window.electronAPI.listFiles) {
            UI.showToast({ message: 'Renaming requires the Electron app running.', type: 'error', duration: 2400 });
            return;
        }
        // Check collisions at root (desktop shows root directory only)
        const list = await window.electronAPI.listFiles();
        if (!list.success) {
            UI.showToast({ message: 'Unable to list directory: ' + list.error, type: 'error', duration: 2400 });
            return;
        }
        const names = new Set((list.files || []).map(e => e.name));
        if (names.has(proposed)) {
            UI.showToast({ message: 'An item with that name already exists.', type: 'error', duration: 2400 });
            return;
        }
        // Preserve icon position by migrating saved data to the new id
        const oldId = `file_${defaultName}`;
        const newId = `file_${proposed}`;
        const existing = IconManager.icons.get(oldId);
        if (existing) {
            IconManager.icons.delete(oldId);
            existing.id = newId;
            // Keep the raw name (with extension) for file operations
            existing.rawName = proposed;
            // Display label: hide .txt extension for notes
            existing.label = (existing.type === 'file' && typeof proposed === 'string' && proposed.toLowerCase().endsWith('.txt'))
                ? proposed.slice(0, -4)
                : proposed;
            IconManager.icons.set(newId, existing);
        }
        const res = await window.electronAPI.moveFile(defaultName, proposed);
        if (res.success) {
            await IconManager.loadFileIcons();
        } else {
            UI.showToast({ message: 'Failed to rename: ' + res.error, type: 'error', duration: 2400 });
        }
    }

    showNewSubmenu(parentItem) {
        // Show submenu; positioning handled by CSS (relative to parent item)
        this.newSubmenu.classList.remove('hidden');
    }

    hideSubmenus() {
        this.newSubmenu.classList.add('hidden');
    }

    scheduleHideSubmenu() {
        this.submenuHideTimer = setTimeout(() => this.hideSubmenus(), 150);
    }
}

// Create global instance
const ContextMenu = new ContextMenuClass();
