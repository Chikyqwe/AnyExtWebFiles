'use strict';

const Nav = {
  NAV_ITEMS: [
    { desktop: 'navInicio', mobile: 'slideNavInicio' },
    { desktop: 'navDirectorio', mobile: 'slideNavDirectorio' },
    { desktop: 'navHistorial', mobile: 'slideNavHistorial' },
    { desktop: 'navFavoritos', mobile: 'slideNavFavoritos' }
  ],

  init() {
    for (let i = 0; i < this.NAV_ITEMS.length; i++) {
      const item = this.NAV_ITEMS[i];
      const section = i + 1;

      const desktopEl = Utils.el(item.desktop);
      const mobileEl = Utils.el(item.mobile);

      if (desktopEl) {
        desktopEl.addEventListener('click', (e) => {
          e.preventDefault();
          Layout.show(section);
        });
      }

      if (mobileEl) {
        mobileEl.addEventListener('click', (e) => {
          e.preventDefault();
          closeSidebar();
          Layout.show(section);
        });
      }
    }
  },

  setActive(section) {
    const index = Number(section) - 1;

    if (index < 0 || index >= this.NAV_ITEMS.length) {
      console.warn('[Nav] setActive inválido:', section);
      return;
    }

    const activeItem = this.NAV_ITEMS[index];

    // Para desktop
    const desktopLinks = Utils.qsa('nav.main-nav a.nav-item');
    for (let i = 0; i < desktopLinks.length; i++) {
      desktopLinks[i].classList.remove('active');
      if (desktopLinks[i].id === activeItem.desktop) {
        desktopLinks[i].classList.add('active');
      }
    }

    // Para SIDEBAR (nuevo)
    const slideLinks = Utils.qsa('.sidebar-slide-item');
    for (let i = 0; i < slideLinks.length; i++) {
      slideLinks[i].classList.remove('active');
      if (slideLinks[i].id === activeItem.mobile) {
        slideLinks[i].classList.add('active');
      }
    }
  }
};