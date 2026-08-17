'use strict';

const ContinueWatching = {

  _getLast() {
    try { return JSON.parse(localStorage.getItem('lasted')); }
    catch { return null; }
  },

  show: async () => {
    const data = ContinueWatching._getLast();
    if (!data) return;
    const anime = Utils.findByUId(data.uid);
    if (!anime) return;

    const titleEl = Utils.el('continue-watching-title');
    const imgEl = Utils.el('continue-watching-img');
    const btnEl = Utils.el('continue-watching-btn');
    if (!titleEl || !imgEl || !btnEl) return;

    titleEl.textContent = `${anime.title} — Episodio ${data.ep}`;
    try {
      const res = await fetch(CONFIG.API.IMAGE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: anime.unit_id, type: 'cover' }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const imageUrl = URL.createObjectURL(blob);
        imgEl.src = imageUrl;
      } else {
        imgEl.src = anime.image || 'static/default-poster.jpg';
      }
    } catch (e) {
      console.error(e);
      imgEl.src = 'static/default-poster.jpg';
    }
    btnEl.onclick = () => { window.location.href = `/${data.uid}/${data.ep}`; };

    new bootstrap.Modal(Utils.el('continueWatchingModal')).show();
  },
};

/* ============================================================
 * SCROLL — show/hide bottom bar
 * ============================================================ */
