'use strict';

const Overlay = {
  _timeEl: null,
  _titleEl: null,
  _el: null,

  init() {
    this._timeEl = Utils.el('currentTimeDisplay');
    this._titleEl = Utils.el('animeTitleDisplay');
    this._el = Utils.el('infoOverlay');
    setInterval(() => this._tick(), 1000);
    this._tick();
  },

  _tick() {
    if (!this._timeEl) return;
    const now = new Date();
    this._timeEl.textContent =
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0');
  },

  show() { this._el?.classList.add('show'); },
  hide() { this._el?.classList.remove('show'); },

  setTitle() {
    const title = State.config?.title || '';
    const ep = State.config?.ep ?? '';
    if (!title || !this._titleEl) return;

    const suffix = ` - ${ep}`;
    const overlay = Utils.el('infoOverlay');
    const timeEl = Utils.el('currentTimeDisplay');
    const available = overlay.offsetWidth - timeEl.offsetWidth - 50;

    const probe = document.createElement('span');
    probe.style.cssText = 'visibility:hidden;position:absolute;white-space:nowrap;';
    probe.style.font = window.getComputedStyle(this._titleEl).font;
    document.body.appendChild(probe);

    probe.textContent = title + suffix;
    if (probe.offsetWidth <= available) {
      this._titleEl.textContent = title + suffix;
      probe.remove();
      return;
    }

    // Binary search for best truncation
    let lo = 0, hi = title.length, best = '';
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const test = title.slice(0, mid) + '...' + suffix;
      probe.textContent = test;
      if (probe.offsetWidth <= available) { best = test; lo = mid + 1; }
      else { hi = mid - 1; }
    }
    this._titleEl.textContent = best;
    probe.remove();
  },
};
