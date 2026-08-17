'use strict';

const Cards = {
  /** Render a list of animes into a container by id */
  render(animes, containerId) {
    const container = Utils.el(containerId);
    if (!container) return;

    container.innerHTML = '';
    State.loadedCards.clear();

    animes.forEach((anime) => {
      const card = this._createBasic(anime);
      container.appendChild(card);
      State.loadedCards.set(anime.title, card);
    });
  },

  /** Render skeleton loaders */
  renderSkeletons(containerId, count = 24, isInitCard = false) {
    const container = Utils.el(containerId);
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      if (isInitCard) {
        card.className = 'anime-card-init skeleton-card-init';
        card.innerHTML = `
          <div class="card-img" style="background: var(--bg-3);"></div>
          <div class="card-content">
            <div class="skeleton-text-title"></div>
            <div class="skeleton-text-sub"></div>
          </div>
        `;
      } else {
        card.className = 'anime-card skeleton-card';
      }
      container.appendChild(card);
    }
  },

  /** 🔥 Helper global para cargar imágenes sin bloquear */
  _loadImage(imgElement, uid, fallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E') {
    const parent = imgElement.closest('.anime-card, .anime-card-init') || imgElement.parentElement;
    if (parent) parent.classList.add('img-loading-skeleton');

    fetch(CONFIG.API.IMAGE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: "cover", uid }),
    })
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);

        const preload = new Image();
        preload.onload = () => {
          imgElement.style.opacity = '0';
          imgElement.src = url;

          requestAnimationFrame(() => {
            if (parent) parent.classList.remove('img-loading-skeleton');
            imgElement.style.transition = 'opacity 0.3s';
            imgElement.style.opacity = '1';
          });
        };
        preload.onerror = () => {
          if (parent) parent.classList.remove('img-loading-skeleton');
          imgElement.src = fallback;
        };
        preload.src = url;
      })
      .catch(() => {
        if (parent) parent.classList.remove('img-loading-skeleton');
        imgElement.src = fallback;
      });
  },

  /** 🔥 Helper to get type data */
  _getTypeData(anime) {
    if (!anime) return { label: 'ANIME', badgeClass: 'badge-anime', isHentai: false };

    const typeStr = [
      anime.type,
      anime.category,
      anime.unit_id,
      anime.id
    ].filter(Boolean).join(' ').toLowerCase();

    if (typeStr.includes('hentai')) {
      return { label: 'HENTAI', badgeClass: 'badge-hentai', isHentai: true };
    }

    if (typeStr.includes('manga')) {
      return { label: 'MANGA', badgeClass: 'badge-manga', isHentai: false };
    }

    if (typeStr.includes('drama')) {
      return { label: 'DRAMA', badgeClass: 'badge-drama', isHentai: false };
    }

    return { label: 'ANIME', badgeClass: 'badge-anime', isHentai: false };
  },

  /** 🔞 Helper para aplicar difuminado y toggle del ojito al hacer clic */
  _setupHentaiBlur(card, typeData) {
    if (!typeData.isHentai) return;

    card.classList.add('is-hentai', 'blurred');

    const eyeBtn = document.createElement('button');
    eyeBtn.type = 'button';
    eyeBtn.className = 'btn-hentai-toggle';
    eyeBtn.title = 'Revelar / Difuminar';
    eyeBtn.innerHTML = '<i class="bi bi-eye-slash"></i>';

    eyeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isBlurred = card.classList.toggle('blurred');

      eyeBtn.innerHTML = isBlurred
        ? '<i class="bi bi-eye-slash"></i>'
        : '<i class="bi bi-eye"></i>';
    });

    // Evita que eventos táctiles o presiones prolongadas activen la tarjeta
    ['mousedown', 'touchstart', 'pointerdown'].forEach((ev) => {
      eyeBtn.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    });

    card.appendChild(eyeBtn);
  },

  /** Basic card */
  _createBasic(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
    const typeData = this._getTypeData(anime);

    card.innerHTML = `
      <div class="card-type-badge ${typeData.badgeClass}">${typeData.label}</div>
      <img src="${placeholder}"
           alt="${Utils.cleanTitle(anime.title)}"
           class="anime-image"
           loading="lazy" />
      <div class="anime-title">${Utils.cleanTitle(anime.title)}</div>
    `;

    const img = card.querySelector('img');
    this._loadImage(img, anime.unit_id);
    this._setupHentaiBlur(card, typeData);

    card.addEventListener('click', (e) => {
      // 🛡️ Ignora el clic si fue dentro del botón del ojo
      if (e.target.closest('.btn-hentai-toggle')) return;
      Modal.open(anime.unit_id);
    });

    return card;
  },

  /** History card */
  async createHistory(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');

    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
    const typeData = this._getTypeData(anime);

    card.innerHTML = `
      <div class="card-type-badge ${typeData.badgeClass}">${typeData.label}</div>
      <img src="${placeholder}"
           alt="${Utils.cleanTitle(anime.title)}"
           class="anime-image"
           loading="lazy" />
      <div class="anime-title">${Utils.cleanTitle(anime.title)}</div>
      <div class="anime-overlay">
        <button class="btn-remove"><i class="bi bi-trash"></i> Quitar del historial</button>
        <button class="btn-playlist"><i class="bi bi-plus-circle"></i> Añadir a playlist</button>
      </div>
    `;

    const img = card.querySelector('img');
    this._loadImage(img, anime.unit_id);
    this._setupHentaiBlur(card, typeData);

    card.addEventListener('click', (e) => {
      // 🛡️ Ignora el clic si fue dentro del botón del ojo
      if (e.target.closest('.btn-hentai-toggle')) return;

      if (!card.classList.contains('show-options')) {
        Modal.open(anime.unit_id);
      }
    });

    let pressTimer;
    card.addEventListener('touchstart', (e) => {
      if (e.target.closest('.btn-hentai-toggle')) return;
      pressTimer = setTimeout(() => card.classList.add('show-options'), 500);
    }, { passive: true });

    card.addEventListener('touchend', () => clearTimeout(pressTimer));

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (e.target.closest('.btn-hentai-toggle')) return;
      card.classList.toggle('show-options');
    });

    document.addEventListener('click', (e) => {
      if (!card.contains(e.target)) card.classList.remove('show-options');
    });

    card.querySelector('.btn-remove').addEventListener('click', async (e) => {
      e.stopPropagation();
      card.classList.add('removing');
      card.addEventListener('animationend', async () => {
        await DB.removeHistory(anime.unit_id ?? anime.id);
        card.remove();
      }, { once: true });
    });

    card.querySelector('.btn-playlist').addEventListener('click', (e) => {
      e.stopPropagation();
      alert(`(Próximamente) Añadir ${Utils.cleanTitle(anime.title)} a playlist`);
    });

    return card;
  },

  /** Favorites card */
  async createFavorite(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';

    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
    const typeData = this._getTypeData(anime);

    card.innerHTML = `
      <div class="card-type-badge ${typeData.badgeClass}">${typeData.label}</div>
      <img src="${placeholder}"
           alt="${Utils.cleanTitle(anime.title)}"
           class="anime-image"
           loading="lazy" />
      <div class="anime-title">${Utils.cleanTitle(anime.title)}</div>
    `;

    const img = card.querySelector('img');
    if (anime.unit_id) {
      this._loadImage(img, anime.unit_id);
      card.addEventListener('click', (e) => {
        // 🛡️ Ignora el clic si fue dentro del botón del ojo
        if (e.target.closest('.btn-hentai-toggle')) return;
        Modal.open(anime.unit_id);
      });
    }

    this._setupHentaiBlur(card, typeData);
    card.setAttribute('data-anime', anime.title);
    return card;
  },

  /** Home card */
  createHome(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card-init';

    let holdTimer, longPress = false, progressBar = null;

    const showBar = () => {
      progressBar = document.createElement('div');
      progressBar.className = 'longpress-bar';
      progressBar.style.cssText = 'width:0%;transition:none;';
      card.appendChild(progressBar);
      void progressBar.offsetWidth;
      progressBar.style.cssText = 'width:100%;transition:width 1.5s linear;';
    };

    const clearBar = () => { progressBar?.remove(); progressBar = null; };

    const startHold = (e) => {
      if (e.target.closest('.btn-hentai-toggle')) return;
      longPress = false;
      showBar();
      holdTimer = setTimeout(() => {
        longPress = true;
        Modal.open(anime.id);
        clearBar();
      }, 1500);
    };

    const cancelHold = () => {
      clearTimeout(holdTimer);
      clearBar();
    };

    ['mousedown', 'touchstart'].forEach((ev) =>
      card.addEventListener(ev, startHold, { passive: true })
    );

    ['mouseup', 'mouseleave', 'touchend', 'touchmove'].forEach((ev) =>
      card.addEventListener(ev, cancelHold, { passive: true })
    );

    card.addEventListener('click', (e) => {
      // 🛡️ Ignora el clic si fue dentro del botón del ojo
      if (longPress || e.target.closest('.btn-hentai-toggle')) return;
      window.location.href = `/player/${anime.id}/${anime.episodioNum}`;
    });

    const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
    const typeData = this._getTypeData(anime);

    card.innerHTML = `
      <div class="card-type-badge ${typeData.badgeClass}">${typeData.label}</div>
      <img src="${placeholder}" 
           alt="${anime.alt ?? anime.titulo}" 
           class="card-img" 
           loading="lazy" />
      <div class="card-content">
        <h4 class="card-title">${anime.titulo}</h4>
        <p class="card-subtitle">${anime.episodio}</p>
      </div>
    `;

    const img = card.querySelector('img');
    this._loadImage(img, anime.id);
    this._setupHentaiBlur(card, typeData);

    return card;
  }
};