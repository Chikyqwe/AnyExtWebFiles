'use strict';

const ServerUI = {
  render(servers, onClick) {
    let container = Utils.el('serverButtons');
    if (!container) {
      const player = Utils.el('player');
      container = document.createElement('div');
      container.id = 'serverButtons';
      container.className = 'server-buttons';
      player.parentElement.insertBefore(container, player.nextSibling);
    }
    container.innerHTML = '';

    servers.forEach((server, i) => {
      const btn = document.createElement('button');
      btn.textContent = server.servidor.toUpperCase();
      btn.dataset.servidor = server.servidor;
      btn.className = 'btn server-btn';
      btn.addEventListener('click', () => onClick(server, i));
      container.appendChild(btn);
    });
  },

  highlight(index) {
    Utils.el('serverButtons')?.querySelectorAll('button').forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
  },

  setLoaderText(text) {
    const el = Utils.el('loaderText');
    if (el) el.innerText = text;
  },
};
