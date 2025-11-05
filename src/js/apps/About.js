// About Application
const AboutApp = {
    render() {
        return `
            <div class="about-container">
                <h2>🖥️ Desktop OS Simulator</h2>
                <p>A modern desktop operating system simulator built with Electron</p>
                
                <div class="about-info">
                    <p><strong>Version:</strong> 1.0.0</p>
                    <p><strong>Platform:</strong> Electron</p>
                    <p><strong>Author:</strong> Botabara, Macatangay, Umali</p>
                </div>
                
                <div class="about-info">
                    <h3>Features</h3>
                    <p>✓ Draggable and resizable windows</p>
                    <p>✓ Built-in applications</p>
                    <p>✓ File system support</p>
                    <p>✓ Context menu</p>
                    <p>✓ Theme switching</p>
                    <p>✓ State persistence</p>
                </div>
                
                <div class="about-info">
                    <h3>Shortcuts</h3>
                    <p><strong>Right-click desktop:</strong> Context menu</p>
                    <p><strong>Double-click icon:</strong> Open application</p>
                    <p><strong>Drag window header:</strong> Move window</p>
                    <p><strong>Drag window edges:</strong> Resize window</p>
                </div>
            </div>
        `;
    }
};
