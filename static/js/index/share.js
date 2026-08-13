'use strict';

const Share = {
  PLATFORMS: {
    whatsapp: (text, url) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    facebook: (_, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    telegram: (text, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    correo: (text, url) => `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`,
    pinterest: (text, url) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
    x: (text, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${text} ${url}`)}`,
    reddit: (text, url) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
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

    // Scroll button
    const updateScrollBtn = () => {
      const maxScroll = options.scrollWidth - options.clientWidth;
      scrollBtn?.classList.toggle('hidden', options.scrollLeft >= maxScroll - 10);
    };
    scrollBtn.onclick = () => { options.scrollBy({ left: 150, behavior: 'smooth' }); setTimeout(updateScrollBtn, 400); };
    options.addEventListener('scroll', updateScrollBtn);
    updateScrollBtn();

    // Platform buttons
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

/* ============================================================
 * SETTINGS / OVERLAYS
 * ============================================================ */
