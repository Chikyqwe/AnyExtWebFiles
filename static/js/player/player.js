'use strict';

const Player = {
  init() {
    // Obtener la ruta actual
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(part => part !== '');

    let id = null;
    let ep = null;

    // Verificar que la ruta sea /player/UID/EP
    if (pathParts.length >= 3 && pathParts[0] === 'player') {
      id = pathParts[1];
      ep = parseInt(pathParts[2]);
    }

    // También soportar query params por compatibilidad (opcional)
    if (!id || isNaN(ep)) {
      const params = new URLSearchParams(window.location.search);
      id = params.get('uid') || id;
      ep = parseInt(params.get('ep')) || ep;
    }

    if (id && !isNaN(ep)) {
      this.loadEpisode(ep, id);
    } else {
      Utils.el('anime-title').innerText = 'Faltan parámetros';
      Utils.el('loader').style.display = 'none';
    }

    if (id && !isNaN(ep)) {
      localStorage.setItem('lasted', JSON.stringify({ uid: id, ep: ep }));
    }

    // Soporte navegación atrás/adelante
    window.addEventListener('popstate', () => {
      const path = window.location.pathname;
      const parts = path.split('/').filter(p => p !== '');

      let i = null;
      let e = null;

      if (parts.length >= 3 && parts[0] === 'player') {
        i = parts[1];
        e = parseInt(parts[2]);
      }

      // Soportar query params también
      if (!i || isNaN(e)) {
        const params = new URLSearchParams(window.location.search);
        i = params.get('id') || i;
        e = parseInt(params.get('ep')) || e;
      }

      if (i && !isNaN(e) && e !== State.config?.ep) {
        this.loadEpisode(e, i);
      }
    });
  },

  async loadEpisode(epNumber, idOverride = null) {
    const loader = Utils.el('loader');
    const video = Utils.el('player');

    loader.style.display = 'flex';
    video.style.opacity = 0;

    Utils.el('nav-buttons').innerHTML = '';
    Utils.el('episode-list').innerHTML = '';

    video.style.display = 'block';

    // Obtener ID de la ruta o del parámetro
    let id = idOverride;
    if (!id) {
      const path = window.location.pathname;
      const parts = path.split('/').filter(p => p !== '');
      if (parts.length >= 3 && parts[0] === 'player') {
        id = parts[1];
      }

      // Fallback a query params
      if (!id) {
        const params = new URLSearchParams(window.location.search);
        id = params.get('uid');
      }
    }

    if (!id || isNaN(epNumber)) {
      Utils.el('anime-title').innerText = 'Faltan parámetros';
      loader.style.display = 'none';
      return;
    }

    try {
      ServerUI.setLoaderText('Cargando información…');

      const res = await fetch(
        `${CONFIG.API_BASE}/info?uid=${id}`
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        Utils.el('anime-title').innerText = 'Error: ' + (data.error || 'API');
        loader.style.display = 'none';
        return;
      }

      // Estado global
      State.config = {
        uid: data.uid,
        totalEp: data.eps || data.episodes_count,
        ep: epNumber,
        title: data.title,
        type: data.category
      };

      // 🔥 Agrega al historial
      DB.addToHistory(data.uid);

      // 🔥 URL limpia con formato /player/UID/EP
      const newUrl = `/player/${encodeURIComponent(data.uid)}/${epNumber}`;
      try {
        window.history.pushState(State.config, data.anime_title, newUrl);
      } catch (e) { }

      document.title = data.title;

      EpisodeUI.render(data);
      await this._loadStream();
    } catch (err) {
      Utils.el('anime-title').innerText = 'Error de carga.';
      console.error(err);
      loader.style.display = 'none';
    }
  },

  async _loadStream(mirror = 'auto', server = 'auto') {
    const video = Utils.el('player');
    const loader = Utils.el('loader');

    Stream._cleanHls();
    Stream._cleanProgress();

    ServerUI.setLoaderText('Obteniendo servidores...');

    video.src = '';
    video.pause();

    try {
      const res = await fetch(`${CONFIG.API_BASE}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: State.config.uid,
          ep: State.config.ep,
          m: mirror,
          s: server,
          type: State.config.type
        })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.message || data.error || 'Error en play');
      }

      if (!data.servers?.length) {
        throw new Error('Sin servidores');
      }

      State.serverList = data.servers.map(s => ({ servidor: s }));

      ServerUI.render(State.serverList, (s) =>
        this._loadStream(mirror, s.servidor)
      );

      const activeIndex = State.serverList.findIndex(
        s => s.servidor === data.Sserver
      );

      ServerUI.highlight(activeIndex >= 0 ? activeIndex : 0);

      ServerUI.setLoaderText(`Cargando ${data.Sserver.toUpperCase()}...`);

      const mediaRes = await fetch(`${data.url}`);
      if (!mediaRes.ok) throw new Error('Error obteniendo media');

      if (data.mtype === 'hls') {
        const m3u8Content = await mediaRes.text();
        await Stream.loadDirect(`/${data.url}`, m3u8Content);
      } else {
        const json = await mediaRes.json();
        await Stream.loadDirect(json.url);
      }

      video.style.opacity = 1;
      loader.style.display = 'none';

    } catch (err) {
      // 🔁 Reintento automático de mirrors
      if (mirror === 'auto' || (typeof mirror === 'number' && mirror < 8)) {
        const nextMirror = mirror === 'auto' ? 2 : mirror + 1;
        ServerUI.setLoaderText(`Reintentando mirror ${nextMirror}...`);
        return this._loadStream(nextMirror);
      }

      console.error('[Player] Fatal:', err);
      ServerUI.setLoaderText('Error de carga. Intente de nuevo.');
      loader.style.display = 'none';
    }
  }
};

// Función helper para obtener parámetros de la ruta (opcional pero útil)
const RouteParams = {
  getFromPath() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(part => part !== '');

    if (parts.length >= 3 && parts[0] === 'player') {
      return {
        uid: parts[1],
        ep: parseInt(parts[2])
      };
    }
    return null;
  },

  // También soportar query params por compatibilidad
  getAll() {
    const pathParams = this.getFromPath();
    const queryParams = new URLSearchParams(window.location.search);

    return {
      uid: pathParams?.uid || queryParams.get('uid'),
      ep: pathParams?.ep || parseInt(queryParams.get('ep'))
    };
  }
};

/* ============================================================
 * BOOTSTRAP
 * ============================================================ */


document.addEventListener('DOMContentLoaded', () => {
  // Overlay clock
  Overlay.init();
  // Plyr
  PlyrSetup.init();

  // Blur background
  const wrapper = Utils.qs('.video-wrapper');
  const video = Utils.el('player');
  Blur.init(video, wrapper);
  if (State.blurEnabled && video && !video.paused) {
    Blur.start();
  }

  Search.init();
  MobileSearch.init();
  // Network guard → starts Player.init() once online
  Network.check();
});