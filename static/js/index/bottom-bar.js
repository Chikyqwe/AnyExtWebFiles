'use strict';

const BottomBar = {
  init() {
    const bar = Utils.qs('.bottom-bar');
    if (!bar) return;
    window.addEventListener('scroll', () => {
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 20;
      bar.classList.toggle('visible', atBottom);
    }, { passive: true });
  },
};

/* ============================================================
 * EASTER EGG — logo click counter
 * ============================================================ */
