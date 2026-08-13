'use strict';

const MobileSearch = {
  init() {
    const form = Utils.qs('.search-form');
    const toggle = Utils.el('search-toggle-btn');
    const input = Utils.el('searchInput');
    const close = Utils.el('search-close-btn');
    if (!form || !toggle || !input) return;

    toggle.addEventListener('click', () => this._open(form, input));

    if (close) {
      close.addEventListener('click', () => this._close(form, input));
    }

    document.addEventListener('click', (e) => {
      if (
        form.classList.contains('mobile-search-active') &&
        !form.contains(e.target) &&
        e.target !== toggle
      ) {
        this._close(form, input);
      }
    });
  },

  _open(form, input) {
    const closeBtn = document.getElementById('search-close-btn');
    // Quitar d-none de Bootstrap primero, luego activar modo búsqueda
    input.classList.remove('d-none', 'd-md-block');
    input.style.display = 'block';
    if (closeBtn) closeBtn.style.display = 'flex';
    form.classList.add('mobile-search-active');
    requestAnimationFrame(() => input.focus());
  },

  _close(form, input) {
    const closeBtn = document.getElementById('search-close-btn');
    form.classList.remove('mobile-search-active');
    input.style.display = '';
    input.classList.add('d-none', 'd-md-block');
    if (closeBtn) closeBtn.style.display = 'none';
    input.value = '';
    const box = document.getElementById('search-suggestions');
    if (box) { box.innerHTML = ''; box.style.display = 'none'; }
  },
};

/* ============================================================
 * NAV / LAYOUT SECTIONS
 * ============================================================ */
