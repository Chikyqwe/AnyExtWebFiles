'use strict';

const EasterEgg = {
  _count: 0,
  _timer: null,

  init() {
    const logo = Utils.qs('a.logo');
    if (!logo) return;

    // Create the hidden modal
    document.body.insertAdjacentHTML('beforeend', `
      <div id="chikiModal" style="
        display:none; position:fixed; inset:0;
        background:rgba(0,0,0,0.6); z-index:9999;
        justify-content:center; align-items:center;
      ">
        <div style="
          background:var(--bg-2,#222); color:var(--text-primary,#fff);
          padding:30px 40px; border-radius:12px;
          text-align:center; font-family:var(--font-body,sans-serif);
          max-width:300px; border:1px solid rgba(255,255,255,0.1);
        ">
          <p style="font-size:1.1rem; margin-bottom:1.2rem;">
            From <strong>Chikyqwe</strong><br>for the anime community
            <i class="fa-solid fa-heart" style="color:#E94560;"></i>
          </p>
          <button id="chikiModalClose" style="
            padding:8px 22px; background:var(--accent,#00d9c0);
            border:none; border-radius:999px; color:var(--bg-0,#080c10);
            font-weight:700; cursor:pointer;
          ">Cerrar</button>
        </div>
      </div>
    `);

    const modal = Utils.el('chikiModal');
    const closeBtn = Utils.el('chikiModalClose');

    logo.addEventListener('click', (e) => {
      e.preventDefault();
      this._count++;
      console.info(`Logo clicks: 0x${this._count.toString(16).toUpperCase()}`);

      if (this._count >= CONFIG.LOGO_EASTER_EGG_CLICKS) {
        modal.style.display = 'flex';
        this._count = 0;
        clearTimeout(this._timer);
      } else {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => { this._count = 0; }, CONFIG.LOGO_EASTER_EGG_RESET_MS);
      }
    });

    closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
  },
};
/* ============================================================
 * CORDOVA
 * ============================================================ */
