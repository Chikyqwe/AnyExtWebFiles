'use strict';

const Modal = {
  _bsInstance: null,
  _initialized: false,

  clear() {
    const titleEl = Utils.el('modalTitle');
    const descEl = Utils.el('modalDescription');
    const containerEl = Utils.el('episodes-list');
    const tagsEl = Utils.el('modalTags');
    const scoreEl = Utils.el('ratingScore');
    const starsEl = Utils.el('ratingStars');
    const imgEl = Utils.el('modalImage');
    const imgWrapper = Utils.el('modalImgWrapper');

    // Skeleton for title
    if (titleEl) {
      titleEl.textContent = '';
      titleEl.innerHTML = '<div class="skeleton-line" style="width:60%;height:28px;margin:0 auto 8px;"></div>';
    }
    // Skeleton for description
    if (descEl) {
      descEl.textContent = '';
      descEl.innerHTML = `
        <div class="skeleton-line" style="width:100%;height:14px;margin-bottom:8px;"></div>
        <div class="skeleton-line" style="width:90%;height:14px;margin-bottom:8px;"></div>
        <div class="skeleton-line" style="width:75%;height:14px;"></div>
      `;
    }
    // Skeleton for episodes
    if (containerEl) {
      let epSkel = '';
      for (let i = 0; i < 8; i++) {
        epSkel += '<div class="skeleton-ep-card"></div>';
      }
      containerEl.innerHTML = epSkel;
    }
    if (tagsEl) tagsEl.innerHTML = '';
    // Skeleton for rating
    if (scoreEl) {
      scoreEl.textContent = '';
      scoreEl.innerHTML = '<div class="skeleton-line" style="width:36px;height:20px;margin:0 auto;"></div>';
    }
    if (starsEl) {
      starsEl.innerHTML = '<div class="skeleton-line" style="width:120px;height:16px;"></div>';
    }
    // Skeleton for image
    if (imgEl) {
      imgEl.style.display = 'none';
    }
    if (imgWrapper) {
      imgWrapper.classList.add('skeleton-img-loading');
    }
  },

  _clearSkeletons() {
    const imgEl = Utils.el('modalImage');
    const imgWrapper = Utils.el('modalImgWrapper');
    if (imgEl) imgEl.style.display = '';
    if (imgWrapper) imgWrapper.classList.remove('skeleton-img-loading');
  },

  async open(uid) {
    console.log("[AnimeModa] uid: ", uid)
    const uidEl = Utils.el('modalUid');
    if (uidEl) uidEl.textContent = `UID: ${uid}`;
    let anime = Utils.findByUId(uid);

    if (!anime) {
      anime = { unit_id: uid, title: 'Cargando...', image: '' };
    }

    const el = Utils.el('animeModal');
    if (!el) return;

    if (!this._initialized) {
      el.addEventListener('hidden.bs.modal', () => this.clear());
      this._initialized = true;
    }

    this._bsInstance = bootstrap.Modal.getOrCreateInstance(el);
    this.clear();

    if (Utils.el('modalTitle')) Utils.el('modalTitle').textContent = anime.title || 'Cargando...';

    this._bsInstance.show();
    this._initFavoriteBtn(anime);
    this._initShareBtn(uid);

    // Imagen inicial rápida
    try {
      const res = await fetch(CONFIG.API.IMAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: anime.unit_id, type: 'cover' }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const imageUrl = URL.createObjectURL(blob);
        this._setImage(imageUrl);
      }
    } catch (e) {
      console.warn('[Modal.open image]', e);
    }

    await this._loadInfo(anime);
  },

  async _loadInfo(anime) {
    const titleEl = Utils.el('modalTitle');
    const descEl = Utils.el('modalDescription');
    const containerEl = Utils.el('episodes-list');

    if (titleEl) titleEl.textContent = anime.title;

    let dots = 0;
    const interval = setInterval(() => {
      if (descEl) {
        descEl.textContent = `Cargando${'.'.repeat((dots++ % 5) + 1)}`;
      }
    }, 400);

    try {
      const res = await fetch(
        `${CONFIG.API.INFO}?uid=${encodeURIComponent(anime.unit_id)}`
      );

      const data = await res.json();
      clearInterval(interval);

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error en /api/info');
      }

      if (titleEl) titleEl.textContent = data.title;

      this._initFavoriteBtn({ title: data.title, unit_id: data.uid || data.unit_id });
      this._initNotifyBtn(data);
      if (descEl) {
        descEl.textContent = data.desc || 'Sin descripción disponible.';
      }

      // TAGS
      const tagsEl = Utils.el('modalTags');
      if (tagsEl && data.tags?.length) {
        tagsEl.innerHTML = data.tags
          .map(t => `<span class="badge bg-secondary me-1">${t}</span>`)
          .join('');
      }

      this._renderEpisodes(data, containerEl);

      await this._loadRating(data, anime.image);

    } catch (err) {
      clearInterval(interval);
      console.error('[Modal._loadInfo]', err);
      if (descEl) descEl.textContent = 'Error al cargar la información.';
    }
  },

  _renderEpisodes(data, container) {
    if (!container) return;
    container.innerHTML = '';

    // Detectar si el contenido es un manga
    const isManga = data.type === 'manga' || data.category === 'manga';

    // Obtener la lista correcta de elementos (capítulos o episodios)
    const itemsList = isManga ? (data.chapters ?? []) : (data.episodes ?? []);
    const labelPrefix = isManga ? 'Cap.' : 'Ep.';

    const status = (data.status ?? '').toLowerCase();
    const isOngoing = /en emisión|ongoing/.test(status);
    const isFinished = /finaliz|finished|completed/.test(status);
    const badgeColor = isOngoing
      ? '#28a745'
      : isFinished
        ? '#fb3447'
        : '#343a40';

    let badgeText = "";
    if (data.newepdate) {
      badgeText = `Próxima emisión: ${data.newepdate}`;
    } else {
      badgeText = data.status ?? 'Desconocido';
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = 'episode-card';
    statusDiv.innerHTML = `
      <div style="display:flex;align-items:center;width:100%;gap:10px;">
        <button type="button" class="episode-status" style="
          flex:1;
          background-color:${badgeColor} !important;
          cursor:default;
          font-weight:600;
          color:#fff;
        ">${badgeText}</button>
      </div>
    `;

    container.appendChild(statusDiv);

    if (!itemsList.length) return;

    // Si hay menos de 50 elementos invertimos el orden para mostrar los más recientes arriba
    const list = itemsList.length < 50
      ? [...itemsList].reverse()
      : itemsList;

    list.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'episode-card';

      btn.innerHTML = `
        <div class="ep-thumb">
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
            data-uid="${data.uid}"
            data-ep="${item.num}"
            alt="${labelPrefix} ${item.num}"
            loading="lazy"
          />
          <span class="ep-number">${labelPrefix} ${item.num}</span>
        </div>
      `;

      const img = btn.querySelector('img');

      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const uid = data.unit_id ?? data.uid;
        // Se define el tipo de imagen ('ep' para anime o 'chapter'/'ep' según la API externa)
        const imgType = 'ep';
        this._loadEpThumb(img, uid, item.num, imgType);
      }, { rootMargin: '100px' });

      observer.observe(img);

      // Listener para redireccionar según corresponda
      btn.addEventListener('click', () => {
        if (!isManga) {
          window.location.href = `./player.html?uid=${encodeURIComponent(data.uid)}&ep=${item.num}`;
        } else {
          window.location.href = `./reader.html?uid=${encodeURIComponent(data.uid)}&ch=${item.num}`;

        }
      });

      container.appendChild(btn);
    });
  },

  async _loadEpThumb(imgEl, uid, epNum, type = 'ep') {
    const parent = imgEl.closest('.ep-thumb') || imgEl.parentElement;
    if (parent) parent.classList.add('img-loading-skeleton');

    try {
      const res = await fetch(CONFIG.API.IMAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, type, ep: epNum }),
      });

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

  close() {
    const el = Utils.el('animeModal');
    if (!el) return;

    (bootstrap.Modal.getInstance(el) ?? new bootstrap.Modal(el)).hide();
  },

  _setImage(url) {
    const img = Utils.el('modalImage');
    const wrapper = Utils.el('modalImgWrapper');

    if (!img) return;

    img.src = url;

    img.onload = () => {
      this._clearSkeletons();
      wrapper?.style.setProperty('--blur-bg', `url(${url})`);
    };
  },

  async _initFavoriteBtn(anime) {
    const btn = Utils.el('favoriteBtn');
    if (!btn) return;

    const isFav = await Favorites.exists(anime.title);

    console.log("isFav", isFav);

    if (isFav) {
      btn.innerHTML = `<i class="bi bi-heart-fill me-1"></i> Favoritos`;
      btn.classList.toggle('active-btn', isFav);
    } else {
      btn.innerHTML = `<i class="bi bi-heart me-1"></i> Favoritos`;
      btn.classList.toggle('active-btn', isFav);
    }

    btn.onclick = (e) => {
      e.stopPropagation();
      Favorites.toggle(anime, btn);
    };
  },

  _initShareBtn(uid) {
    const btn = Utils.el('shareBtn');
    if (!btn) return;

    btn.onclick = async (e) => {
      e.stopPropagation();

      const url = `https://anyext.qzz.io/app/share?uid=${encodeURIComponent(uid)}`;
      const anime = Utils.findByUId(uid);

      if (navigator.share) {
        try {
          await navigator.share({
            title: anime?.title,
            url
          });
        } catch { }
      } else {
        Share.open('', url);
      }
    };
  },

  async _loadRating(anime) {
    try {
      const res = await fetch(
        `https://kitsu.app/api/edge/anime?filter%5Btext%5D=${anime.slug}`
      );

      const json = await res.json();
      if (!json.data?.length) return;

      const attrs = json.data[0].attributes;

      let rating = attrs.averageRating;

      if (rating == null) {
        const freqs = attrs.ratingFrequencies ?? {};
        let total = 0, count = 0;

        for (const [r, f] of Object.entries(freqs)) {
          total += parseInt(r, 10) * parseInt(f, 10);
          count += parseInt(f, 10);
        }

        if (count > 0) {
          const max = Math.max(...Object.keys(freqs).map(Number));
          rating = Math.round(((total / count) / max) * 100) / 10;
        }
      }

      this._renderStars(rating);

    } catch (err) {
      console.warn('[Modal._loadRating]', err);
    }
  },

  _renderStars(rating) {
    const scoreEl = Utils.el('ratingScore');
    const starsEl = Utils.el('ratingStars');

    if (!scoreEl || !starsEl) return;

    const score = parseFloat(rating);

    scoreEl.textContent = isNaN(score)
      ? '—'
      : (score / 10).toFixed(1);

    if (isNaN(score)) {
      starsEl.innerHTML = '';
      return;
    }

    const value = Math.round((score / 100) * 10 * 2) / 2;
    const full = Math.floor(value);
    const half = value % 1 !== 0;
    const empty = 10 - full - (half ? 1 : 0);

    starsEl.innerHTML =
      '<i class="fa fa-star"></i>'.repeat(full) +
      (half ? '<i class="fa fa-star-half-alt"></i>' : '') +
      '<i class="fa fa-star inactive"></i>'.repeat(empty);
  },

  _isImageBlack(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const scale = Math.min(100 / img.width, 100 / img.height);

        const canvas = Object.assign(document.createElement('canvas'), {
          width: img.width * scale,
          height: img.height * scale,
        });

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let data;
        try {
          data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        } catch {
          return resolve(false);
        }

        let dark = 0, total = 0;

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 10) continue;

          const lum =
            0.2126 * data[i] +
            0.7152 * data[i + 1] +
            0.0722 * data[i + 2];

          if (lum < 45) dark++;
          total++;
        }

        resolve(dark / total > 0.9);
      };

      img.onerror = () => resolve(false);
      img.src = url;
    });
  },

  _initNotifyBtn(data) {
    const btn = Utils.el('notifyBtn');
    if (!btn) return;

    const isFinished = /finaliz|finished|completed/i.test(data.status ?? '');

    if (isFinished) {
      btn.style.display = 'none';
      return;
    }

    btn.style.display = '';
    btn.className = 'btn btn-outline-light flex-fill';

    const uid = data.uid || data.unit_id;
    const storageKey = `notify_${uid}`;
    const isSubscribed = localStorage.getItem(storageKey) === 'true';

    btn.innerHTML = isSubscribed
      ? `<i class="bi bi-bell-fill me-1"></i> Notificaciones activas`
      : `<i class="bi bi-bell me-1"></i> Notificarme`;

    btn.classList.toggle('active-btn', isSubscribed);

    btn.onclick = (e) => {
      e.stopPropagation();
      const nowSub = localStorage.getItem(storageKey) !== 'true';
      localStorage.setItem(storageKey, String(nowSub));

      btn.innerHTML = nowSub
        ? `<i class="bi bi-bell-fill me-1"></i> Notificaciones activas`
        : `<i class="bi bi-bell me-1"></i> Notificarme`;

      btn.classList.toggle('active-btn', nowSub);
    };
  },
};