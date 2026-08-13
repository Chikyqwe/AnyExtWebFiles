'use strict';

const Loader = {
  _el: null,

  get el() {
    return (this._el ??= Utils.el('loader'));
  },

  show() {
    const { el } = this;
    if (!el) return;
    el.classList.add('fade-once');
    el.classList.remove('fade-out');
    el.style.display = 'flex';
    void el.offsetWidth; // force reflow
    el.classList.add('fade-in');
  },

  hide() {
    const { el } = this;
    if (!el) return;
    Progress.set(100);
    setTimeout(() => {
      el.classList.remove('fade-in');
      el.classList.add('fade-out');
      setTimeout(() => {
        el.style.display = 'none';
        el.classList.remove('fade-once', 'fade-out');
        Progress.set(0);
      }, 600);
    }, 250);
  },

  /** Wait for all matching images to load or error */
  async waitForImages(selector = '.anime-card img') {
    const images = Utils.qsa(selector);

    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalHeight !== 0) {
          return Promise.resolve(); // ya cargada
        }

        return new Promise((resolve) => {
          const done = () => {
            cleanup();
            resolve(); // SIEMPRE resolve (éxito lógico)
          };

          const cleanup = () => {
            img.onload = null;
            img.onerror = null;
            clearTimeout(timer);
          };

          img.onload = done;
          img.onerror = done;

          const timer = setTimeout(done, 3000); // 3s máximo
        });
      })
    );
  }
};

/* ============================================================
 * PROGRESS BAR  (real steps)
 * ============================================================ */
