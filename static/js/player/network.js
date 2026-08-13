'use strict';

const Network = {
  async check() {
    try {
      const resp = await fetch(CONFIG.STATUS_URL, { method: 'GET', cache: 'no-store' });
      if (resp.ok) {
        Utils.el('mainContent')?.style.setProperty('display', 'block');
        Utils.el('offlineOverlay')?.classList.add('hidden');
        if (!State.mainInitDone) { State.mainInitDone = true; Player.init(); }
      } else {
        this._offline();
      }
    } catch {
      this._offline();
    }
  },

  _offline() {
    const vid = Utils.el('player');
    vid?.pause();
    Utils.el('mainContent')?.style.setProperty('display', 'none');
    Utils.el('offlineOverlay')?.classList.remove('hidden');
  },
};
