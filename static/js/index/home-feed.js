'use strict';

const FeaturedBanner = {
  _items: [],
  _currentIndex: 0,
  _listenersAttached: false,

  setAnimeList(list) {
    if (!Array.isArray(list) || list.length === 0) return;
    this._items = list;
    this._attachNavListeners();
  },

  _attachNavListeners() {
    if (this._listenersAttached) return;
    this._listenersAttached = true;

    const prevBtn = Utils.el('bannerPrevBtn');
    const nextBtn = Utils.el('bannerNextBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prev());
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.next());
    }
  },

  prev() {
    if (!this._items.length) return;
    this._currentIndex = (this._currentIndex - 1 + this._items.length) % this._items.length;
    const item = this._items[this._currentIndex];
    if (item && item.id) this.load(item.id);
  },

  next() {
    if (!this._items.length) return;
    this._currentIndex = (this._currentIndex + 1) % this._items.length;
    const item = this._items[this._currentIndex];
    if (item && item.id) this.load(item.id);
  },

  showSkeleton() {
    const banner = Utils.el('featured-banner');
    if (!banner) return;
    banner.classList.remove('d-none');
    banner.classList.add('skeleton-banner');
  },

  async load(uid, savedEp = null) {
    const banner = Utils.el('featured-banner');
    if (!banner) return;

    this.showSkeleton();

    try {
      const res = await fetch(
        `${CONFIG.API.INFO}?uid=${uid}`
      );

      const anime = await res.json();

      if (!anime || anime.error) {
        banner.classList.add('d-none');
        banner.classList.remove('skeleton-banner');
        return;
      }

      // background
      const bg = Utils.el('bannerBg');
      const blur = Utils.el('bannerBlur');

      if (bg) {
        bg.style.backgroundImage = `url(${anime.image || ''})`;
      }

      if (blur) {
        blur.style.backgroundImage = `url(${anime.image || ''})`;
      }

      // title
      const title = Utils.el('bannerTitle');

      if (title) {
        title.textContent = anime.title || '';
      }

      // meta
      const meta = Utils.el('bannerMeta');

      if (meta) {
        const categoryStr = anime.category
          ? anime.category.charAt(0).toUpperCase() +
          anime.category.slice(1)
          : 'Anime';

        const statusClass =
          anime.status === 'Finalizado'
            ? 'finalizado'
            : '';

        meta.innerHTML = `
          <span>${categoryStr}</span>
          <span class="banner-meta-dot"></span>
          <span class="banner-status-badge ${statusClass}">
            <i class="fa-solid ${anime.status === 'Finalizado'
            ? 'fa-circle-xmark'
            : 'fa-circle-dot'
          } me-1"></i>
            ${anime.status || 'En emisión'}
          </span>
        `;
      }

      // tags
      const tagsContainer = Utils.el('bannerTags');

      if (tagsContainer) {
        tagsContainer.innerHTML = '';
        if (Array.isArray(anime.tags)) {
          anime.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'banner-tag';
            span.textContent = tag;
            tagsContainer.appendChild(span);
          });
        }
      }

      // description
      const desc = Utils.el('bannerDescription');

      if (desc) {
        desc.textContent = anime.desc || '';
      }

      // actions
      const actions = Utils.el('bannerActions');

      if (actions) {
        actions.innerHTML = '';

        // PLAY
        const playBtn = document.createElement('button');

        playBtn.className =
          'btn btn-primary me-2';

        if (savedEp) {
          playBtn.innerHTML = `
            <i class="fa fa-play me-2"></i>
            Continuar Ep. ${savedEp}
          `;

          playBtn.onclick = () => {
            window.location.href =
              `/player/${uid}/${savedEp}`;
          };

        } else {
          playBtn.innerHTML = `
            <i class="fa fa-play me-2"></i>
            Ver Anime
          `;

          playBtn.onclick = () => {
            Modal.open(uid);
          };
        }

        // INFO
        const infoBtn = document.createElement('button');

        infoBtn.className =
          'btn btn-outline-light';

        infoBtn.innerHTML = `
          <i class="fa fa-circle-info me-2"></i>
          Información
        `;

        infoBtn.onclick = () => {
          Modal.open(uid);
        };

        actions.appendChild(playBtn);
        actions.appendChild(infoBtn);
      }

      banner.classList.remove('d-none', 'skeleton-banner');

    } catch (err) {
      console.error(
        '[FeaturedBanner.load]',
        err
      );

      banner.classList.add('d-none');
      banner.classList.remove('skeleton-banner');
    }
  }
};

const HomeFeed = {

  async load(featuredUid = null) {

    try {

      let uid = featuredUid;
      let savedEp = null;

      // CONTINUAR VIENDO
      if (!uid) {
        try {
          const lasted = JSON.parse(
            localStorage.getItem('lasted')
          );

          if (lasted?.uid) {
            uid = lasted.uid;
            savedEp = lasted.ep || 1;
          }

        } catch (e) {
          console.warn(
            'Error leyendo lasted',
            e
          );
        }
      }

      // Mostrar skeletons INMEDIATAMENTE tanto para el banner como para la lista
      FeaturedBanner.showSkeleton();
      Cards.renderSkeletons('anime-list', 12, true);

      // Si ya tenemos el UID, iniciamos la carga del banner EN PARALELO con los episodios
      let bannerPromise = null;
      if (uid) {
        bannerPromise = FeaturedBanner.load(uid, savedEp);
      }

      const res = await fetch(CONFIG.API.LAST);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        FeaturedBanner.setAnimeList(data);

        // Si no teníamos UID previo, usamos el primer anime devuelto
        if (!uid) {
          bannerPromise = FeaturedBanner.load(data[0].id, null);
        }
      }

      if (!Array.isArray(data)) return;

      const list = Utils.el('anime-list');

      if (list) {
        list.innerHTML = '';

        data.forEach((anime) => {
          list.appendChild(
            Cards.createHome(anime)
          );
        });
      }

      if (bannerPromise) {
        await bannerPromise;
      }

    } catch (err) {
      console.error(
        '[HomeFeed.load]',
        err
      );
    }
  },
};  