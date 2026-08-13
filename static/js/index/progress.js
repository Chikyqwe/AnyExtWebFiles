'use strict';

const Progress = {
  _bar: null,
  _current: 0,

  get bar() {
    return (this._bar ??= Utils.el('loaderBar'));
  },

  /** Set progress 0-100 */
  set(pct) {
    this._current = Math.min(100, Math.max(0, pct));
    if (this.bar) this.bar.style.width = `${this._current}%`;
  },

  /** Advance by N points */
  advance(n) {
    this.set(this._current + n);
  },
};

/* ============================================================
 * MOBILE MENU
 * ============================================================ */
