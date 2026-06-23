'use strict';

/**
 * Toast — lightweight reusable notification system.
 *
 * Usage:
 *   Toast.show('Guardado correctamente');                       // default (info)
 *   Toast.show('Error al cargar', 'error');                     // red
 *   Toast.show('Operación exitosa', 'success');                 // green
 *   Toast.show('Cuidado', 'warning');                           // amber
 *   Toast.show('Mensaje', 'info', 5000);                       // custom duration
 */
const Toast = (() => {
  const ICONS = {
    info: 'fa fa-circle-info',
    success: 'fa fa-circle-check',
    warning: 'fa fa-triangle-exclamation',
    error: 'fa fa-circle-xmark',
  };

  const DURATION_DEFAULT = 3000;
  let toastMap = new Map();
  let _container = null;

  /** Lazily create the fixed container once */
  function _getContainer() {
    if (_container && document.body.contains(_container)) return _container;

    _container = document.createElement('div');
    _container.id = 'toastContainer';
    _container.className = 'toast-container';
    document.body.appendChild(_container);
    return _container;
  }

  /**
   * Show a toast notification.
   * @param {string}  message   — Text to display
   * @param {'info'|'success'|'warning'|'error'} [type='info']
   * @param {number}  [duration=3000] — Auto-dismiss ms (0 = manual close only)
   */
  function show(message, type = 'info', duration = DURATION_DEFAULT) {
    const container = _getContainer();
    const uid = Math.random().toString(36).substr(2, 9);
    const toast = document.createElement('div');
    toast.id = uid;
    toast.className = `toast-item toast-${type}`;
    toastMap.set(uid, toast);

    toast.innerHTML = `
      <i class="${ICONS[type] || ICONS.info} toast-icon"></i>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" aria-label="Cerrar">
        <i class="fa fa-xmark"></i>
      </button>
    `;

    // Close handler
    toast.querySelector('.toast-close').addEventListener('click', () => _dismiss(toast));

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => toast.classList.add('toast-show'));

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => _dismiss(toast), duration);
    }
    return uid;
  }

  function del(uid) {
    const toast = toastMap.get(uid);
    _dismiss(toast);
  }

  function _dismiss(toast) {
    if (toast.classList.contains('toast-hide')) return; // already dismissing
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    toastMap.delete(toast.id);
  }

  function getToastMap() {
    return toastMap;
  }

  return { show, del, getToastMap };
})();
