(() => {
'use strict';

// Pause decorative media outside the viewport and whenever the page is hidden.
function createMediaController(getSettings) {
  const elements = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      const media = elements.get(entry.target);
      if (media) media.visible = entry.isIntersecting;
    }
    sync();
  }, { rootMargin: '80px' }) : null;

  function sync() {
    const animate = !document.hidden && !getSettings().reduceMotion && !reduced.matches && !connection?.saveData;
    for (const [element, media] of elements) {
      const active = animate && media.visible;
      if (active === media.active) continue;
      media.active = active;
      if (element.tagName === 'VIDEO') {
        if (active) element.play()?.catch(() => {});
        else {
          element.pause();
          try { element.currentTime = 0; } catch {}
        }
      } else {
        const animated = element.dataset.animatedUrl;
        const still = element.dataset.staticUrl;
        const source = active ? animated : still && still !== animated ? still : '';
        element.style.visibility = source ? '' : 'hidden';
        if (element.tagName === 'IMG') {
          if (!source) element.removeAttribute('src');
          else if (element.getAttribute('src') !== source) element.src = source;
        } else element.style.backgroundImage = source ? `url('${source}')` : 'none';
      }
    }
  }

  function bind(root) {
    observer?.disconnect();
    for (const element of elements.keys()) if (element.tagName === 'VIDEO') element.pause();
    elements.clear();
    for (const element of root.querySelectorAll('[data-animated-url], video[data-motion-video]')) {
      elements.set(element, { visible: !observer, active: null });
      observer?.observe(element);
    }
    sync();
  }

  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => {
    for (const element of elements.keys()) if (element.tagName === 'VIDEO') element.pause();
  });
  window.addEventListener('pageshow', () => {
    for (const media of elements.values()) media.active = null;
    sync();
  });
  if (reduced.addEventListener) reduced.addEventListener('change', sync);
  else reduced.addListener?.(sync);
  connection?.addEventListener('change', sync);
  return { bind, sync };
}

window.DiscordIDHub = window.DiscordIDHub || {};
window.DiscordIDHub.createMediaController = createMediaController;
})();
