'use strict';

const Theme = {
  STORAGE_KEY: 'theme',

  init() {
    const saved = localStorage.getItem(Theme.STORAGE_KEY);
    if (saved === 'light') Theme._apply('light');
  },

  toggle() {
    const isLight = document.body.classList.contains('light-theme');
    Theme._apply(isLight ? 'dark' : 'light');
  },

  _apply(mode) {
    document.body.classList.toggle('light-theme', mode === 'light');
    document.body.classList.toggle('dark-theme', mode === 'dark');
    localStorage.setItem(Theme.STORAGE_KEY, mode);

    // Update all theme icons in the page (both the bottom bar and settings overlay)
    const icons = [Utils.el('themeIcon'), Utils.el('overlayThemeIcon')];
    icons.forEach((icon) => {
      if (icon) {
        icon.classList.toggle('fa-sun', mode === 'light');
        icon.classList.toggle('fa-moon', mode === 'dark');
      }
    });

    // Update close-button icon colors
    Utils.qsa('button i.fa-xmark').forEach((ico) => {
      ico.style.color = mode === 'light' ? '#222' : '#f1f1f1';
    });
  },
};

/* ============================================================
 * LOADER
 * ============================================================ */
