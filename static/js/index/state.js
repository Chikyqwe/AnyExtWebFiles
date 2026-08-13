'use strict';

const State = {
  animeIds: new Set(),
  fullAnimeList: [],
  loadedCards: new Map(),
  lastSearchTerm: '',
  dbCache: null,
  currentAnime: null,
  pageCache: null,
  preloading: new Set()
};

/* ============================================================
 * UTILS
 * ============================================================ */
