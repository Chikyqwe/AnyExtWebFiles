'use strict';

const Utils = {
  /** Normalize a string for comparison (lowercase, no accents, trimmed) */
  normalize(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /** Return a trimmed title or empty string */
  cleanTitle: (t) => (t ? t.trim() : ''),

  /** Parse current page from URL (?page=N), defaults to 1 */
  getPageParam() {
    const raw = new URLSearchParams(window.location.search).get('page');
    return /^[1-9]\d*$/.test(raw) ? parseInt(raw, 10) : 1;
  },

  /** Slice an array for a given page */
  paginate(items, page, perPage = CONFIG.PER_PAGE) {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  },

  /** Find anime by unit_id */
  findByUId(uid) {
    return State.fullAnimeList.find((a) => a.unit_id === uid) ?? null;
  },

  /** Find anime by id */
  findById(id) {
    return State.fullAnimeList.find((a) => a.id === id) ?? null;
  },

  /** Debounce a function */
  debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /** Safely get an element by id */
  el: (id) => document.getElementById(id),

  /** Safely query a selector */
  qs: (sel, root = document) => root.querySelector(sel),

  /** Safely query all with selector */
  qsa: (sel, root = document) => Array.from(root.querySelectorAll(sel)),
};

/* ============================================================
 * THEME
 * ============================================================ */
