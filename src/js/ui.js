// Lightweight UI helper for text input dialogs
const UI = {
  // In-app non-blocking confirm dialog
  showConfirmDialog({ title = 'Confirm', message = '', confirmText = 'OK', cancelText = 'Cancel' } = {}) {
    return new Promise((resolve) => {
      const focusState = UI.captureFocusState ? UI.captureFocusState() : null;
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.setAttribute('tabindex', '-1');
      const modal = document.createElement('div');
      modal.className = 'modal-dialog';
      modal.innerHTML = `
        <div class="modal-header">${title}</div>
        <div class="modal-body">
          <div class="modal-message">${message}</div>
        </div>
        <div class="modal-actions">
          <button class="modal-btn primary" id="modal-confirm">${confirmText}</button>
          <button class="modal-btn" id="modal-cancel">${cancelText}</button>
        </div>
      `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const confirm = modal.querySelector('#modal-confirm');
      const cancel = modal.querySelector('#modal-cancel');
      const close = (value) => {
        overlay.remove();
        if (UI.restoreFocusState && focusState) UI.restoreFocusState(focusState);
        resolve(value);
      };
      const ensureFocus = () => {
        if (document.activeElement !== confirm) {
          try { confirm.focus(); } catch (_) {}
        }
      };
      setTimeout(ensureFocus, 0);
      requestAnimationFrame(ensureFocus);
      setTimeout(ensureFocus, 50);
      modal.addEventListener('mousedown', () => ensureFocus());
      // Stop key events from leaking to desktop handlers
      modal.addEventListener('keydown', (e) => { e.stopPropagation(); });
      overlay.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter') {
          e.preventDefault();
          confirm.click();
        }
      });
      confirm.addEventListener('click', () => close(true));
      cancel.addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
    });
  }
  ,
  showTextInputDialog({ title = 'Input', label = '', defaultValue = '', placeholder = '', confirmText = 'OK', cancelText = 'Cancel' } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      // Ensure overlay can receive focus for keyboard handling
      overlay.setAttribute('tabindex', '-1');
      const modal = document.createElement('div');
      modal.className = 'modal-dialog';
      modal.innerHTML = `
        <div class="modal-header">${title}</div>
        <div class="modal-body">
          ${label ? `<label class="modal-label">${label}</label>` : ''}
          <input type="text" class="modal-input" id="modal-input" placeholder="${placeholder}" value="${defaultValue}" autofocus>
        </div>
        <div class="modal-actions">
          <button class="modal-btn primary" id="modal-confirm">${confirmText}</button>
          <button class="modal-btn" id="modal-cancel">${cancelText}</button>
        </div>
      `;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      const input = modal.querySelector('#modal-input');
      const confirm = modal.querySelector('#modal-confirm');
      const cancel = modal.querySelector('#modal-cancel');
      const close = (value) => {
        overlay.remove();
        resolve(value);
      };
      const ensureFocus = () => {
        if (document.activeElement !== input) {
          input.focus();
          try { input.select(); } catch (_) {}
        }
      };
      // Multiple attempts to robustly set focus, covering render timing
      setTimeout(ensureFocus, 0);
      requestAnimationFrame(ensureFocus);
      setTimeout(ensureFocus, 50);
      // Keep focus when interacting inside the modal
      modal.addEventListener('mousedown', () => {
        ensureFocus();
      });
      // Stop key events from leaking to desktop handlers
      input.addEventListener('keydown', (e) => { e.stopPropagation(); });
      modal.addEventListener('keydown', (e) => { e.stopPropagation(); });
      confirm.addEventListener('click', () => close(input.value));
      cancel.addEventListener('click', () => close(null));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          confirm.click();
        }
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
      overlay.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Escape') close(null);
      });
    });
  }
  ,
  // Non-blocking toast notification that does not steal focus
  showToast({ message = '', type = 'info', duration = 2000 } = {}) {
    return new Promise((resolve) => {
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.textContent = message;
      container.appendChild(toast);
      // Auto dismiss
      const timer = setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
          toast.remove();
          resolve();
        }, 250);
      }, Math.max(1000, duration));
      // Manual dismissal on click
      toast.addEventListener('click', () => {
        clearTimeout(timer);
        toast.classList.add('hide');
        setTimeout(() => {
          toast.remove();
          resolve();
        }, 250);
      });
    });
  },
  // Capture focus/selection state for later restoration
  captureFocusState() {
    const el = document.activeElement;
    const state = { element: el, start: null, end: null };
    if (el && (el.tagName && el.tagName.toLowerCase() === 'input' || el.tagName && el.tagName.toLowerCase() === 'textarea')) {
      try {
        state.start = el.selectionStart;
        state.end = el.selectionEnd;
      } catch (_) {}
    }
    return state;
  },
  // Restore a previously captured focus/selection state
  restoreFocusState(state) {
    if (!state || !state.element || !state.element.focus) return;
    try {
      state.element.focus();
      if (state.start != null && state.end != null && state.element.setSelectionRange) {
        state.element.setSelectionRange(state.start, state.end);
      }
    } catch (_) {}
  }
};