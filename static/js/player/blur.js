'use strict';

const Blur = {
  _canvas: null,
  _ctx: null,
  _video: null,
  _wrapper: null,

  init(video, wrapper) {
    if (!State.blurActive) return;

    this._video = video;
    this._wrapper = wrapper;

    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d', { willReadFrequently: false });

    // ▶️ play
    video.addEventListener('play', () => {
      if (State.blurEnabled) {
        this.start();
      }
    });

    // ⏸ pause
    video.addEventListener('pause', () => this.hibernate());

    // 🔄 cambio de pestaña
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stop();
      } else if (!video.paused && State.blurEnabled) {
        this.start();
      }
    });
  },

  enable() {
    State.blurEnabled = true;
    localStorage.setItem('blurRunning', 'true');
    if (this._video && !this._video.paused) {
      this.start();
    }
  },

  disable() {
    State.blurEnabled = false;
    localStorage.setItem('blurRunning', 'false');
    this.stop();
  },

  // ▶️ INICIAR
  start() {
    if (!this._video || State.blurRunning) return;

    State.blurLooping = true;
    State.blurRunning = true;

    cancelAnimationFrame(State.animFrame);
    this._loop();
  },

  // ⏹ DETENER
  stop() {
    State.blurLooping = false;
    State.blurRunning = false;

    cancelAnimationFrame(State.animFrame);

    // limpiar fondo
    if (this._wrapper) {
      this._wrapper.style.removeProperty('--blur-bg');
    }

    // liberar memoria
    if (State.blurBuffers) {
      State.blurBuffers.forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
      State.blurBuffers = [null, null];
    }

    State.blurFrame = false;
  },

  hibernate() {
    State.blurLooping = false;
    State.blurRunning = false;

    cancelAnimationFrame(State.animFrame);

    State.blurFrame = false;
  },

  _loop() {
    if (!State.blurLooping) {
      State.blurRunning = false;
      return;
    }

    this._generate();
    State.animFrame = requestAnimationFrame(() => this._loop());
  },

  async _generate() {
    const now = performance.now();
    const interval = 1000 / CONFIG.BLUR.fps;

    if (
      State.blurFrame ||
      this._video.paused ||
      this._video.readyState < 2 ||
      document.hidden ||
      now - State.blurLastTs < interval
    ) return;

    State.blurFrame = true;
    State.blurLastTs = now;

    try {
      const scale = CONFIG.BLUR.scale;
      const w = (this._video.videoWidth * scale) | 0 || 1;
      const h = (this._video.videoHeight * scale) | 0 || 1;

      if (this._canvas.width !== w) this._canvas.width = w;
      if (this._canvas.height !== h) this._canvas.height = h;

      try {
        if (window.createImageBitmap) {
          const bmp = await createImageBitmap(this._video, {
            resizeWidth: w,
            resizeHeight: h
          });
          this._ctx.clearRect(0, 0, w, h);
          this._ctx.drawImage(bmp, 0, 0);
          bmp.close();
        } else {
          this._ctx.drawImage(this._video, 0, 0, w, h);
        }
      } catch {
        this._ctx.drawImage(this._video, 0, 0, w, h);
      }

      const blob = this._canvas.convertToBlob
        ? await this._canvas.convertToBlob({ type: 'image/jpeg', quality: 0.6 })
        : await new Promise(r => this._canvas.toBlob(r, 'image/jpeg', 0.6));

      if (!blob) {
        State.blurFrame = false;
        return;
      }

      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.decoding = 'async';

      img.onload = () => {
        State.blurBufIdx = State.blurBufIdx === 0 ? 1 : 0;

        this._wrapper.style.setProperty('--blur-bg', `url("${url}")`);

        if (State.blurBuffers[State.blurBufIdx]) {
          URL.revokeObjectURL(State.blurBuffers[State.blurBufIdx]);
        }

        State.blurBuffers[State.blurBufIdx] = url;
        State.blurFrame = false;
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        State.blurFrame = false;
      };

      img.src = url;

    } catch (err) {
      if (!(err instanceof DOMException)) {
        console.error('[Blur]', err);
      }
      State.blurFrame = false;
    }
  }
};
