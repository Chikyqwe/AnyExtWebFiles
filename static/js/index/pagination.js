'use strict';

const Pagination = {
  create(totalPages, currentPage) {
    const container = Utils.el('pagination-controls');
    if (!container) return;
    container.innerHTML = '';

    console.log('[Pagination.create] totalPages:', totalPages);
    if (totalPages <= 1) return;

    const groupSize = this._groupSize();
    const groupStart = Math.floor((currentPage - 1) / groupSize) * groupSize + 1;
    const groupEnd = Math.min(groupStart + groupSize - 1, totalPages);

    const wrap = document.createElement('div');
    wrap.id = 'pagination';

    const btn = (page, label, isNav = false) => {
      const b = document.createElement('button');
      b.textContent = label ?? String(page);
      b.className = `pagination-btn${isNav ? ' nav' : ''}${page === currentPage ? ' active' : ''}`;
      b.addEventListener('click', () => this._changePage(page, currentPage));
      return b;
    };

    if (groupStart > 1) wrap.appendChild(btn(currentPage - 1, '«', true));
    for (let i = groupStart; i <= groupEnd; i++) wrap.appendChild(btn(i));
    if (groupEnd < totalPages) wrap.appendChild(btn(currentPage + 1, '»', true));

    const jumpBtn = document.createElement('button');
    jumpBtn.innerHTML = '<i class="bi bi-three-dots"></i>';
    jumpBtn.title = 'Ir a la página...';
    jumpBtn.className = 'pagination-btn nav';
    jumpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._showJumpModal(totalPages, currentPage, jumpBtn);
    });
    wrap.appendChild(jumpBtn);

    container.appendChild(wrap);
  },

  _showJumpModal(totalPages, currentPage, anchorBtn) {
    let popup = document.getElementById('pagination-jump-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'pagination-jump-popup';
      popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg-2);
        border: 1px solid var(--bg-4);
        border-radius: var(--radius-md);
        padding: 16px 24px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        gap: 12px;
        align-items: center;
      `;
      popup.innerHTML = `
        <span style="font-size:0.85rem; color:var(--text-secondary); font-weight:600;">Ir a pág:</span>
        <input type="number" id="jump-page-input" min="1" style="
          width: 70px;
          background: var(--bg-3);
          border: 1px solid var(--bg-4);
          color: var(--text-primary);
          border-radius: 6px;
          padding: 6px 10px;
          outline: none;
          font-family: inherit;
        " />
        <button id="jump-page-submit" style="
          background: var(--accent);
          color: var(--bg-0);
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s;
        ">Ir</button>
      `;
      document.body.appendChild(popup);

      document.addEventListener('click', (e) => {
        if (!popup.contains(e.target) && !anchorBtn.contains(e.target)) {
          popup.style.display = 'none';
        }
      });

      const submitBtn = popup.querySelector('#jump-page-submit');
      submitBtn.onmouseover = () => submitBtn.style.transform = 'scale(1.05)';
      submitBtn.onmouseout = () => submitBtn.style.transform = 'scale(1)';
    }

    const input = popup.querySelector('#jump-page-input');
    const submitBtn = popup.querySelector('#jump-page-submit');

    input.max = totalPages;
    input.value = currentPage;

    popup.style.display = 'flex';

    input.focus();
    input.select();

    const doJump = () => {
      let p = parseInt(input.value, 10);
      if (isNaN(p) || p < 1) p = 1;
      if (p > totalPages) p = totalPages;
      popup.style.display = 'none';
      if (p !== currentPage) {
        this._changePage(p, currentPage);
      }
    };

    submitBtn.onclick = doJump;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') doJump();
      if (e.key === 'Escape') popup.style.display = 'none';
    };
  },

  _groupSize() {
    const w = window.innerWidth;
    if (w < 430) return 3;
    if (w < 650) return 5;
    if (w < 800) return 7;
    return 10;
  },

  async _changePage(page, oldPage = null) {
    Loader.show();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const params = new URLSearchParams(window.location.search);
    params.set('page', page);
    try {
      window.history.pushState({ page }, '', `${window.location.pathname}?${params}`);
    } catch (e) { }

    Cards.renderSkeletons('card-container', 24, false);

    const listData = await AnimeAPI.fetchAnimeList(page);
    Cards.render(listData.items, 'card-container');

    const container = Utils.el('card-container');
    if (container) {
      container.classList.remove('slide-in-right', 'slide-in-left');
      void container.offsetWidth;
      if (oldPage && page > oldPage) {
        container.classList.add('slide-in-right');
      } else if (oldPage && page < oldPage) {
        container.classList.add('slide-in-left');
      } else {
        container.classList.add('slide-in-right');
      }
    }

    this.create(listData.totalPages, page);

    await Loader.waitForImages();
    localStorage.setItem('lastPage', page);
    Loader.hide();
  },
};

/* ============================================================
 * SEARCH
 * ============================================================ */
