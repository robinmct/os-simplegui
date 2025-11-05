// Settings Application
const SettingsApp = {
    windowId: null,

    render() {
        const currentWallpaper = localStorage.getItem('wallpaper') || 'wallpaper-1';
        const currentColor = localStorage.getItem('wallpaperColor') || '#667eea';
        return `
            <div class="settings-container">
                <div class="settings-group">
                    <h3>Appearance</h3>
                    <div class="settings-card appearance-options">
                        <div class="settings-item" style="display:block;">
                            <span style="font-weight: var(--font-weight-medium);">Wallpaper Presets</span>
                            <span class="settings-desc">Choose a gradient wallpaper or pick a custom color.</span>
                        </div>
                        <div class="wallpaper-swatches" id="wallpaper-swatches">
                            <button type="button" class="swatch wallpaper-1" data-wallpaper="wallpaper-1">Purple</button>
                            <button type="button" class="swatch wallpaper-2" data-wallpaper="wallpaper-2">Pink</button>
                            <button type="button" class="swatch wallpaper-3" data-wallpaper="wallpaper-3">Blue</button>
                            <button type="button" class="swatch wallpaper-4" data-wallpaper="wallpaper-4">Green</button>
                        </div>
                        <div class="settings-item">
                            <span>Custom Color</span>
                            <input type="color" id="wallpaper-color" class="color-input" value="${currentColor}" />
                        </div>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>System Information</h3>
                    <div class="settings-item">
                        <span>OS Version</span>
                        <span>Desktop OS 1.0</span>
                    </div>
                    <div class="settings-item">
                        <span>Platform</span>
                        <span>Electron</span>
                    </div>
                </div>

                <div class="settings-group">
                    <h3>Storage</h3>
                    <div class="settings-item">
                        <span>Files Location</span>
                        <span>User Data Folder</span>
                    </div>
                </div>
            </div>
        `;
    },

    init(windowId) {
        this.windowId = windowId;

        // Preset swatches
        const swatches = document.querySelectorAll('#wallpaper-swatches .swatch');
        const current = localStorage.getItem('wallpaper') || 'wallpaper-1';
        swatches.forEach(btn => {
            const val = btn.getAttribute('data-wallpaper');
            if (val === current) {
                btn.classList.add('selected');
            }
            btn.addEventListener('click', () => {
                const desktop = document.getElementById('desktop');
                desktop.className = `desktop ${val}`;
                desktop.style.background = '';
                localStorage.setItem('wallpaper', val);
                swatches.forEach(s => s.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Custom color picker
        const colorInput = document.getElementById('wallpaper-color');
        if (colorInput) {
            colorInput.addEventListener('input', () => {
                const chosen = colorInput.value;
                const desktop = document.getElementById('desktop');
                desktop.className = 'desktop wallpaper-custom';
                desktop.style.background = chosen;
                localStorage.setItem('wallpaper', 'custom');
                localStorage.setItem('wallpaperColor', chosen);
                swatches.forEach(s => s.classList.remove('selected'));
            });
        }
    }
};
