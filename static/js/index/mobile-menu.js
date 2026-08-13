'use strict';

const MobileMenu = {
  init() {
    const btn = Utils.el('hamburgerBtn');
    const menu = Utils.el('mobileDropdownMenu');
    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        this.close();
      }
    });
  },

  toggle() {
    const menu = Utils.el('mobileDropdownMenu');
    if (menu) menu.classList.toggle('show');
  },

  close() {
    const menu = Utils.el('mobileDropdownMenu');
    if (menu) menu.classList.remove('show');
  },
};
