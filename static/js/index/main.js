'use strict';

async function main() {
  Theme.init();
  BottomBar.init();
  MobileSearch.init();
  Nav.init();
  Search.init();
  EasterEgg.init();
  AnimeAPI.init();

  if (!Policy.isAccepted()) {
    Policy.init();
    Policy.monitor();
  }

  if (Utils.el('menuTitle')) {
    const versionEl = Utils.el('menuTitle');
    versionEl.textContent = 'AnimeEXT';
  }
  if (Utils.el('menuSt')) {
    const versionEl = Utils.el('menuSt');
    versionEl.textContent = 'AnimeEXT';
  }
  const startTime = performance.now();
  Progress.set(10);
  const [,] = await Promise.allSettled([
    (async () => {
      try {
        Progress.set(20);
        const page = Utils.getPageParam();

        // ← Nuevo: usa fetchAnimeList con paginación
        const listData = await AnimeAPI.fetchAnimeList(page);
        Progress.set(45);

        // verificar si hay ?page= en la URL
        const urlParams = new URLSearchParams(window.location.search);
        const pageParam = urlParams.get('page');
        if (pageParam) {
          console.log('[main] pageParam found, showing directory');
          await Layout.show(2);
        } else {
          console.log('[main] pageParam not found, showing home');
          await Layout.show(1);
        }

        // State.fullAnimeList ya fue seteado dentro de fetchAnimeList
        Progress.set(55);

        const searchTerm = new URLSearchParams(window.location.search).get('s');
        const searchInput = Utils.el('searchInput');

        if (searchTerm && searchInput) {
          searchInput.value = searchTerm;
          await Search.run(null, searchTerm);
        } else {
          Cards.render(listData.items, 'card-container');
          Pagination.create(listData.totalPages, page);
        }

        Progress.set(70);
        await Loader.waitForImages('.anime-card img');
        Progress.set(88);
      } catch (err) {
        console.error('[main fetchList]', err);
        Progress.set(88);
      }
    })(),
    (async () => {
      await HomeFeed.load();
      Progress.advance(5);
    })(),
  ]);

  const elapsed = performance.now() - startTime;
  const remaining = Math.max(0, CONFIG.MIN_LOAD_MS - elapsed);
  setTimeout(() => Loader.hide(), remaining);
  window.addEventListener('popstate', async () => {
    const page = Utils.getPageParam();
    const listData = await AnimeAPI.fetchAnimeList(page);

    Cards.render(listData.items, 'card-container');
    Pagination.create(listData.totalPages, page);

  });
}
document.addEventListener('DOMContentLoaded', main);
