// Notes Application
const NotesApp = {
    windowId: null,
    currentFile: null,
    currentContent: '',

    render() {
        return `
            <div class="notes-container">
                <div class="notes-toolbar">
                    <button class="notes-btn" id="notes-new">New</button>
                    <button class="notes-btn" id="notes-save">Save</button>
                    <button class="notes-btn" id="notes-saveas">Save As</button>
                    <span id="notes-filename" style="margin-left: 16px; color: #666;"></span>
                </div>
                <textarea class="notes-textarea" id="notes-textarea" placeholder="Start typing..."></textarea>
            </div>
        `;
    },

    init(windowId) {
        this.windowId = windowId;
        this.currentFile = null;
        this.currentContent = '';
        
        // Setup event listeners
        const newBtn = document.getElementById('notes-new');
        const saveBtn = document.getElementById('notes-save');
        const saveAsBtn = document.getElementById('notes-saveas');
        const textarea = document.getElementById('notes-textarea');
        
        if (newBtn) {
            newBtn.addEventListener('click', () => this.newFile());
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.save());
        }
        
        if (saveAsBtn) {
            saveAsBtn.addEventListener('click', () => this.saveAs());
        }
        
        if (textarea) {
            textarea.addEventListener('input', (e) => {
                this.currentContent = e.target.value;
            });
            // Fallback to keyup to ensure content is tracked in all environments
            textarea.addEventListener('keyup', (e) => {
                this.currentContent = e.target.value;
            });
            // Prevent desktop shortcuts from interfering while typing in Notes
            textarea.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });
        }
    },

    loadFile(fileName, content) {
        this.currentFile = fileName;
        this.currentContent = content || '';
        const textarea = document.getElementById('notes-textarea');
        const filenameDisplay = document.getElementById('notes-filename');
        if (textarea) {
            textarea.value = this.currentContent;
            // Focus cursor at end for immediate editing
            textarea.focus();
            try {
                const len = this.currentContent.length;
                textarea.setSelectionRange(len, len);
            } catch (_) {}
        }
        if (filenameDisplay) {
            filenameDisplay.textContent = `Editing: ${fileName}`;
        }
    },

    newFile() {
        this.currentFile = null;
        this.currentContent = '';
        
        const textarea = document.getElementById('notes-textarea');
        const filenameDisplay = document.getElementById('notes-filename');
        
        if (textarea) {
            textarea.value = '';
            textarea.focus();
        }
        
        if (filenameDisplay) {
            filenameDisplay.textContent = '';
        }
    },

    async save() {
        if (!this.currentFile) {
            return this.saveAs();
        }
        const focusState = UI.captureFocusState();
        const response = await window.electronAPI.writeFile(this.currentFile, this.currentContent);
        if (response.success) {
            await UI.showToast({ message: 'File saved successfully!', type: 'success', duration: 1800 });
            if (typeof IconManager !== 'undefined' && IconManager.loadFileIcons) {
                IconManager.loadFileIcons();
            }
            // Refocus textarea for continued typing
            UI.restoreFocusState(focusState);
        } else {
            await UI.showToast({ message: 'Failed to save file: ' + response.error, type: 'error', duration: 2400 });
            UI.restoreFocusState(focusState);
        }
    },

    async saveAs() {
        const currentPath = this.currentFile || '';
        const defaultName = currentPath ? (currentPath.split('/').pop()) : 'untitled.txt';
        const input = await UI.showTextInputDialog({
            title: 'Save As',
            label: 'Enter file name (optionally include a path):',
            defaultValue: defaultName,
            placeholder: defaultName,
            confirmText: 'Save',
            cancelText: 'Cancel'
        });
        if (input) {
            // If user provided a path, respect it; otherwise preserve directory of current file
            let targetPath = input;
            if (!input.includes('/') && currentPath.includes('/')) {
                const dir = currentPath.substring(0, currentPath.lastIndexOf('/'));
                targetPath = `${dir}/${input}`;
            }
            const focusState = UI.captureFocusState();
            const response = await window.electronAPI.writeFile(targetPath, this.currentContent);
            if (response.success) {
                this.currentFile = targetPath;
                const filenameDisplay = document.getElementById('notes-filename');
                if (filenameDisplay) {
                    filenameDisplay.textContent = `Editing: ${targetPath}`;
                }
                await UI.showToast({ message: 'File saved successfully!', type: 'success', duration: 1800 });
                if (typeof IconManager !== 'undefined' && IconManager.loadFileIcons) {
                    IconManager.loadFileIcons();
                }
                UI.restoreFocusState(focusState);
            } else {
                await UI.showToast({ message: 'Failed to save file: ' + response.error, type: 'error', duration: 2400 });
                UI.restoreFocusState(focusState);
            }
        }
    }
};
