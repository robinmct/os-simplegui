// Explorer Application
const ExplorerApp = {
  windowId: null,
  currentPath: '', // relative to userData/files
  selected: new Set(),
  entries: [],
  filterText: '',
  lastIndex: -1,

  render() {
    return `
      <div class="explorer-container">
        <div class="explorer-toolbar">
          <button class="btn btn--outline btn--sm" id="explorer-up">Up</button>
          <button class="btn btn--outline btn--sm" id="explorer-new-folder">New Folder</button>
          <button class="btn btn--outline btn--sm" id="explorer-new-note">New Note</button>
          <button class="btn btn--outline btn--sm" id="explorer-rename">Rename</button>
          <button class="btn btn--outline btn--sm danger" id="explorer-delete">Delete</button>
          <button class="btn btn--outline btn--sm" id="explorer-refresh">Refresh</button>
          <span id="explorer-path" class="explorer-path"></span>
          <div class="explorer-spacer"></div>
          <input id="explorer-search" class="explorer-search" type="text" placeholder="Search..." />
        </div>
        <div class="explorer-list" id="explorer-list"></div>
      </div>
    `;
  },

  init(windowId) {
    this.windowId = windowId;
    this.currentPath = '';
    this.selected = new Set();
    this.updatePathDisplay();
    this.bindEvents();
    // In browser preview, electronAPI won't exist; show a friendly message
    if (!window.electronAPI || !window.electronAPI.listFiles) {
      const listEl = document.getElementById('explorer-list');
      if (listEl) {
        listEl.innerHTML = '<div class="explorer-empty">Explorer requires the Electron app to access the filesystem.</div>';
      }
      return;
    }
    this.loadDirectory();
  },

  bindEvents() {
    const upBtn = document.getElementById('explorer-up');
    const newFolderBtn = document.getElementById('explorer-new-folder');
    const newNoteBtn = document.getElementById('explorer-new-note');
    const renameBtn = document.getElementById('explorer-rename');
    const deleteBtn = document.getElementById('explorer-delete');
    const refreshBtn = document.getElementById('explorer-refresh');
    const searchInput = document.getElementById('explorer-search');

    if (upBtn) {
      upBtn.addEventListener('click', () => this.goUp());
    }
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterText = (e.target.value || '').toLowerCase();
        this.renderList();
      });
    }
    if (renameBtn) {
      renameBtn.addEventListener('click', async () => {
        if (!window.electronAPI || !window.electronAPI.moveFile || !window.electronAPI.listFiles) {
          UI.showToast({ message: 'Renaming requires the Electron app running.', type: 'error', duration: 2400 });
          return;
        }
        if (this.selected.size !== 1) {
          UI.showToast({ message: 'Select exactly one item to rename.', type: 'info', duration: 2000 });
          return;
        }
        const [oldName] = Array.from(this.selected);
        // Determine type and preserve extension for files
        const list = await window.electronAPI.listFiles(this.currentPath);
        if (!list.success) {
          UI.showToast({ message: 'Unable to list directory: ' + list.error, type: 'error', duration: 2400 });
          return;
        }
        const entry = (list.files || []).find(e => e.name === oldName);
        if (!entry) {
          UI.showToast({ message: 'Selected item not found.', type: 'error', duration: 2400 });
          return;
        }
        let base = oldName;
        let ext = '';
        if (entry.type === 'file') {
          const dot = oldName.lastIndexOf('.');
          if (dot > 0) {
            base = oldName.substring(0, dot);
            ext = oldName.substring(dot);
          }
        }
        const input = await UI.showTextInputDialog({
          title: 'Rename',
          label: entry.type === 'file' ? 'Enter new file name (without extension):' : 'Enter new folder name:',
          defaultValue: base,
          placeholder: base,
          confirmText: 'Rename',
          cancelText: 'Cancel'
        });
        if (!input || input.trim() === '') return;
        const newName = entry.type === 'file' ? (input + ext) : input;
        if (newName === oldName) return;
        // Collision check
        const names = new Set((list.files || []).map(e => e.name));
        if (names.has(newName)) {
          UI.showToast({ message: 'An item with that name already exists.', type: 'error', duration: 2400 });
          return;
        }
        const fromPath = this.currentPath ? `${this.currentPath}/${oldName}` : oldName;
        const toPath = this.currentPath ? `${this.currentPath}/${newName}` : newName;
        // Preserve desktop icon position when renaming at root
        if (!this.currentPath && typeof IconManager !== 'undefined' && IconManager.icons) {
          const oldId = `file_${oldName}`;
          const newId = `file_${newName}`;
          const existing = IconManager.icons.get(oldId);
          if (existing) {
            IconManager.icons.delete(oldId);
            existing.id = newId;
            existing.label = newName;
            IconManager.icons.set(newId, existing);
            if (IconManager.saveIconPositions) {
              IconManager.saveIconPositions();
            }
          }
        }
        const res = await window.electronAPI.moveFile(fromPath, toPath);
        if (res.success) {
          this.selected.clear();
          await this.loadDirectory();
          if (typeof IconManager !== 'undefined' && IconManager.loadFileIcons && !this.currentPath) {
            IconManager.loadFileIcons();
          }
        } else {
          UI.showToast({ message: 'Failed to rename: ' + res.error, type: 'error', duration: 2400 });
        }
      });
    }
    if (newNoteBtn) {
      newNoteBtn.addEventListener('click', async () => {
        if (!window.electronAPI || !window.electronAPI.writeFile || !window.electronAPI.listFiles) {
          UI.showToast({ message: 'Creating notes requires the Electron app running.', type: 'error', duration: 2400 });
          return;
        }
        const list = await window.electronAPI.listFiles(this.currentPath);
        if (!list.success) {
          UI.showToast({ message: 'Unable to list directory: ' + list.error, type: 'error', duration: 2400 });
          return;
        }
        const base = 'untitled';
        const ext = '.txt';
        const names = new Set((list.files || []).map(e => e.name));
        let candidate = `${base}${ext}`;
        let counter = 2;
        while (names.has(candidate)) {
          candidate = `${base} (${counter++})${ext}`;
        }
        const fullPath = this.currentPath ? `${this.currentPath}/${candidate}` : candidate;
        const res = await window.electronAPI.writeFile(fullPath, '');
        if (res.success) {
          await this.loadDirectory();
          if (typeof IconManager !== 'undefined' && IconManager.loadFileIcons && !this.currentPath) {
            IconManager.loadFileIcons();
          }
        } else {
          UI.showToast({ message: 'Failed to create note: ' + res.error, type: 'error', duration: 2400 });
        }
      });
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!window.electronAPI || !window.electronAPI.deleteFile) {
          UI.showToast({ message: 'Deleting items requires the Electron app running.', type: 'error', duration: 2400 });
          return;
        }
        if (this.selected.size === 0) {
          UI.showToast({ message: 'Select items to delete.', type: 'info', duration: 2000 });
          return;
        }
        const ok = await UI.showConfirmDialog({
          title: 'Delete',
          message: `Delete ${this.selected.size} item(s)?`,
          confirmText: 'Delete',
          cancelText: 'Cancel'
        });
        if (!ok) return;
        for (const name of this.selected) {
          const fullPath = this.currentPath ? `${this.currentPath}/${name}` : name;
          const res = await window.electronAPI.deleteFile(fullPath);
          if (!res.success) {
            UI.showToast({ message: `Failed to delete ${name}: ${res.error}`, type: 'error', duration: 2400 });
          }
        }
        this.selected.clear();
        await this.loadDirectory();
        // Refresh desktop icons so changes are reflected
        if (typeof IconManager !== 'undefined' && IconManager.loadFileIcons) {
          IconManager.loadFileIcons();
        }
      });
    }
    if (newFolderBtn) {
      newFolderBtn.addEventListener('click', async () => {
        // Fallback: auto-generate a folder name without using prompt()
        if (!window.electronAPI || !window.electronAPI.listFiles || !window.electronAPI.createFolder) {
          UI.showToast({ message: 'Creating folders requires the Electron app running.', type: 'error', duration: 2400 });
          return;
        }
        const list = await window.electronAPI.listFiles(this.currentPath);
        if (!list.success) {
          UI.showToast({ message: 'Unable to list directory: ' + list.error, type: 'error', duration: 2400 });
          return;
        }
        const base = 'New Folder';
        const names = new Set((list.files || []).map(e => e.name));
        let candidate = base;
        let counter = 2;
        while (names.has(candidate)) {
          candidate = `${base} (${counter++})`;
        }
        const fullPath = this.currentPath ? `${this.currentPath}/${candidate}` : candidate;
        const res = await window.electronAPI.createFolder(fullPath);
        if (res.success) {
          await this.loadDirectory();
          // Refresh desktop icons to show new folders
          if (typeof IconManager !== 'undefined' && IconManager.loadFileIcons) {
            IconManager.loadFileIcons();
          }
        } else {
          UI.showToast({ message: 'Failed to create folder: ' + res.error, type: 'error', duration: 2400 });
        }
      });
    }
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadDirectory());
    }
  },

  async loadDirectory() {
    const listEl = document.getElementById('explorer-list');
    if (!listEl) return;
    listEl.innerHTML = '<div class="explorer-empty">Loading...</div>';
    if (!window.electronAPI || !window.electronAPI.listFiles) {
      listEl.innerHTML = '<div class="explorer-empty">Explorer requires the Electron app to access the filesystem.</div>';
      return;
    }
    const res = await window.electronAPI.listFiles(this.currentPath);
    if (!res.success) {
      listEl.innerHTML = `<div class="explorer-empty">Error: ${res.error}</div>`;
      return;
    }
    this.entries = res.files || [];
    this.selected.clear();
    this.lastIndex = -1;
    this.renderList();
  },

  renderList() {
    const listEl = document.getElementById('explorer-list');
    if (!listEl) return;
    if (!this.entries || this.entries.length === 0) {
      listEl.innerHTML = '<div class="explorer-empty">This folder is empty</div>';
      this.updatePathDisplay();
      return;
    }
    // Filter and sort entries (folders first, ascending)
    const filtered = this.entries.filter(e => {
      if (!this.filterText) return true;
      return (e.name || '').toLowerCase().includes(this.filterText);
    });
    const entries = filtered.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    listEl.innerHTML = '';
    entries.forEach((entry, index) => {
      const item = document.createElement('div');
      item.className = 'explorer-item';
      item.setAttribute('data-name', entry.name);
      item.setAttribute('data-index', String(index));
      const icon = entry.type === 'folder' ? '📁' : '📄';
      const displayName = (entry.type === 'file' && typeof entry.name === 'string' && entry.name.toLowerCase().endsWith('.txt'))
        ? entry.name.slice(0, -4)
        : entry.name;
      item.innerHTML = `<span class="explorer-icon">${icon}</span><span class="explorer-name">${displayName}</span>`;
      // Selection on click; Ctrl/Cmd toggles multi-select; Shift selects range
      item.addEventListener('click', (e) => {
        const isAdditive = e.ctrlKey || e.metaKey;
        const idx = index;
        if (e.shiftKey && this.lastIndex !== -1) {
          // Range select
          const [start, end] = [this.lastIndex, idx].sort((a, b) => a - b);
          if (!isAdditive) this.clearSelection();
          for (let i = start; i <= end; i++) {
            const el = listEl.querySelector(`.explorer-item[data-index="${i}"]`);
            const name = el && el.getAttribute('data-name');
            if (el && name) {
              this.selected.add(name);
              el.classList.add('selected');
            }
          }
        } else {
          if (!isAdditive) this.clearSelection();
          this.toggleSelection(item, entry.name);
          this.lastIndex = idx;
        }
      });
      item.addEventListener('dblclick', async () => {
        if (entry.type === 'folder') {
          this.enterFolder(entry.name);
        } else {
          const fullPath = this.currentPath ? `${this.currentPath}/${entry.name}` : entry.name;
          const response = await window.electronAPI.readFile(fullPath);
          if (response.success) {
            WindowManager.openFileInNotes(fullPath, response.content);
          } else {
            UI.showToast({ message: 'Failed to open file: ' + response.error, type: 'error', duration: 2400 });
          }
        }
      });
      listEl.appendChild(item);
    });
    // Keyboard navigation on the list
    listEl.tabIndex = 0;
    listEl.addEventListener('keydown', async (e) => {
      const items = Array.from(listEl.querySelectorAll('.explorer-item'));
      const count = items.length;
      if (count === 0) return;
      const activeIdx = this.lastIndex !== -1 ? this.lastIndex : (items[0] ? Number(items[0].getAttribute('data-index')) : 0);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = Math.min(activeIdx + 1, count - 1);
        this.setSelectionByIndex(next, e.shiftKey);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = Math.max(activeIdx - 1, 0);
        this.setSelectionByIndex(prev, e.shiftKey);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const el = listEl.querySelector(`.explorer-item[data-index="${activeIdx}"]`);
        const name = el && el.getAttribute('data-name');
        const entry = this.entries.find(e => e.name === name);
        if (!entry) return;
        if (entry.type === 'folder') {
          this.enterFolder(entry.name);
        } else {
          const fullPath = this.currentPath ? `${this.currentPath}/${entry.name}` : entry.name;
          const response = await window.electronAPI.readFile(fullPath);
          if (response.success) {
            WindowManager.openFileInNotes(fullPath, response.content);
          } else {
            UI.showToast({ message: 'Failed to open file: ' + response.error, type: 'error', duration: 2400 });
          }
        }
      } else if (e.key === 'Delete') {
        e.preventDefault();
        const deleteBtn = document.getElementById('explorer-delete');
        deleteBtn && deleteBtn.click();
      }
    });
    this.updatePathDisplay();
  },

  setSelectionByIndex(index, extend) {
    const listEl = document.getElementById('explorer-list');
    const el = listEl && listEl.querySelector(`.explorer-item[data-index="${index}"]`);
    if (!el) return;
    const name = el.getAttribute('data-name');
    if (!extend) this.clearSelection();
    this.selected.add(name);
    el.classList.add('selected');
    this.lastIndex = index;
    // Ensure visible
    try { el.scrollIntoView({ block: 'nearest' }); } catch (_) {}
  },

  toggleSelection(itemEl, name) {
    if (this.selected.has(name)) {
      this.selected.delete(name);
      itemEl.classList.remove('selected');
    } else {
      this.selected.add(name);
      itemEl.classList.add('selected');
    }
  },

  clearSelection() {
    const listEl = document.getElementById('explorer-list');
    if (!listEl) return;
    listEl.querySelectorAll('.explorer-item.selected').forEach(el => el.classList.remove('selected'));
    this.selected.clear();
  },

  enterFolder(name) {
    this.currentPath = this.currentPath ? `${this.currentPath}/${name}` : name;
    this.loadDirectory();
  },

  goUp() {
    if (!this.currentPath) return;
    const parts = this.currentPath.split('/').filter(Boolean);
    parts.pop();
    this.currentPath = parts.join('/');
    this.loadDirectory();
  },

  openPath(path) {
    this.currentPath = (path || '').replace(/\\/g, '/');
    this.loadDirectory();
  },

  updatePathDisplay() {
    const pathEl = document.getElementById('explorer-path');
    if (pathEl) {
      const parts = (this.currentPath || '').split('/').filter(Boolean);
      const root = document.createElement('span');
      root.className = 'breadcrumb';
      root.textContent = '/';
      root.addEventListener('click', () => { this.openPath(''); });
      pathEl.innerHTML = '';
      pathEl.appendChild(root);
      let acc = '';
      parts.forEach((p, i) => {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-sep';
        sep.textContent = ' / ';
        pathEl.appendChild(sep);
        const seg = document.createElement('span');
        seg.className = 'breadcrumb';
        seg.textContent = p;
        acc = acc ? `${acc}/${p}` : p;
        seg.addEventListener('click', () => { this.openPath(acc); });
        pathEl.appendChild(seg);
      });
    }
  }
};
    const searchInput = document.getElementById('explorer-search');
    const sortBtn = document.getElementById('explorer-sort');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterText = (e.target.value || '').toLowerCase();
        this.renderList();
      });
    }
    if (sortBtn) {
      sortBtn.addEventListener('click', () => {
        this.sortAsc = !this.sortAsc;
        sortBtn.textContent = this.sortAsc ? 'Sort A→Z' : 'Sort Z→A';
        this.renderList();
      });
    }