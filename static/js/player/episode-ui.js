'use strict';

const EpisodeUI = {
  render(data) {
    const nav = Utils.el('nav-buttons');
    const list = Utils.el('episode-list');
    const ep = State.config.ep;
    const PER = 12;
    let group = Math.floor((ep - 1) / PER);

    nav.innerHTML = `
      <div class="episode-indicator-badge">
        <span class="badge-prefix">Ep</span>
        <span class="badge-num">${ep}</span>
        <span class="badge-total">/ ${data.eps || data.episodes_count}</span>
        <div id="serverButtons" class="server-buttons-inline"></div>
      </div>
      <div class="nav-toolbar"></div>
      <div class="nav-right-placeholder"></div>
    `;
    const toolbar = nav.querySelector('.nav-toolbar');

    Utils.el('anime-title').innerText = data.title;

    // 1. Navigation Left (<)
    const prev = this._navBtn('<i class="bi bi-chevron-left"></i>', 'Anterior');
    prev.className = 'btn nav-control-btn prev-btn';
    if (ep > 1) {
      prev.onclick = () => Player.loadEpisode(ep - 1);
    } else {
      prev.disabled = true;
    }
    toolbar.appendChild(prev);

    // 2. Info Button (I)
    const home = this._navBtn('<i class="bi bi-info-circle-fill"></i>', 'Info del Anime');
    home.className = 'btn nav-util-btn info-btn';
    home.onclick = () => {
      if (typeof Modal.open === 'function') Modal.open(State.config.uid);
    };
    toolbar.appendChild(home);

    // 3. Blur Button (B)
    const blur = this._navBtn(
      State.blurEnabled ? '<i class="bi bi-eye-fill"></i>' : '<i class="bi bi-eye-slash-fill"></i>',
      'Efecto Blur'
    );
    blur.className = 'btn nav-util-btn blur-btn';
    if (State.blurEnabled) {
      blur.classList.add('active');
    }
    blur.onclick = () => {
      if (State.blurEnabled) {
        Blur.disable();
        blur.classList.remove('active');
        blur.innerHTML = '<i class="bi bi-eye-slash-fill"></i>';
      } else {
        Blur.enable();
        blur.classList.add('active');
        blur.innerHTML = '<i class="bi bi-eye-fill"></i>';
      }
    };
    toolbar.appendChild(blur);

    // 4. Theme Button (T)
    const themeBtn = document.createElement('button');
    themeBtn.id = 'theme-toggle';
    themeBtn.className = 'btn nav-util-btn theme-btn';
    themeBtn.title = 'Cambiar tema';
    const isLight = document.body.classList.contains('light-theme');
    themeBtn.innerHTML = isLight
      ? '<i class="bi bi-sun-fill"></i>'
      : '<i class="bi bi-moon-stars-fill"></i>';
    themeBtn.onclick = () => {
      Theme.toggle();
      const updatedIsLight = document.body.classList.contains('light-theme');
      themeBtn.innerHTML = updatedIsLight
        ? '<i class="bi bi-sun-fill"></i>'
        : '<i class="bi bi-moon-stars-fill"></i>';
    };
    toolbar.appendChild(themeBtn);

    // 5. Navigation Right (>)
    const next = this._navBtn('<i class="bi bi-chevron-right"></i>', 'Siguiente');
    next.className = 'btn nav-control-btn next-btn';
    if (ep < data.eps || data.episodes_count) {
      next.onclick = () => Player.loadEpisode(ep + 1);
    } else {
      next.disabled = true;
    }
    toolbar.appendChild(next);

    const renderGroup = () => {
      list.innerHTML = '';
      let epst = data.eps || data.episodes_count
      const total = Math.ceil(epst / PER);
      const start = group * PER + 1;
      const end = Math.min(start + PER - 1, epst);

      // Wrapper for pagination controls
      const paginationWrapper = document.createElement('div');
      paginationWrapper.className = 'episodes-pagination-wrapper';

      if (group > 0) {
        const b = this._epBtn('◀');
        b.className = 'btn pagination-group-btn';
        b.onclick = () => { group--; renderGroup(); };
        paginationWrapper.appendChild(b);
      } else {
        const spacer = document.createElement('div');
        spacer.className = 'pagination-spacer';
        paginationWrapper.appendChild(spacer);
      }

      const pageIndicator = document.createElement('span');
      pageIndicator.className = 'pagination-page-indicator';
      pageIndicator.innerText = `Pág. ${group + 1} de ${total}`;
      paginationWrapper.appendChild(pageIndicator);

      if (group < total - 1) {
        const b = this._epBtn('▶');
        b.className = 'btn pagination-group-btn';
        b.onclick = () => { group++; renderGroup(); };
        paginationWrapper.appendChild(b);
      } else {
        const spacer = document.createElement('div');
        spacer.className = 'pagination-spacer';
        paginationWrapper.appendChild(spacer);
      }

      if (total > 1) {
        list.appendChild(paginationWrapper);
      }

      // Grid of episodes – image cards
      const grid = document.createElement('div');
      grid.className = 'episodes-grid';

      for (let i = start; i <= end; i++) {
        const isActive = i === ep;

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'ep-card-player' + (isActive ? ' active' : '');
        card.title = `Episodio ${i}`;

        card.innerHTML = `
          <div class="ep-card-thumb">
            <img
              src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
              data-uid="${State.config.uid}"
              data-ep="${i}"
              alt="Ep. ${i}"
              loading="lazy"
            />
            <span class="ep-card-num">Ep. ${i}</span>
            ${isActive ? '<span class="ep-card-playing"><i class="bi bi-play-circle-fill"></i></span>' : ''}
          </div>
        `;

        const img = card.querySelector('img');
        const observer = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          this._loadEpThumb(img, State.config.uid, i);
        }, { rootMargin: '80px' });
        observer.observe(img);

        card.onclick = () => Player.loadEpisode(i);
        grid.appendChild(card);
      }

      list.appendChild(grid);
    };

    renderGroup();
  },

  _thumbnailsCache: {},

  async _loadEpThumb(imgEl, uid, epNum) {
    const parent = imgEl.closest('.ep-card-thumb') || imgEl.parentElement;
    if (parent) parent.classList.add('img-loading-skeleton');

    try {
      if (!this._thumbnailsCache[uid]) {
        const thumbRes = await fetch(`${CONFIG.API.THUMBNAIL}?uid=${uid}`);
        if (!thumbRes.ok) throw new Error('Failed to fetch thumbnails json');
        const data = await thumbRes.json();
        this._thumbnailsCache[uid] = data.imgs || [];
      }

      const proxyUrl = this._thumbnailsCache[uid][epNum - 1];
      if (!proxyUrl) throw new Error('Thumbnail not found');

      const res = await fetch(proxyUrl);
      if (!res.ok) {
        if (parent) parent.classList.remove('img-loading-skeleton');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const preload = new Image();
      preload.onload = () => {
        imgEl.style.opacity = '0';
        imgEl.src = url;
        requestAnimationFrame(() => {
          if (parent) parent.classList.remove('img-loading-skeleton');
          imgEl.style.transition = 'opacity 0.3s';
          imgEl.style.opacity = '1';
        });
      };
      preload.onerror = () => {
        if (parent) parent.classList.remove('img-loading-skeleton');
      };
      preload.src = url;
    } catch {
      if (parent) parent.classList.remove('img-loading-skeleton');
    }
  },

  _navBtn(html, title) {
    const b = document.createElement('button');
    b.innerHTML = html;
    b.title = title;
    return b;
  },

  _epBtn(text) {
    const b = document.createElement('button');
    b.className = 'btn episode-btn';
    b.textContent = text;
    return b;
  },
};
