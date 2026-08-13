'use strict';

const DB = {
  /* ---- Favorites DB ---- */
  _openFavorites() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CONFIG.DB.FAVORITES.name, CONFIG.DB.FAVORITES.version);
      req.onerror = () => reject('Error abriendo FavoritosDB');
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(CONFIG.DB.FAVORITES.store)) {
          db.createObjectStore(CONFIG.DB.FAVORITES.store, { keyPath: 'title' });
        }
      };
    });
  },

  async _favTx(mode) {
    const db = await this._openFavorites();
    const tx = db.transaction(CONFIG.DB.FAVORITES.store, mode);
    const store = tx.objectStore(CONFIG.DB.FAVORITES.store);
    return store;
  },

  async favoriteAdd(anime) {
    const store = await this._favTx('readwrite');
    return new Promise((res, rej) => {
      const data = { title: anime.title, uid: anime.unit_id || anime.id || anime.uid || null };
      const r = store.put(data);
      r.onsuccess = () => res(true);
      r.onerror = () => rej('Error al agregar favorito');
    });
  },

  async favoriteRemove(title) {
    const store = await this._favTx('readwrite');
    return new Promise((res, rej) => {
      const r = store.delete(title);
      r.onsuccess = () => res(true);
      r.onerror = () => rej('Error al eliminar favorito');
    });
  },

  async favoriteExists(title) {
    const store = await this._favTx('readonly');
    return new Promise((res, rej) => {
      const r = store.get(title);
      r.onsuccess = () => res(!!r.result);
      r.onerror = () => rej('Error al verificar favorito');
    });
  },

  async favoriteLoadAll() {
    const store = await this._favTx('readonly');
    return new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej('Error al cargar favoritos');
    });
  },

  /* ---- Cache / History / Progress DB ---- */
  _openCache() {
    if (State.dbCache) return Promise.resolve(State.dbCache);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CONFIG.DB.CACHE.name, CONFIG.DB.CACHE.version);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { State.dbCache = req.result; resolve(req.result); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const store of [CONFIG.DB.CACHE.store, 'progress', 'history']) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: store === 'history' ? 'uid' : store === 'progress' ? 'slug' : 'url' });
          }
        }
      };
    });
  },

  async addToHistory(uid) {
    const db = await this._openCache();

    return new Promise((res, rej) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');

      const r = store.put({ uid });
      r.onsuccess = () => res(uid);
      r.onerror = () => rej(r.error);
    });
  },

  async loadProgress(slug) {
    const db = await this._openCache();
    return new Promise((res, rej) => {
      const r = db.transaction('progress', 'readonly').objectStore('progress').get(slug);
      r.onsuccess = () => res(r.result?.currentTime ?? 0);
      r.onerror = () => rej(r.error);
    });
  },

  async saveProgress(slug, currentTime) {
    const db = await this._openCache();
    return new Promise((res, rej) => {
      const r = db.transaction('progress', 'readwrite').objectStore('progress').put({ slug, currentTime });
      r.onsuccess = () => res(currentTime);
      r.onerror = () => rej(r.error);
    });
  },

  async getHistory() {
    const db = await this._openCache();
    return new Promise((res, rej) => {
      const r = db.transaction('history', 'readonly').objectStore('history').getAll();
      r.onsuccess = () => res(r.result ?? []);
      r.onerror = () => rej(r.error);
    });
  },

  async removeHistory(uid) {
    const history = await this.getHistory();
    const updated = history.filter((h) => h.uid !== uid);
    localStorage.setItem('history', JSON.stringify(updated));
  },
};

/* ============================================================
 * FAVORITES  (facade over DB)
 * ============================================================ */
