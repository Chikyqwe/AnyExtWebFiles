'use strict';

const Fullscreen = {
  _wrapper: null,
  _wrapperParent: null,
  _wrapperNextSibling: null,
  _isNativeFullscreen: false,
  _fullscreenChangeHandler: null,

  async enter() {
    if (State.fullscreen) return;

    // Verificar si estamos en un contexto de usuario
    if (!this._isUserGesture()) {
      console.warn('[Fullscreen] Not in user gesture context');
      return;
    }

    State.fullscreen = true;
    Blur.stop();

    // Guardar posición original del wrapper
    this._wrapper = Utils.qs('.video-wrapper');
    this._wrapperParent = this._wrapper.parentElement;
    this._wrapperNextSibling = this._wrapper.nextSibling;

    // Mover el wrapper directamente al body y aplicar fullscreen
    document.body.appendChild(this._wrapper);
    this._wrapper.classList.add('fullscreen-mode');

    Utils.qs('header').style.display = 'none';
    document.body.style.overflow = 'hidden';

    // Intentar fullscreen nativo primero
    try {
      const element = document.documentElement;

      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      } else {
        // Fallback: usar fullscreen personalizado
        this._isNativeFullscreen = false;
      }

      this._isNativeFullscreen = true;

      // Intentar bloquear orientación
      try {
        if (screen.orientation?.lock) {
          await screen.orientation.lock('landscape');
        }
      } catch (err) {
        console.warn('[Fullscreen] orientation lock error:', err);
      }

    } catch (err) {
      console.warn('[Fullscreen] Native fullscreen not supported, using custom:', err);
      this._isNativeFullscreen = false;
      // El fullscreen personalizado ya está aplicado (wrapper movido al body)
    }

    Overlay.setTitle();

    // Agregar listener para cambios de fullscreen
    this._setupFullscreenChangeListener();
  },

  async exit() {
    if (!State.fullscreen) return;

    State.fullscreen = false;

    if (State.blurEnabled && !Utils.el('player')?.paused) {
      Blur.start();
    }

    if (this._wrapper) {
      this._wrapper.classList.remove('fullscreen-mode');
      // Restaurar posición original
      if (this._wrapperNextSibling) {
        this._wrapperParent?.insertBefore(this._wrapper, this._wrapperNextSibling);
      } else {
        this._wrapperParent?.appendChild(this._wrapper);
      }
    }

    Utils.qs('header').style.display = '';
    document.body.style.overflow = '';

    // Salir del fullscreen nativo solo si está activo
    if (this._isNativeFullscreen) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      } catch (err) {
        console.warn('[Fullscreen] exit error:', err);
      }
    }

    try {
      if (screen.orientation?.unlock) {
        screen.orientation.unlock();
      }
    } catch (err) {
      console.warn('[Fullscreen] orientation unlock error:', err);
    }

    Overlay.setTitle();

    // Remover listeners
    this._removeFullscreenChangeListener();
  },

  _setupFullscreenChangeListener() {
    this._removeFullscreenChangeListener(); // Limpiar listeners anteriores

    this._fullscreenChangeHandler = this._handleFullscreenChange.bind(this);

    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ];

    events.forEach(event => {
      document.addEventListener(event, this._fullscreenChangeHandler);
    });
  },

  _removeFullscreenChangeListener() {
    if (this._fullscreenChangeHandler) {
      const events = [
        'fullscreenchange',
        'webkitfullscreenchange',
        'mozfullscreenchange',
        'MSFullscreenChange'
      ];

      events.forEach(event => {
        document.removeEventListener(event, this._fullscreenChangeHandler);
      });

      this._fullscreenChangeHandler = null;
    }
  },

  _handleFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement);

    if (!isFullscreen && State.fullscreen) {
      // El usuario salió del fullscreen con ESC
      this.exit();
    }
  },

  _isUserGesture() {
    // Verificar si estamos en un evento de usuario
    try {
      // @ts-ignore
      return window.event && window.event.isTrusted;
    } catch (e) {
      // Si no podemos verificar, asumimos que es seguro intentarlo
      return true;
    }
  },

  toggle() {
    if (State.fullscreen) {
      this.exit();
    } else {
      this.enter();
    }
  },

  isSupported() {
    return !!(document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen ||
      document.documentElement.msRequestFullscreen);
  },

  // Método para manejar el autoplay bloqueado
  handleAutoplayBlocked() {
    // Si el autoplay está bloqueado, intentar reproducir con un gesto del usuario
    const player = Utils.el('player');
    if (player && player.paused) {
      // Mostrar un botón de play o overlay para que el usuario interactúe
      Overlay.setTitle();
    }
  }
};

// Añadir esto al inicio para manejar el problema de autoplay
document.addEventListener('DOMContentLoaded', () => {
  // Si el autoplay falla, mostrar un overlay o mensaje
  const player = Utils.el('player');
  if (player) {
    player.addEventListener('error', (e) => {
      if (e.target.error?.code === MediaError.MEDIA_ERR_ABORTED) {
        console.log('[Player] Autoplay blocked, waiting for user interaction');
        Fullscreen.handleAutoplayBlocked();
      }
    });
  }
});