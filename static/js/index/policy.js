'use strict';

const Policy = {
  STORAGE_KEY: 'policyAccepted',

  init() {
    let overlay = Utils.el('policyOverlay');
    if (!overlay) {
      document.body.insertAdjacentHTML('beforeend', Policy._html());
      overlay = Utils.el('policyOverlay');
    }

    const iframe = Utils.el('policyIframe');
    const acceptBtn = Utils.el('policyAcceptBtn');
    const declineBtn = Utils.el('policyCloseBtn');
    if (!overlay || !iframe || !acceptBtn) return;

    iframe.src = './app_policy.html';
    overlay.classList.remove('d-none');

    // prevent closing via backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        Policy._shake(overlay);
      }
    });

    // Decline → shake + warning
    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        Toast.show('Debes aceptar la política de privacidad para continuar usando la aplicación.', 'error');
        Policy._shake(overlay);
      });
    }

    // Accept → save & close
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem(Policy.STORAGE_KEY, 'true');
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    }, { once: true });
  },

  isAccepted: () => !!localStorage.getItem(Policy.STORAGE_KEY),

  /** Shake the modal to indicate the user can't skip */
  _shake(overlay) {
    const modal = overlay.querySelector('.policy-modal');
    if (!modal) return;
    modal.classList.remove('policy-shake');
    void modal.offsetWidth; // force reflow
    modal.classList.add('policy-shake');
  },

  _html: () => `
    <div id="policyOverlay" class="policy-overlay" style="transition:opacity .3s ease">
      <div class="policy-modal">

        <div class="policy-header">
          <h5 class="m-0" style="display:flex;align-items:center;gap:8px">
            <i class="bi bi-shield-lock-fill" style="color:var(--accent);font-size:1.1rem"></i>
            Política de Privacidad
          </h5>
          <button id="policyCloseBtn" style="background:none;border:none;font-size:1.2rem;color:var(--text-muted);">
            <i class="fa fa-xmark"></i>
          </button>
        </div>

        <iframe id="policyIframe" class="policy-iframe" loading="lazy" title="Política de privacidad"></iframe>
        <div class="policy-footer text-end">
          <button id="policyAcceptBtn" class="btn btn-success fw-semibold px-4">Aceptar</button>
        </div>
      </div>
    </div>
  `,

  /** Watch for DOM removal and restore if necessary */
  monitor() {
    setInterval(() => {
      if (!Policy.isAccepted() && !Utils.el('policyOverlay')) {
        console.warn('[Policy] Overlay eliminado del DOM, restaurando…');
        Policy.init();
      }
    }, 1000);
  },
};

/* ============================================================
 * CONTINUE WATCHING
 * ============================================================ */
