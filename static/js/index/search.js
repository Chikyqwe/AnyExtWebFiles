'use strict';

const Search = {
  /**
   * Helper para determinar la categoría y clase CSS del badge
   */
  _getTypeData(anime) {
    if (!anime) return { label: 'ANIME', badgeClass: 'badge-anime' };

    const typeStr = [
      anime.type,
      anime.category,
      anime.unit_id,
      anime.id
    ].filter(Boolean).join(' ').toLowerCase();

    if (typeStr.includes('hentai')) {
      return { label: 'HENTAI', badgeClass: 'badge-hentai' };
    }
    if (typeStr.includes('manga')) {
      return { label: 'MANGA', badgeClass: 'badge-manga' };
    }
    if (typeStr.includes('drama')) {
      return { label: 'DRAMA', badgeClass: 'badge-drama' };
    }

    return { label: 'ANIME', badgeClass: 'badge-anime' };
  },

  init() {
    const input = Utils.el('searchInput');
    if (!input) return;

    input.addEventListener(
      'input',
      Utils.debounce(() => Search.suggest(), CONFIG.SEARCH_DEBOUNCE_MS)
    );

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      const box = Utils.el('search-suggestions');
      if (box && !box.contains(e.target) && e.target !== input) {
        box.style.display = 'none';
        box.innerHTML = '';
      }
    });
  },

  /** Triggered from the form onsubmit */
  async run(event = null, term = null) {
    event?.preventDefault();

    // Guardamos el texto antes de cerrar la barra (porque al cerrar se borra el input)
    const raw = term ?? Utils.el('searchInput')?.value ?? '';
    const normalized = Utils.normalize(raw);

    // Cerramos la barra de búsqueda en móvil de forma segura
    Utils.el('search-close-btn')?.click();

    // Update URL
    const url = new URL(window.location.href);
    normalized ? url.searchParams.set('s', normalized) : url.searchParams.delete('s');
    if (!term) {
      try { window.history.pushState({}, '', url); } catch (e) { }
    }

    if (!normalized) {
      const page = Utils.getPageParam();
      Cards.render(Utils.paginate(State.fullAnimeList, page), 'card-container');
      Pagination.create(State.fullAnimeList.length, page);
      return;
    }

    const terms = normalized.split(' ').filter(Boolean);

    ['anime-section', 'directory-section', 'historial-section', 'favoritos-section'].forEach((id) =>
      Utils.el(id)?.classList.add('d-none')
    );
    Utils.el('search-section')?.classList.remove('d-none');
    Utils.qs('.sidebar')?.classList.add('d-none');
    Utils.el('pagination-controls')?.classList.add('d-none');
    Cards.renderSkeletons('search-container', 12, false);
    const titleEl = Utils.el('search-title');
    if (titleEl) titleEl.textContent = `Resultados para: ${normalized}`;

    // Llamada a la API de búsqueda del backend
    let merged = [];
    try {
      const res = await fetch(CONFIG.API.SEARCH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: normalized })
      });
      const apiResults = await res.json();

      // Registramos los resultados en la lista global para que el modal los encuentre
      apiResults.forEach(item => {
        if (!State.fullAnimeList.find(a => a.unit_id === item.unit_id)) {
          State.fullAnimeList.push({ ...item, image: item.image || '' });
        }
      });

      merged = apiResults;
    } catch (err) {
      console.error('[Search API Error]', err);
      // Fallback a búsqueda local si falla la API
      merged = this._filterLocal(terms);
    }

    this._renderResults(merged, normalized);
  },

  _filterLocal(terms) {
    return State.fullAnimeList.filter((anime) =>
      terms.every((t) => Utils.normalize(anime.title).includes(t))
    );
  },

  async _fetchKitsu(query, terms) {
    try {
      const res = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}`);
      const json = await res.json();

      return json.data
        .filter((item) => {
          const titles = [
            item.attributes.canonicalTitle,
            item.attributes.titles?.en,
            item.attributes.titles?.en_jp,
            item.attributes.titles?.ja_jp,
          ].filter(Boolean).map(Utils.normalize);
          return terms.every((t) => titles.some((title) => title.includes(t)));
        })
        .map((item) => {
          const apiTitles = [
            item.attributes.canonicalTitle,
            item.attributes.titles?.en,
            item.attributes.titles?.en_jp,
            item.attributes.titles?.ja_jp,
          ].filter(Boolean).map(Utils.normalize);

          return State.fullAnimeList.find((a) =>
            [a.title, a.en_jp, a.ja_jp].filter(Boolean).map(Utils.normalize)
              .some((t) => apiTitles.includes(t))
          );
        })
        .filter(Boolean);
    } catch (err) {
      console.error('[Kitsu search]', err);
      return [];
    }
  },

  _renderResults(results, term) {
    const container = Utils.el('search-container');
    if (!container) return;

    if (!results.length) {
      container.innerHTML = '<p class="text-white-50">Sin resultados. Intenta con otro término.</p>';
      return;
    }

    container.innerHTML = '';
    results.forEach((anime) => container.appendChild(Cards._createBasic(anime)));
  },

  /** Live suggestions dropdown */
  async suggest() {
    const input = Utils.el('searchInput');
    const box = Utils.el('search-suggestions');
    if (!input || !box) return;

    const value = Utils.normalize(input.value);
    box.innerHTML = '';

    if (!value || !State.fullAnimeList.length) {
      box.style.display = 'none';
      return;
    }

    State.lastSearchTerm = value;

    try {
      const res = await fetch(CONFIG.API.SEARCH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: value })
      });
      const results = await res.json();
      if (State.lastSearchTerm !== value) return;

      // Registramos resultados para el Modal
      results.forEach(item => {
        if (!State.fullAnimeList.find(a => a.unit_id === item.unit_id)) {
          State.fullAnimeList.push(item);
        }
      });

      this._renderSuggestions(results.slice(0, 5), box);
    } catch (err) {
      // Fallback local
      const terms = value.split(' ').filter(Boolean);
      let local = State.fullAnimeList
        .filter((a) => {
          const titles = [a.title, a.en_jp, a.ja_jp].filter(Boolean).map(Utils.normalize);
          return titles.some((t) => terms.every((term) => t.includes(term)));
        })
        .slice(0, 4);
      this._renderSuggestions(local, box);
    }
  },

  _renderSuggestions(list, box) {
    const input = Utils.el('searchInput');
    if (!input?.value?.trim()) { box.style.display = 'none'; return; }

    box.innerHTML = '';
    list.forEach((anime) => {
      const item = document.createElement('li');

      // Obtenemos la etiqueta y la clase dinámica
      const { label, badgeClass } = this._getTypeData(anime);

      item.innerHTML = `
        <div class="suggestion-thumb-wrapper">
          <img src="${CONFIG.API.IMAGE_PROXY(anime.image)}" alt="${anime.title}" loading="lazy" />
        </div>
        <div class="suggestion-info">
          <div class="suggestion-title">${Utils.cleanTitle(anime.title)}</div>
          <div class="suggestion-meta">
            <span class="suggestion-badge ${badgeClass}">${label}</span>
          </div>
        </div>
        <div class="suggestion-arrow">
          <i class="fa fa-chevron-right"></i>
        </div>
      `;
      item.addEventListener('click', () => {
        Modal.open(anime.unit_id);
        box.innerHTML = '';
        box.style.display = 'none';
      });
      box.appendChild(item);
    });
    box.style.display = list.length ? 'block' : 'none';
  },
};

// Expose globally for the HTML onsubmit attribute
window.searchAnime = (e) => Search.run(e);

/* ============================================================
 * DATABASE  (IndexedDB helpers)
 * ============================================================ */