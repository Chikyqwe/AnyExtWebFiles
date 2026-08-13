'use strict';

const Favorites = {
  loadAll: () => DB.favoriteLoadAll(),
  exists: (title) => DB.favoriteExists(title),
  add: (anime) => DB.favoriteAdd(anime),
  remove: (title) => DB.favoriteRemove(title),

  async toggle(anime, btn) {
    try {
      const isFav = await this.exists(anime.title);
      isFav ? await this.remove(anime.title) : await this.add(anime);
      const nowFav = !isFav;


      // Sync DOM card in favorites list if visible
      const favContainer = Utils.el('favoritos-container');
      if (favContainer) {
        if (!nowFav) {
          favContainer.querySelector(`[data-anime="${CSS.escape(anime.title)}"]`)?.remove();
        } else if (!favContainer.classList.contains('d-none')) {
          const card = await Cards.createFavorite(anime);
          favContainer.appendChild(card);
        }
      }

      if (btn) {
        btn.className = 'btn flex-fill btn-outline-light';
        if (nowFav) {
          btn.innerHTML = `<i class="bi bi-heart-fill me-1"></i> Favoritos`;
        } else {
          btn.innerHTML = `<i class="bi bi-heart me-1"></i> Favoritos`;
        }
        btn.classList.toggle('active-btn', nowFav);
      }
    } catch (err) {
      console.error('[Favorites.toggle]', err);
    }
  },
};

/* ============================================================
 * MODAL  (anime info)
 * ============================================================ */
