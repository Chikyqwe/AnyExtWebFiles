'use strict';

const Stream = {
  _cleanHls() {
    if (State.hls) {
      try {
        State.hls.destroy();
      } catch (e) {
        console.error('[HLS DESTROY ERROR]', e);
      }

      State.hls = null;
    }

    if (State.blobUrl) {
      URL.revokeObjectURL(State.blobUrl);
      State.blobUrl = null;
    }
  },

  _cleanProgress() {
    if (State.progressTimer !== null) {
      clearInterval(State.progressTimer);
      State.progressTimer = null;
    }
  },

  async loadDirect(url, m3u8Content = null) {
    console.log('[STREAM URL]', url);

    const video = Utils.el('player');
    const loader = Utils.el('loader');

    const slug = `${State.config.uid}-${State.config.ep}`;

    this._cleanProgress();
    this._cleanHls();

    video.style.display = 'block';
    video.style.opacity = 0;

    video.pause();
    video.removeAttribute('src');
    video.load();

    let nextTriggered = false;

    const isHls =
      typeof m3u8Content === 'string' &&
      m3u8Content.trim().startsWith('#EXTM3U');

    try {
      // =========================
      // HLS STREAM
      // =========================
      if (Hls.isSupported() && isHls) {
        console.log('[PLAYER] Loading HLS');

        State.hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90
        });

        State.blobUrl = URL.createObjectURL(
          new Blob([m3u8Content], {
            type: 'application/vnd.apple.mpegurl'
          })
        );

        console.log('[BLOB URL]', State.blobUrl);

        State.hls.attachMedia(video);

        State.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[HLS] Media attached');
          State.hls.loadSource(State.blobUrl);
        });

        State.hls.on(Hls.Events.MANIFEST_PARSED, async (_, data) => {
          console.log('[HLS] Manifest parsed', data);

          loader.style.display = 'none';
          video.style.opacity = 1;

          try {
            await video.play();
            await WakeLock.request();
          } catch (e) {
            console.warn('[AUTOPLAY BLOCKED]', e);
          }
        });

        State.hls.on(Hls.Events.FRAG_LOADING, (_, data) => {
          console.log('[FRAG LOADING]', data.frag.url);
        });

        State.hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
          console.log('[FRAG LOADED]', data.frag.url);
        });

        State.hls.on(Hls.Events.ERROR, (_, data) => {
          console.error('[HLS ERROR]', data);

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('[HLS] Network error, recovering...');
                State.hls.startLoad();
                break;

              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('[HLS] Media error, recovering...');
                State.hls.recoverMediaError();
                break;

              default:
                console.error('[HLS] Fatal error, destroying...');
                this._cleanHls();
                break;
            }
          }
        });
      }

      // =========================
      // NORMAL VIDEO
      // =========================
      else {
        console.log('[PLAYER] Loading normal video');

        video.src = url;
        video.load();

        video.addEventListener(
          'loadedmetadata',
          async () => {
            console.log('[VIDEO] Metadata loaded');

            loader.style.display = 'none';
            video.style.opacity = 1;

            try {
              await video.play();
              await WakeLock.request();
            } catch (e) {
              console.warn('[AUTOPLAY BLOCKED]', e);
            }
          },
          { once: true }
        );
      }

      // =========================
      // VIDEO ERRORS
      // =========================
      video.addEventListener('error', () => {
        console.error('[VIDEO ERROR]', video.error);

        if (video.error) {
          console.error('code:', video.error.code);
          console.error('message:', video.error.message);
        }
      });

      // =========================
      // RESTORE PROGRESS
      // =========================
      const saved = await DB.loadProgress(slug);

      if (saved > 0) {
        video.currentTime = saved;
        console.log(`[PROGRESS] Restored at ${saved}s`);
      }

      // =========================
      // AUTO SAVE
      // =========================
      State.progressTimer = setInterval(() => {
        if (!isNaN(video.currentTime) && video.currentTime > 0) {
          DB.saveProgress(slug, Math.floor(video.currentTime));
        }
      }, 10000);

      video.addEventListener('pause', () => {
        DB.saveProgress(slug, video.currentTime);
      });

      window.addEventListener('beforeunload', () => {
        DB.saveProgress(slug, video.currentTime);
      });

      // =========================
      // AUTO NEXT EPISODE
      // =========================
      video.addEventListener('timeupdate', async () => {
        if (!video.duration) return;

        if (State.config.ep >= State.config.totalEp) return;

        if (
          video.duration - video.currentTime <= 5 &&
          !nextTriggered
        ) {
          nextTriggered = true;

          console.log('[PLAYER] Next episode');

          await DB.saveProgress(slug, 0);

          this._cleanProgress();

          Player.loadEpisode(State.config.ep + 1);
        }
      });
    } catch (err) {
      console.error('[PLAYER FATAL]', err);

      loader.style.display = 'none';
    }
  }
};