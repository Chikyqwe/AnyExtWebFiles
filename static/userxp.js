/**
 * ============================================================
 * AnimeEXT — shared.js
 * ============================================================
 * Módulos compartidos entre index.html y player.html:
 *   · Search   (búsqueda + sugerencias)
 *   · Modal    (info del anime + episodios + rating)
 *   · Share    (modal de compartir)
 *
 * Dependencias esperadas en el scope global (definidas en
 * index.js / player.js según la página):
 *   CONFIG, State, Utils, DB, Favorites, Cards,
 *   Subscriptions, Pagination, Layout, Loader
 *
 * En player.js, CONFIG.API y State pueden ser parciales;
 * los métodos que no apliquen simplemente no se invocan.
 * ============================================================
 */

'use strict';

/* ============================================================
 * SEARCH
 * ============================================================ */
const Search = {
    async init() {
        const res = await fetch(CONFIG.API.LIST);
        const json = await res.json();
        State.fullAnimeList = Array.isArray(json.animes) ? json.animes : [];

        const input = Utils.el('searchInput');
        if (!input) return;

        input.addEventListener(
            'input',
            Utils.debounce(() => Search.suggest(), CONFIG.SEARCH_DEBOUNCE_MS),
        );

        document.addEventListener('click', (e) => {
            const box = Utils.el('search-suggestions');
            if (box && !box.contains(e.target) && e.target !== input) {
                box.style.display = 'none';
                box.innerHTML = '';
            }
        });
    },

    async run(event = null, term = null) {
        event?.preventDefault();

        const raw = term ?? Utils.el('searchInput')?.value ?? '';
        const normalized = Utils.normalize(raw);

        const url = new URL(window.location.href);
        normalized
            ? url.searchParams.set('s', normalized)
            : url.searchParams.delete('s');
        try { if (!term) window.history.pushState({}, '', url); } catch(e) {}

        if (!normalized) {
            const page = Utils.getPageParam();
            Cards.render(Utils.paginate(State.fullAnimeList, page), 'card-container');
            Pagination.create(State.fullAnimeList.length, page);
            return;
        }

        const terms = normalized.split(' ').filter(Boolean);
        const localResults = this._filterLocal(terms);
        const kitsuResults = await this._fetchKitsu(normalized, terms);

        const seen = new Set(localResults.map((a) => Utils.normalize(a.title)));
        const merged = [...localResults];
        for (const k of kitsuResults) {
            const n = Utils.normalize(k.title);
            if (!seen.has(n)) { seen.add(n); merged.push(k); }
        }

        this._renderResults(merged, normalized);
    },

    _filterLocal(terms) {
        return State.fullAnimeList.filter((anime) =>
            terms.every((t) => Utils.normalize(anime.title).includes(t)),
        );
    },

    async _fetchKitsu(query, terms) {
        try {
            const res = await fetch(
                `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}`,
            );
            const json = await res.json();

            return json.data
                .filter((item) => {
                    const titles = [
                        item.attributes.canonicalTitle,
                        item.attributes.titles?.en,
                        item.attributes.titles?.en_jp,
                        item.attributes.titles?.ja_jp,
                    ]
                        .filter(Boolean)
                        .map(Utils.normalize);
                    return terms.every((t) => titles.some((title) => title.includes(t)));
                })
                .map((item) => {
                    const apiTitles = [
                        item.attributes.canonicalTitle,
                        item.attributes.titles?.en,
                        item.attributes.titles?.en_jp,
                        item.attributes.titles?.ja_jp,
                    ]
                        .filter(Boolean)
                        .map(Utils.normalize);
                    return State.fullAnimeList.find((a) =>
                        [a.title, a.en_jp, a.ja_jp]
                            .filter(Boolean)
                            .map(Utils.normalize)
                            .some((t) => apiTitles.includes(t)),
                    );
                })
                .filter(Boolean);
        } catch (err) {
            console.error('[Kitsu search]', err);
            return [];
        }
    },

    _renderResults(results, term) {
        Loader.show();
        ['anime-section', 'directory-section', 'historial-section', 'favoritos-section'].forEach(
            (id) => Utils.el(id)?.classList.add('d-none'),
        );
        Utils.el('search-section')?.classList.remove('d-none');
        Utils.qs('.sidebar')?.classList.add('d-none');
        Utils.el('pagination-controls')?.classList.add('d-none');

        const titleEl = Utils.el('search-title');
        if (titleEl) titleEl.textContent = `Resultados para: ${term}`;

        const container = Utils.el('search-container');
        if (!container) { Loader.hide(); return; }

        if (!results.length) {
            container.innerHTML =
                '<p class="text-muted">Sin resultados. Intenta con otro término.</p>';
            Loader.hide();
            return;
        }
        container.innerHTML = '';
        results.forEach((anime) => container.appendChild(Cards._createBasic(anime)));
        setTimeout(() => Loader.hide(), 1000);
    },

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
        const terms = value.split(' ').filter(Boolean);

        const local = State.fullAnimeList
            .filter((a) => {
                const titles = [a.title, a.en_jp, a.ja_jp]
                    .filter(Boolean)
                    .map(Utils.normalize);
                return titles.some((t) => terms.every((term) => t.includes(term)));
            })
            .slice(0, 4);

        this._renderSuggestions(local, box);

        try {
            const res = await fetch(
                `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(value)}`,
            );
            const json = await res.json();
            if (State.lastSearchTerm !== value) return;

            const remote = json.data
                .map((item) => {
                    const apiTitles = [
                        item.attributes.canonicalTitle,
                        item.attributes.titles?.en,
                        item.attributes.titles?.en_jp,
                        item.attributes.titles?.ja_jp,
                    ]
                        .filter(Boolean)
                        .map(Utils.normalize);
                    return State.fullAnimeList.find((a) =>
                        [a.title, a.en_jp, a.ja_jp]
                            .filter(Boolean)
                            .map(Utils.normalize)
                            .some((t) => apiTitles.includes(t)),
                    );
                })
                .filter(Boolean);

            const combined = [
                ...local,
                ...remote.filter((a) => !local.includes(a)),
            ].slice(0, 4);
            this._renderSuggestions(combined, box);
        } catch { /* silent */ }
    },

    _renderSuggestions(list, box) {
        const input = Utils.el('searchInput');
        if (!input?.value?.trim()) { box.style.display = 'none'; return; }

        box.innerHTML = '';
        list.forEach((anime) => {
            const item = document.createElement('li');
            item.innerHTML = `
        <img src="${CONFIG.API.IMAGE_PROXY(anime.image)}"
             alt="${anime.title}" loading="lazy" />
        <span>${anime.title}</span>
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

// Binding global para onsubmit del formulario en el HTML
window.searchAnime = (e) => Search.run(e);
const MobileSearch = {
    init() {
        const form = Utils.qs('.search-form');
        const toggle = Utils.el('search-toggle-btn');
        const input = Utils.el('searchInput');
        const close = Utils.el('search-close-btn');
        if (!form || !toggle || !input) return;

        toggle.addEventListener('click', () => this._open(form, input));

        if (close) {
            close.addEventListener('click', () => this._close(form, input));
        }

        document.addEventListener('click', (e) => {
            if (
                form.classList.contains('mobile-search-active') &&
                !form.contains(e.target) &&
                e.target !== toggle
            ) {
                this._close(form, input);
            }
        });
    },

    _open(form, input) {
        const closeBtn = document.getElementById('search-close-btn');
        // Quitar d-none de Bootstrap primero, luego activar modo búsqueda
        input.classList.remove('d-none', 'd-md-block');
        input.style.display = 'block';
        if (closeBtn) closeBtn.style.display = 'flex';
        form.classList.add('mobile-search-active');
        requestAnimationFrame(() => input.focus());
    },

    _close(form, input) {
        const closeBtn = document.getElementById('search-close-btn');
        form.classList.remove('mobile-search-active');
        input.style.display = '';
        input.classList.add('d-none', 'd-md-block');
        if (closeBtn) closeBtn.style.display = 'none';
        input.value = '';
        const box = document.getElementById('search-suggestions');
        if (box) { box.innerHTML = ''; box.style.display = 'none'; }
    },
};
/*=============================================================
 * FAVOTIRES
 *=============================================================*/
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

            const favContainer = Utils.el('favoritos-container');
            if (favContainer) {
                if (!nowFav) {
                    favContainer.querySelector(`[data-anime="${CSS.escape(anime.title)}"]`)?.remove();
                } else if (!favContainer.classList.contains('d-none')) {
                    const card = Cards.createFavorite(anime);
                    card.setAttribute('data-anime', anime.title);
                    favContainer.appendChild(card);
                }
            }

            if (btn) {
                btn.innerHTML = `<i class="fa fa-heart me-1"></i> ${nowFav ? 'Quitar de Favoritos' : 'Agregar a Favoritos'}`;
                btn.classList.toggle('btn-dark', nowFav);
                btn.classList.toggle('btn-outline-light', !nowFav);
            }
        } catch (err) {
            console.error('[Favorites.toggle]', err);
        }
    },
};

/*=============================================================
 * CARDS
 *=============================================================*/
const Cards = {
    createBasic(anime) {
        const card = document.createElement('div');
        card.className = 'card-anime';
        card.dataset.anime = anime.unit_id;
        card.innerHTML = `
      <div class="card-anime-img">
        <img src="${CONFIG.API.IMAGE_PROXY(anime.image)}" alt="${anime.title}" loading="lazy" />
      </div>
      <div class="card-anime-info">
        <div class="card-anime-title">${anime.title}</div>
        <div class="card-anime-meta">
          <span>${anime.year}</span>
          <span>${anime.type}</span>
        </div>
      </div>
    `;
        card.addEventListener('click', () => Modal.open(anime.unit_id));
        return card;
    },

    createFavorite(anime) {
        const card = document.createElement('div');
        card.className = 'card-anime';
        card.dataset.anime = anime.unit_id;
        card.innerHTML = `
      <div class="card-anime-img">
        <img src="${CONFIG.API.IMAGE_PROXY(anime.image)}" alt="${anime.title}" loading="lazy" />
      </div>
      <div class="card-anime-info">
        <div class="card-anime-title">${anime.title}</div>
        <div class="card-anime-meta">
          <span>${anime.year}</span>
          <span>${anime.type}</span>
        </div>
      </div>
    `;
        card.addEventListener('click', () => Modal.open(anime.unit_id));
        return card;
    },

    createHistory(item) {
        const card = document.createElement('div');
        card.className = 'card-anime';
        card.dataset.anime = item.unit_id;
        card.innerHTML = `
      <div class="card-anime-img">
        <img src="${CONFIG.API.IMAGE_PROXY(item.image)}" alt="${item.title}" loading="lazy" />
      </div>
      <div class="card-anime-info">
        <div class="card-anime-title">${item.title}</div>
        <div class="card-anime-meta">
          <span>${item.year}</span>
          <span>${item.type}</span>
        </div>
      </div>
    `;
        card.addEventListener('click', () => Modal.open(item.unit_id));
        return card;
    },
};
/*=============================================================
 * MODAL
 *=============================================================*/
const Modal = {
    _bsInstance: null,

    async open(uid) {
        let anime = Utils.findByUId(uid);

        if (!anime) {
            anime = { unit_id: uid, title: 'Cargando...', image: '' };
        }

        const el = Utils.el('animeModal');
        if (!el) return;

        this._bsInstance = bootstrap.Modal.getOrCreateInstance(el);
        this._bsInstance.show();
        this._setImage("https://placehold.co/260x370")
        this._initFavoriteBtn(anime);
        this._initShareBtn(uid);

        // Imagen inicial rápida
        try {
            const res = await fetch(`${CONFIG.API.IMAGE}?uid=${anime.unit_id}`);

            if (res.ok) {
                const blob = await res.blob();
                const imageUrl = URL.createObjectURL(blob);
                this._setImage(imageUrl);
            }
        } catch (e) {
            console.warn('[Modal.open image]', e);
        }

        await this._loadInfo(anime);
    },

    async _loadInfo(anime) {
        const titleEl = Utils.el('modalTitle');
        const descEl = Utils.el('modalDescription');
        const containerEl = Utils.el('episodes-list');

        if (titleEl) titleEl.textContent = anime.title;

        let dots = 0;
        const interval = setInterval(() => {
            if (descEl) {
                descEl.textContent = `Cargando${'.'.repeat((dots++ % 5) + 1)}`;
            }
        }, 400);

        try {
            const res = await fetch(
                `${CONFIG.API.INFO}?uid=${encodeURIComponent(anime.unit_id)}`
            );

            const data = await res.json();
            clearInterval(interval);

            if (!res.ok || data.error) {
                throw new Error(data.error || 'Error en /api/info');
            }

            if (titleEl) titleEl.textContent = data.title;

            this._initFavoriteBtn({ title: data.title, unit_id: data.uid || data.unit_id });

            if (descEl) {
                descEl.textContent = data.desc || 'Sin descripción disponible.';
            }

            // STATUS
            const statusEl = Utils.el('modalStatus');
            if (statusEl) {
                const isOngoing = /emisi[oó]n|ongoing/i.test(data.status ?? '');
                const isFinished = /finaliz|finished|completed/i.test(data.status ?? '');

                statusEl.textContent = data.status || 'Desconocido';
                statusEl.style.background =
                    isOngoing ? '#28a745' :
                        isFinished ? '#fb3447' :
                            '#343a40';
            }

            // TAGS
            const tagsEl = Utils.el('modalTags');
            if (tagsEl && data.tags?.length) {
                tagsEl.innerHTML = data.tags
                    .map(t => `<span class="badge bg-secondary me-1">${t}</span>`)
                    .join('');
            }

            this._renderEpisodes(data, containerEl);

            await this._loadRatingAndImage(data, anime.image);

        } catch (err) {
            clearInterval(interval);
            console.error('[Modal._loadInfo]', err);
            if (descEl) descEl.textContent = 'Error al cargar la información.';
        }
    },

    _renderEpisodes(data, container) {
        if (!container) return;
        container.innerHTML = '';

        const isOngoing = /emisi[oó]n|ongoing/i.test(data.status ?? '');
        const isFinished = /finaliz|finished|completed/i.test(data.status ?? '');

        const badgeColor = isOngoing
            ? '#28a745'
            : isFinished
                ? '#fb3447'
                : '#343a40';

        const badgeText = isOngoing
            ? `Próxima emisión: ${data.isNewEP ?? 'Desconocida'}`
            : (data.status ?? 'Desconocido');

        const statusDiv = document.createElement('div');
        statusDiv.className = 'episode-card';
        statusDiv.innerHTML = `
      <div style="display:flex;align-items:center;width:100%;gap:10px;">
        <button type="button" class="episode-status" style="
          flex:1;
          background-color:${badgeColor} !important;
          cursor:default;
          font-weight:600;
          color:#fff;
        ">${badgeText}</button>
      </div>
    `;

        container.appendChild(statusDiv);

        if (!data.episodes?.length) return;

        const list = data.episodes.length < 50
            ? [...data.episodes].reverse()
            : data.episodes;

        list.forEach(ep => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'episode-card';

            btn.innerHTML = `
        <div class="ep-thumb">
          <img
            src="https://placehold.co/240x135"
            data-uid="${data.uid}"
            data-ep="${ep.num}"
            alt="Ep. ${ep.num}"
            loading="lazy"
          />
          <span class="ep-number">Ep. ${ep.num}</span>
        </div>
      `;

            const img = btn.querySelector('img');

            const observer = new IntersectionObserver(([entry]) => {
                if (!entry.isIntersecting) return;
                observer.disconnect();

                const uid = data.unit_id ?? data.uid;
                this._loadEpThumb(img, uid, ep.num);
            }, { rootMargin: '100px' });

            observer.observe(img);

            btn.addEventListener('click', () => {
                window.location.href = ep.url;
            });

            container.appendChild(btn);
        });
    },

    _thumbnailsCache: {},

    async _loadEpThumb(imgEl, uid, epNum) {
        try {
            if (!this._thumbnailsCache[uid]) {
                const thumbRes = await fetch(`${CONFIG.API.THUMBNAIL}?uid=${uid}`);
                if (!thumbRes.ok) throw new Error('Failed to fetch thumbnails json');
                const data = await thumbRes.json();
                this._thumbnailsCache[uid] = data.imgs || [];
            }
            
            const proxyUrl = this._thumbnailsCache[uid][epNum - 1];
            if (!proxyUrl) throw new Error('Thumbnail not found');

            const res = await fetch(proxyUrl);

            if (!res.ok) return;

            const blob = await res.blob();
            imgEl.src = URL.createObjectURL(blob);
        } catch {
            // fallback silencioso
        }
    },

    close() {
        const el = Utils.el('animeModal');
        if (!el) return;

        (bootstrap.Modal.getInstance(el) ?? new bootstrap.Modal(el)).hide();
    },

    _setImage(url) {
        const img = Utils.el('modalImage');
        const wrapper = Utils.el('modalImgWrapper');

        if (!img) return;

        img.src = url;

        img.onload = () => {
            wrapper?.style.setProperty('--blur-bg', `url(${url})`);
        };
    },

    async _initFavoriteBtn(anime) {
        const btn = Utils.el('favoriteBtn');
        if (!btn) return;

        const isFav = await Favorites.exists(anime.title);

        btn.innerHTML = `
      <i class="fa fa-heart me-1"></i>
      ${isFav ? 'Quitar de Favoritos' : 'Agregar a Favoritos'}
    `;

        btn.classList.toggle('btn-dark', isFav);
        btn.classList.toggle('btn-outline-light', !isFav);

        btn.onclick = (e) => {
            e.stopPropagation();
            Favorites.toggle(anime, btn);
        };
    },

    _initShareBtn(uid) {
        const btn = Utils.el('shareBtn');
        if (!btn) return;

        btn.onclick = async (e) => {
            e.stopPropagation();

            const url = `/app/share?uid=${encodeURIComponent(uid)}`;
            const anime = Utils.findByUId(uid);

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: anime?.title,
                        url
                    });
                } catch { }
            } else {
                Share.open('', url);
            }
        };
    },

    async _loadRatingAndImage(anime, fallbackUrl) {
        try {
            const res = await fetch(
                `https://kitsu.app/api/edge/anime?filter%5Btext%5D=${anime.slug}`
            );

            const json = await res.json();
            if (!json.data?.length) return;

            const attrs = json.data[0].attributes;

            let rating = attrs.averageRating;

            if (rating == null) {
                const freqs = attrs.ratingFrequencies ?? {};
                let total = 0, count = 0;

                for (const [r, f] of Object.entries(freqs)) {
                    total += parseInt(r, 10) * parseInt(f, 10);
                    count += parseInt(f, 10);
                }

                if (count > 0) {
                    const max = Math.max(...Object.keys(freqs).map(Number));
                    rating = Math.round(((total / count) / max) * 100) / 10;
                }
            }

            this._renderStars(rating);

            const isBlack = await this._isImageBlack(fallbackUrl);

            if (isBlack && attrs.posterImage) {
                const betterUrl =
                    attrs.posterImage.original ||
                    attrs.posterImage.large ||
                    fallbackUrl;

                this._setImage(betterUrl);
            }

        } catch (err) {
            console.warn('[Modal._loadRatingAndImage]', err);
        }
    },

    _renderStars(rating) {
        const scoreEl = Utils.el('ratingScore');
        const starsEl = Utils.el('ratingStars');

        if (!scoreEl || !starsEl) return;

        const score = parseFloat(rating);

        scoreEl.textContent = isNaN(score)
            ? '—'
            : (score / 10).toFixed(1);

        if (isNaN(score)) {
            starsEl.innerHTML = '';
            return;
        }

        const value = Math.round((score / 100) * 10 * 2) / 2;
        const full = Math.floor(value);
        const half = value % 1 !== 0;
        const empty = 10 - full - (half ? 1 : 0);

        starsEl.innerHTML =
            '<i class="fa fa-star"></i>'.repeat(full) +
            (half ? '<i class="fa fa-star-half-alt"></i>' : '') +
            '<i class="fa fa-star inactive"></i>'.repeat(empty);
    },

    _isImageBlack(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const scale = Math.min(100 / img.width, 100 / img.height);

                const canvas = Object.assign(document.createElement('canvas'), {
                    width: img.width * scale,
                    height: img.height * scale,
                });

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                let data;
                try {
                    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                } catch {
                    return resolve(false);
                }

                let dark = 0, total = 0;

                for (let i = 0; i < data.length; i += 4) {
                    if (data[i + 3] < 10) continue;

                    const lum =
                        0.2126 * data[i] +
                        0.7152 * data[i + 1] +
                        0.0722 * data[i + 2];

                    if (lum < 45) dark++;
                    total++;
                }

                resolve(dark / total > 0.9);
            };

            img.onerror = () => resolve(false);
            img.src = url;
        });
    },
};
/* ============================================================
 * SHARE MODAL
 * ============================================================ */
const Share = {
    PLATFORMS: {
        whatsapp: (t, u) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`,
        facebook: (_, u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
        telegram: (t, u) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
        correo: (t, u) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(u)}`,
        pinterest: (t, u) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}&description=${encodeURIComponent(t)}`,
        x: (t, u) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${t} ${u}`)}`,
        reddit: (t, u) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`,
    },

    open(text = '', url = window.location.href) {
        const modal = Utils.el('modalShare');
        const input = Utils.el('shareLink');
        const copyBtn = Utils.el('copyBtn');
        const closeBtn = Utils.el('closeModal');
        const options = Utils.el('shareOptions');
        const scrollBtn = Utils.el('scrollRight');
        if (!modal || !input) return;

        input.value = url;
        modal.classList.add('active');

        const close = () => modal.classList.remove('active');
        closeBtn.onclick = close;
        modal.onclick = (e) => { if (e.target === modal) close(); };

        copyBtn.onclick = async () => {
            try {
                await navigator.clipboard.writeText(url);
                copyBtn.textContent = '¡Copiado!';
                setTimeout(() => (copyBtn.textContent = 'Copiar'), 2000);
            } catch {
                input.select();
                document.execCommand('copy');
            }
        };

        const updateScrollBtn = () => {
            scrollBtn?.classList.toggle(
                'hidden',
                options.scrollLeft >= options.scrollWidth - options.clientWidth - 10,
            );
        };
        scrollBtn.onclick = () => {
            options.scrollBy({ left: 150, behavior: 'smooth' });
            setTimeout(updateScrollBtn, 400);
        };
        options.addEventListener('scroll', updateScrollBtn);
        updateScrollBtn();

        Utils.qsa('.share-option', modal).forEach((btn) => {
            btn.onclick = (e) => {
                e.preventDefault();
                const platform = btn.querySelector('div')?.classList[1];
                const builder = this.PLATFORMS[platform];
                if (builder) window.open(builder(text, url), '_blank');
            };
        });
    },
};