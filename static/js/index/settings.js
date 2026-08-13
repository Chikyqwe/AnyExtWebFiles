'use strict';

const Settings = {
  openMenu() {
    const el = Utils.el('menuOverlay');
    el?.classList.remove('d-none');
    setTimeout(() => el?.classList.add('show'), 10);
  },

  closeOverlay(id) {
    const el = Utils.el(id);
    el?.classList.remove('show');
    setTimeout(() => el?.classList.add('d-none'), 300);
  },

  showPolicy() {
    this.closeOverlay('menuOverlay');
    Policy.init();
  },
};

// Expose globally (used by HTML onclick attributes)
window.cerrarOverlay = (id) => Settings.closeOverlay(id);
window.abrirMenuOpciones = () => Settings.openMenu();
window.verPolitica = () => Settings.showPolicy();
window.toggleTheme = () => Theme.toggle();

/* ============================================================
 * POLICY MODAL
 * ============================================================ */
