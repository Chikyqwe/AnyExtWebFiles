'use strict';

const Layout = {
  _sectionIds: {
    search: 'search-section',
    anime: 'anime-section',
    directory: 'directory-section',
    historial: 'historial-section',
    favoritos: 'favoritos-section',
    subs: 'subs-section',
  },
  _swipe: {
    startX: 0,
    enabled: false,
  },
  /** Hide all sections and sidebar/pagination */
  _hideAll() {
    Object.values(this._sectionIds).forEach((id) =>
      Utils.el(id)?.classList.add('d-none')
    );
    Utils.qs('.sidebar')?.classList.add('d-none');
    Utils.el('pagination-controls')?.classList.add('d-none');
  },

  _enableSwipe() {
    // 1. Evitar duplicar listeners
    if (this._swipe && this._swipe.enabled) return;

    const el = Utils.el('directory-section');
    if (!el) {
      console.error("No se encontró el elemento directory-section");
      return;
    }

    // 2. Inicializar estado
    this._swipe = {
      enabled: true,
      startX: 0,
      startY: 0,
    };

    // Solo usamos touch events para no interferir con clicks del mouse en PC
    el.addEventListener('touchstart', (e) => {
      this._swipe.startX = e.touches[0].clientX;
      this._swipe.startY = e.touches[0].clientY;
    }, { passive: true });

    el.addEventListener('touchend', async (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = this._swipe.startX - endX;
      const diffY = this._swipe.startY - endY;
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);

      // Si el gesto es principalmente vertical, no lo consideramos un swipe lateral
      if (absDiffY > 80 && absDiffY > absDiffX * 1.2) return;

      // Umbral de 100px para evitar falsos positivos
      if (absDiffX < 100) return;

      let page = Utils.getPageParam();
      const oldPage = page;

      if (diffX > 0) {
        page++;
      } else {
        page = Math.max(1, page - 1);
      }

      await this._showDirectory(page, oldPage);
    });
  },

  async show(num) {
    Loader.show();
    this._hideAll();
    Nav.setActive(num);

    switch (num) {
      case 1: await this._showHome(); break;
      case 2: await this._showDirectory(); break;
      case 3: await this._showHistory(); break;
      case 4: await this._showFavorites(); break;
      default: Loader.hide();
    }
  },

  async _showHome() {
    Utils.el('anime-section')?.classList.remove('d-none');
    Utils.qs('.sidebar')?.classList.remove('d-none');
    setTimeout(() => Loader.hide(), 1000);
  },

  async _showDirectory(forcedPage = null, oldPage = null) {
    Utils.el('directory-section')?.classList.remove('d-none');
    Utils.el('pagination-controls')?.classList.remove('d-none');

    const page = forcedPage || Utils.getPageParam();

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

    Pagination.create(listData.totalPages, page);

    // Actualizar tabs de Animes / Mangas / Dramas
    const mangaStart = listData.mangaStartPage || 0;
    const dramaStart = listData.dramaStartPage || 0;

    const tabAnimes = Utils.el('tab-animes');
    const tabMangas = Utils.el('tab-mangas');
    const tabDramas = Utils.el('tab-dramas');

    if (tabAnimes && tabMangas) {
      console.log(listData)
      // Actualizar tabs de Animes / Mangas / Dramas
      const mangaStart = listData.mangaStartPage || 0;
      const dramaStart = listData.dramaStartPage || 0;

      const tabAnimes = Utils.el('tab-animes');
      const tabMangas = Utils.el('tab-mangas');
      const tabDramas = Utils.el('tab-dramas');

      if (tabAnimes && tabMangas) {
        // Remover event listeners anteriores clonando los nodos
        const newTabAnimes = tabAnimes.cloneNode(true);
        const newTabMangas = tabMangas.cloneNode(true);
        const newTabDramas = tabDramas ? tabDramas.cloneNode(true) : null;

        tabAnimes.parentNode.replaceChild(newTabAnimes, tabAnimes);
        tabMangas.parentNode.replaceChild(newTabMangas, tabMangas);
        if (tabDramas && newTabDramas) {
          tabDramas.parentNode.replaceChild(newTabDramas, tabDramas);
        }

        // Determinar la pestaña activa (CORREGIDO)
        const isDrama = dramaStart > 0 && page >= dramaStart;
        const isManga = !isDrama && mangaStart > 0 && page >= mangaStart;
        const isAnime = !isManga && !isDrama;

        const activeClass = 'btn btn-primary active px-4';
        const inactiveClass = 'btn btn-outline-light px-4';

        newTabAnimes.className = isAnime ? activeClass : inactiveClass;
        newTabMangas.className = isManga ? activeClass : inactiveClass;
        if (newTabDramas) {
          newTabDramas.className = isDrama ? activeClass : inactiveClass;
        }

        // Listeners de navegación
        newTabAnimes.addEventListener('click', () => {
          if (!isAnime) {
            this._hideAll();
            Loader.show();
            this._showDirectory(1, page);
          }
        });

        newTabMangas.addEventListener('click', () => {
          if (!isManga && mangaStart > 0) {
            this._hideAll();
            Loader.show();
            this._showDirectory(mangaStart, page);
          }
        });

        if (newTabDramas) {
          newTabDramas.addEventListener('click', () => {
            if (!isDrama && dramaStart > 0) {
              this._hideAll();
              Loader.show();
              this._showDirectory(dramaStart, page);
            }
          });
        }
      }
    }

    // Actualizar URL
    try { history.pushState(null, '', `?page=${page}`); } catch (e) { }

    this._enableSwipe();

    setTimeout(() => Loader.hide(), 1000);
  },

  async _showHistory() {
    Utils.el('historial-section')?.classList.remove('d-none');
    const container = Utils.el('historial-container');
    if (!container) { Loader.hide(); return; }

    container.innerHTML = '<p class="text-white-50">Cargando historial…</p>';

    try {
      const history = await DB.getHistory();
      if (!history.length) {
        container.innerHTML = '<p class="text-white-50">No hay historial disponible.</p>';
        Loader.hide();
        return;
      }

      container.innerHTML = '';

      for (const item of history) {
        let anime = State.fullAnimeList.find(
          (a) => a.unit_id === item.uid || a.id === item.uid
        );

        if (!anime) {
          try {
            const res = await fetch(`${CONFIG.API.BASIC_INFO}?uid=${item.uid}`);
            const data = await res.json();

            anime = {
              unit_id: item.uid,
              title: data?.title || item.title || 'Anime'
            };
          } catch (e) {
            console.warn('Error obteniendo info del anime:', item.uid);
            anime = {
              unit_id: item.uid,
              title: item.title || 'Anime'
            };
          }
        }

        const card = await Cards.createHistory(anime);
        container.appendChild(card);
      }

    } catch (err) {
      console.error('[Layout._showHistory]', err);
      container.innerHTML = '<p class="text-danger">Error al cargar historial.</p>';
    }

    setTimeout(() => Loader.hide(), 1000);
  },

  async _showFavorites() {
    Utils.el('favoritos-section')?.classList.remove('d-none');
    const container = Utils.el('favoritos-container');
    if (!container) { Loader.hide(); return; }

    container.innerHTML = '<p class="text-white-50">Cargando favoritos…</p>';

    try {
      const favs = await Favorites.loadAll();

      if (!favs.length) {
        container.innerHTML = '<p class="text-white-50">Aún no has agregado animes a favoritos.</p>';
        Loader.hide();
        return;
      }

      container.innerHTML = '';
      for (const fav of favs) {
        let anime = State.fullAnimeList.find((a) => a.title === fav.title || (fav.uid && (a.unit_id === fav.uid || a.id === fav.uid)));

        if (!anime) {
          if (fav.uid) {
            try {
              const res = await fetch(`${CONFIG.API.BASIC_INFO}?uid=${fav.uid}`);
              const data = await res.json();
              anime = { unit_id: fav.uid, title: data?.title || fav.title || 'Anime' };
            } catch {
              anime = { title: fav.title, unit_id: fav.uid };
            }
          } else {
            anime = { title: fav.title };
          }
        }
        const card = await Cards.createFavorite(anime);
        card.setAttribute('data-anime', anime.title);
        container.appendChild(card);
      }
    } catch (err) {
      console.error('[Layout._showFavorites]', err);
      container.innerHTML = '<p class="text-danger">Error al mostrar favoritos.</p>';
    }

    setTimeout(() => Loader.hide(), 1000);
  }
};