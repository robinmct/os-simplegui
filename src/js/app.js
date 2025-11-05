// Main Application Logic
class DesktopOS {
    constructor() {
        this.init();
    }

    init() {
        this.loadState();
        this.setupEventListeners();
        this.updateClock();
        
        // Initialize icon manager
        IconManager.init();
        
        // Update clock every second
        setInterval(() => this.updateClock(), 1000);
    }

    loadState() {
        // Load theme
        const theme = localStorage.getItem('theme') || 'light';
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        }

        // Load wallpaper (support custom color)
        const wallpaper = localStorage.getItem('wallpaper') || 'wallpaper-1';
        const desktop = document.getElementById('desktop');
        if (wallpaper === 'custom') {
            const color = localStorage.getItem('wallpaperColor') || '#667eea';
            desktop.className = 'desktop wallpaper-custom';
            desktop.style.background = color;
        } else {
            desktop.className = `desktop ${wallpaper}`;
            desktop.style.background = '';
        }

        // Load window states
        const windowStates = JSON.parse(localStorage.getItem('windowStates') || '[]');
        windowStates.forEach(state => {
            if (state.isOpen && !state.isMinimized) {
                const appName = state.id.replace('Window', '');
                setTimeout(() => {
                    WindowManager.openApp(appName, state);
                }, 100);
            }
        });
    }

    setupEventListeners() {
        const startBtn = document.querySelector('.start-menu-btn');
        const startMenu = document.getElementById('startMenu');

        // Click anywhere to hide menus
        document.addEventListener('click', () => {
            ContextMenu.hide();
            if (startMenu) startMenu.classList.add('hidden');
        });

        // Start menu toggle
        if (startBtn && startMenu) {
            startBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                startMenu.classList.toggle('hidden');
            });

            // Launch apps from start menu
            startMenu.querySelectorAll('.start-item').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const appKey = btn.getAttribute('data-app');
                    if (appKey) {
                        WindowManager.openApp(appKey);
                    }
                    startMenu.classList.add('hidden');
                });
            });
        }

        // Handle window state changes before unload
        window.addEventListener('beforeunload', () => {
            this.saveWindowStates();
        });
    }

    updateClock() {
        const clock = document.getElementById('clock');
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        clock.textContent = `${hours}:${minutes}:${seconds}`;
    }

    saveWindowStates() {
        const states = WindowManager.getAllWindowStates();
        localStorage.setItem('windowStates', JSON.stringify(states));
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.desktopOS = new DesktopOS();
});
