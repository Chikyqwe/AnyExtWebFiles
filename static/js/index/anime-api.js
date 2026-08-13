'use strict';

const AnimeAPI = {
  _pageCache: null,
  _preloading: new Set(),

  init() {
    this._pageCache = new this._LRUCache(5);
  },

  /* =========================
   * LRU CACHE (privado)
   * ========================= */
  _LRUCache: class {
    constructor(limit = 10) {
      this.limit = limit;
      this.cache = new Map();
    }

    get(key) {
      if (!this.cache.has(key)) return null;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }

    set(key, value) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
      }

      this.cache.set(key, value);

      if (this.cache.size > this.limit) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
    }

    has(key) {
      return this.cache.has(key);
    }
  },

  /* =========================
   * CORE FETCH
   * ========================= */
  async _get(page = 1) {
    try {
      const res = await fetch(`${CONFIG.API.LIST}?p=${page}`);
      if (!res.ok) throw new Error('Error al cargar lista de animes');

      let data = await res.json();

      if (data.page > data.totalpages) {
        const resS = await fetch(`${CONFIG.API.LIST}?p=${data.totalpages}`);
        data = await resS.json();
      }

      if (data.items) {
        data.items.forEach(item => {
          if (!State.animeIds.has(item.unit_id)) {
            State.animeIds.add(item.unit_id);
            State.fullAnimeList.push(item);
          }
        });
      }

      return {
        items: data.items || [],
        totalPages: data.totalpages || 0,
        mangaStartPage: data.manga_start_page || 0,
        dramaStartPage: data.drama_start_page || 0
      };

    } catch (err) {
      console.error('[AnimeAPI._get]', err);
      return { items: [], totalPages: 0, mangaStartPage: 0 };
    }
  },

  /* =========================
   * PRELOAD
   * ========================= */
  _preload(page, totalPages) {
    const pages = [page - 1, page + 1];

    pages.forEach(p => {
      if (
        p > 0 &&
        p <= totalPages &&
        !this._pageCache.has(p) &&
        !this._preloading.has(p)
      ) {
        this._preloading.add(p);

        this._get(p)
          .then(result => {
            this._pageCache.set(p, result);
          })
          .finally(() => {
            this._preloading.delete(p);
          });
      }
    });
  },

  /* =========================
   * PUBLIC API
   * ========================= */
  async fetchAnimeList(page = 1) {
    const cached = this._pageCache.get(page);
    if (cached) return cached;

    const result = await this._get(page);

    this._pageCache.set(page, result);
    this._preload(page, result.totalPages);

    return result;
  }
};

/* ============================================================
 * MAIN INIT
 * ============================================================ */
