// Window Manager - Handles window creation, dragging, resizing, and stacking
class WindowManagerClass {
    constructor() {
        this.windows = new Map();
        this.zIndexCounter = 100;
        this.activeWindow = null;
    }

    openApp(appName, savedState = null) {
        const windowId = `${appName}Window`;
        
        // If window already exists, just focus it
        if (this.windows.has(windowId)) {
            const existingWindow = this.windows.get(windowId);
            if (existingWindow.isMinimized) {
                this.restoreWindow(windowId);
            } else {
                this.focusWindow(windowId);
            }
            return;
        }

        // Create new window
        const windowElement = this.createWindow(windowId, appName, savedState);
        const defaultWidth = appName === 'explorer' ? 900 : (appName === 'calculator' ? 400 : 600);
        const defaultHeight = appName === 'explorer' ? 560 : (appName === 'calculator' ? 560 : 400);
        this.windows.set(windowId, {
            element: windowElement,
            isMinimized: false,
            isMaximized: false,
            savedPosition: savedState || { x: 100 + this.windows.size * 30, y: 50 + this.windows.size * 30, width: defaultWidth, height: defaultHeight }
        });

        // Load app content
        this.loadAppContent(windowId, appName);
        
        // Add to taskbar
        this.addToTaskbar(windowId, appName);
        
        // Focus the new window
        this.focusWindow(windowId);
    }

    createWindow(id, appName, savedState) {
        const container = document.getElementById('windowContainer');
        const windowEl = document.createElement('div');
        windowEl.className = 'window';
        windowEl.id = id;
        
        // Set position and size (larger default for Explorer; taller for Calculator to fit all buttons)
        const defaultWidth = appName === 'explorer' ? 900 : (appName === 'calculator' ? 400 : 600);
        const defaultHeight = appName === 'explorer' ? 560 : (appName === 'calculator' ? 560 : 400);
        const state = savedState || { x: 100 + this.windows.size * 30, y: 50 + this.windows.size * 30, width: defaultWidth, height: defaultHeight };
        windowEl.style.left = state.x + 'px';
        windowEl.style.top = state.y + 'px';
        windowEl.style.width = state.width + 'px';
        windowEl.style.height = state.height + 'px';
        windowEl.style.zIndex = ++this.zIndexCounter;
        
        // Create window structure
        windowEl.innerHTML = `
            <div class="window-header">
                <div class="window-title">
                    <span>${this.getAppIcon(appName)}</span>
                    <span>${this.getAppTitle(appName)}</span>
                </div>
                <div class="window-controls">
                    <button class="window-btn minimize" onclick="WindowManager.minimizeWindow('${id}')">−</button>
                    <button class="window-btn maximize" onclick="WindowManager.toggleMaximize('${id}')">□</button>
                    <button class="window-btn close" onclick="WindowManager.closeWindow('${id}')">×</button>
                </div>
            </div>
            <div class="window-content" id="${id}-content"></div>
            
            <!-- Resize handles -->
            <div class="resize-handle resize-n"></div>
            <div class="resize-handle resize-s"></div>
            <div class="resize-handle resize-e"></div>
            <div class="resize-handle resize-w"></div>
            <div class="resize-handle resize-ne"></div>
            <div class="resize-handle resize-nw"></div>
            <div class="resize-handle resize-se"></div>
            <div class="resize-handle resize-sw"></div>
        `;
        
        container.appendChild(windowEl);
        
        // Setup dragging
        this.setupDragging(windowEl);
        
        // Setup resizing
        this.setupResizing(windowEl);
        
        // Focus on click
        windowEl.addEventListener('mousedown', () => {
            this.focusWindow(id);
        });
        
        return windowEl;
    }

    setupDragging(windowEl) {
        const header = windowEl.querySelector('.window-header');
        let isDragging = false;
        let currentX, currentY, initialX, initialY;
        
        header.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on buttons
            if (e.target.closest('.window-btn')) return;
            
            const windowData = this.windows.get(windowEl.id);
            if (windowData && windowData.isMaximized) return;
            
            isDragging = true;
            initialX = e.clientX - windowEl.offsetLeft;
            initialY = e.clientY - windowEl.offsetTop;
            
            const mouseMoveHandler = (e) => {
                if (isDragging) {
                    e.preventDefault();
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                    
                    windowEl.style.left = currentX + 'px';
                    windowEl.style.top = currentY + 'px';
                }
            };
            
            const mouseUpHandler = () => {
                isDragging = false;
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };
            
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }

    setupResizing(windowEl) {
        const handles = windowEl.querySelectorAll('.resize-handle');
        
        handles.forEach(handle => {
            let isResizing = false;
            let startX, startY, startWidth, startHeight, startLeft, startTop;
            
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                
                const windowData = this.windows.get(windowEl.id);
                if (windowData && windowData.isMaximized) return;
                
                isResizing = true;
                startX = e.clientX;
                startY = e.clientY;
                startWidth = windowEl.offsetWidth;
                startHeight = windowEl.offsetHeight;
                startLeft = windowEl.offsetLeft;
                startTop = windowEl.offsetTop;
                
                const direction = handle.className.split(' ')[1].replace('resize-', '');
                
                const mouseMoveHandler = (e) => {
                    if (!isResizing) return;
                    
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;
                    
                    // Handle resizing based on direction
                    if (direction.includes('e')) {
                        windowEl.style.width = Math.max(300, startWidth + deltaX) + 'px';
                    }
                    if (direction.includes('w')) {
                        const newWidth = Math.max(300, startWidth - deltaX);
                        if (newWidth > 300) {
                            windowEl.style.width = newWidth + 'px';
                            windowEl.style.left = (startLeft + deltaX) + 'px';
                        }
                    }
                    if (direction.includes('s')) {
                        windowEl.style.height = Math.max(200, startHeight + deltaY) + 'px';
                    }
                    if (direction.includes('n')) {
                        const newHeight = Math.max(200, startHeight - deltaY);
                        if (newHeight > 200) {
                            windowEl.style.height = newHeight + 'px';
                            windowEl.style.top = (startTop + deltaY) + 'px';
                        }
                    }
                };
                
                const mouseUpHandler = () => {
                    isResizing = false;
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                };
                
                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
            });
        });
    }

    focusWindow(id) {
        // Remove focus from all windows
        document.querySelectorAll('.window').forEach(w => {
            w.style.zIndex = parseInt(w.style.zIndex) || 100;
        });
        
        // Bring clicked window to front
        const windowEl = document.getElementById(id);
        if (windowEl) {
            windowEl.style.zIndex = ++this.zIndexCounter;
            this.activeWindow = id;
            
            // Update taskbar
            this.updateTaskbar();
        }
    }

    minimizeWindow(id) {
        const windowData = this.windows.get(id);
        if (windowData) {
            windowData.element.classList.add('minimized');
            windowData.isMinimized = true;
            this.updateTaskbar();
        }
    }

    restoreWindow(id) {
        const windowData = this.windows.get(id);
        if (windowData) {
            windowData.element.classList.remove('minimized');
            windowData.isMinimized = false;
            this.focusWindow(id);
        }
    }

    toggleMaximize(id) {
        const windowData = this.windows.get(id);
        if (!windowData) return;
        
        if (windowData.isMaximized) {
            // Restore
            windowData.element.classList.remove('maximized');
            const pos = windowData.savedPosition;
            windowData.element.style.left = pos.x + 'px';
            windowData.element.style.top = pos.y + 'px';
            windowData.element.style.width = pos.width + 'px';
            windowData.element.style.height = pos.height + 'px';
            windowData.isMaximized = false;
        } else {
            // Maximize
            windowData.savedPosition = {
                x: windowData.element.offsetLeft,
                y: windowData.element.offsetTop,
                width: windowData.element.offsetWidth,
                height: windowData.element.offsetHeight
            };
            windowData.element.classList.add('maximized');
            windowData.isMaximized = true;
        }
    }

    closeWindow(id) {
        const windowData = this.windows.get(id);
        if (windowData) {
            windowData.element.remove();
            this.windows.delete(id);
            this.removeFromTaskbar(id);
        }
    }

    loadAppContent(windowId, appName) {
        const contentEl = document.getElementById(`${windowId}-content`);
        
        switch(appName) {
            case 'calculator':
                contentEl.innerHTML = CalculatorApp.render();
                CalculatorApp.init(windowId);
                break;
            case 'settings':
                contentEl.innerHTML = SettingsApp.render();
                SettingsApp.init(windowId);
                break;
            case 'notes':
                contentEl.innerHTML = NotesApp.render();
                NotesApp.init(windowId);
                break;
            case 'explorer':
                contentEl.innerHTML = ExplorerApp.render();
                ExplorerApp.init(windowId);
                break;
            case 'about':
                contentEl.innerHTML = AboutApp.render();
                break;
        }
    }

    openFileInNotes(fileName, content) {
        this.openApp('notes');
        // Wait a bit for window to open
        setTimeout(() => {
            NotesApp.loadFile(fileName, content);
        }, 100);
    }

    addToTaskbar(windowId, appName) {
        const taskbarApps = document.getElementById('taskbarApps');
        const taskbarApp = document.createElement('div');
        taskbarApp.className = 'taskbar-app active';
        taskbarApp.id = `taskbar-${windowId}`;
        taskbarApp.innerHTML = `${this.getAppIcon(appName)} ${this.getAppTitle(appName)}`;
        
        taskbarApp.addEventListener('click', () => {
            const windowData = this.windows.get(windowId);
            if (windowData) {
                if (windowData.isMinimized) {
                    this.restoreWindow(windowId);
                } else if (this.activeWindow === windowId) {
                    this.minimizeWindow(windowId);
                } else {
                    this.focusWindow(windowId);
                }
            }
        });
        
        taskbarApps.appendChild(taskbarApp);
    }

    removeFromTaskbar(windowId) {
        const taskbarApp = document.getElementById(`taskbar-${windowId}`);
        if (taskbarApp) {
            taskbarApp.remove();
        }
    }

    updateTaskbar() {
        document.querySelectorAll('.taskbar-app').forEach(app => {
            app.classList.remove('active');
        });
        
        if (this.activeWindow) {
            const activeTaskbarApp = document.getElementById(`taskbar-${this.activeWindow}`);
            if (activeTaskbarApp) {
                activeTaskbarApp.classList.add('active');
            }
        }
    }

    getAppIcon(appName) {
        const icons = {
            calculator: '🔢',
            settings: '⚙️',
            notes: '📝',
            explorer: '📂',
            about: 'ℹ️'
        };
        return icons[appName] || '📦';
    }

    getAppTitle(appName) {
        const titles = {
            calculator: 'Calculator',
            settings: 'Settings',
            notes: 'Notes',
            explorer: 'Explorer',
            about: 'About'
        };
        return titles[appName] || appName;
    }

    openFolderInExplorer(folderPath) {
        this.openApp('explorer');
        setTimeout(() => {
            ExplorerApp.openPath(folderPath);
        }, 100);
    }

    getAllWindowStates() {
        const states = [];
        this.windows.forEach((data, id) => {
            states.push({
                id: id,
                isOpen: true,
                isMinimized: data.isMinimized,
                isMaximized: data.isMaximized,
                x: data.element.offsetLeft,
                y: data.element.offsetTop,
                width: data.element.offsetWidth,
                height: data.element.offsetHeight
            });
        });
        return states;
    }
}

// Create global instance
const WindowManager = new WindowManagerClass();
