'use strict';

const PlyrSetup = {
  _player: null,
  _overlay: null,
  _originalParent: null,
  _plyrContainer: null,
  _animationId: null,
  _isDestroyed: false,

  init() {
    const video = Utils.el('player');
    if (!video) {
      console.error('[ERROR] Elemento de video no encontrado');
      return null;
    }

    this._overlay = Utils.el('infoOverlay');
    this._originalParent = this._overlay?.parentElement;
    this._isDestroyed = false;

    try {
      this._player = new Plyr('#player', {
        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'fullscreen', 'settings'],
      });

      this._player.on('ready', () => this._onReady());
      this._player.on('enterfullscreen', () => Fullscreen.enter());
      this._player.on('exitfullscreen', () => Fullscreen.exit());
      this._player.on('controlsshown', () => {
        Overlay.setTitle();
        Overlay.show();
      });
      this._player.on('controlshidden', () => Overlay.hide());

      return this._player;
    } catch (error) {
      console.error('[ERROR] Error inicializando Plyr:', error);
      return null;
    }
  },

  _onReady() {
    if (this._isDestroyed || !this._player) return;

    this._plyrContainer = this._player.elements.container;
    const controls = Utils.qs('.plyr__controls');

    if (!controls) {
      console.warn('[ERROR] No se encontraron los controles de Plyr');
      return;
    }

    this._addSkipButton(controls);
    this._setupCountdownTimer();
    this._setupSeekEvents();
  },

  _addSkipButton(controls) {
    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'plyr__control plyr__button plyr__button--skip120';
    skipBtn.setAttribute('aria-label', 'Avanzar 1 minuto y 20 segundos');
    skipBtn.setAttribute('title', 'Avanzar 1:20');
    skipBtn.innerHTML = '<i class="bi bi-clock-history"></i> 1:20';

    // Insertar después del botón de play
    const playButton = controls.querySelector('.plyr__controls__item[data-plyr="play"]');
    if (playButton && playButton.nextSibling) {
      controls.insertBefore(skipBtn, playButton.nextSibling);
    } else {
      controls.insertBefore(skipBtn, controls.children[1] || null);
    }

    skipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (this._player && this._player.duration) {
        const newTime = Math.min(this._player.currentTime + 80, this._player.duration);
        this._player.currentTime = newTime;
      }
    });
  },

  _setupCountdownTimer() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }

    const tick = () => {
      if (this._isDestroyed || !this._player) {
        return;
      }

      const el = Utils.qs('.plyr__time--current');
      if (el && this._player.duration && !isNaN(this._player.duration) && this._player.duration > 0) {
        const remaining = this._player.duration - this._player.currentTime;
        if (remaining > 0) {
          const min = Math.floor(remaining / 60).toString().padStart(2, '0');
          const sec = Math.floor(remaining % 60).toString().padStart(2, '0');
          el.textContent = `-${min}:${sec}`;
        } else {
          el.textContent = '0:00';
        }
      }

      this._animationId = requestAnimationFrame(tick);
    };

    tick();
  },

  _setupSeekEvents() {
    const wrapper = Utils.qs('.video-wrapper');
    if (!wrapper) {
      console.warn('[ERROR] No se encontró .video-wrapper para los eventos de seek');
      return;
    }

    let lastTap = 0;
    let lastClick = 0;

    // Doble click para escritorio
    wrapper.addEventListener('dblclick', (e) => {
      if (this._isDestroyed || !this._player) return;
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const seekAmount = x < rect.width / 2 ? -10 : 10;
      this._player.currentTime = Math.max(0, Math.min(
        this._player.currentTime + seekAmount,
        this._player.duration || 0
      ));
    });

    // Doble toque para móvil
    wrapper.addEventListener('touchend', (e) => {
      if (this._isDestroyed || !this._player) return;

      const now = Date.now();
      const timeSinceLastTap = now - lastTap;

      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        const touch = e.changedTouches[0];
        if (touch) {
          const rect = wrapper.getBoundingClientRect();
          const x = touch.clientX - rect.left;
          const seekAmount = x < rect.width / 2 ? -10 : 10;
          this._player.currentTime = Math.max(0, Math.min(
            this._player.currentTime + seekAmount,
            this._player.duration || 0
          ));
          e.preventDefault();
        }
      }
      lastTap = now;
    });

    // Evitar conflictos con clicks normales
    wrapper.addEventListener('click', (e) => {
      if (this._isDestroyed) return;
      const now = Date.now();
      if (now - lastClick < 300) {
        e.preventDefault();
      }
      lastClick = now;
    });
  },

  // Método para limpiar recursos
  destroy() {
    this._isDestroyed = true;

    // Cancelar animation frame
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }

    // Destruir el reproductor
    if (this._player) {
      try {
        this._player.destroy();
      } catch (error) {
        console.warn('[PLAYER] Error al destruir el reproductor:', error);
      }
      this._player = null;
    }

    // Limpiar referencias
    this._plyrContainer = null;
    this._overlay = null;
    this._originalParent = null;

    console.log('[PLRY] PlyrSetup destruido correctamente');
  },

  // Método para pausar el reproductor
  pause() {
    if (this._player && !this._isDestroyed) {
      this._player.pause();
    }
  },

  // Método para reproducir
  play() {
    if (this._player && !this._isDestroyed) {
      this._player.play();
    }
  },

  // Método para obtener el tiempo actual
  getCurrentTime() {
    return this._player ? this._player.currentTime : 0;
  },

  // Método para establecer el tiempo
  setCurrentTime(time) {
    if (this._player && !this._isDestroyed && this._player.duration) {
      this._player.currentTime = Math.max(0, Math.min(time, this._player.duration));
    }
  }
};
