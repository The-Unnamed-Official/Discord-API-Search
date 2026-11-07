// A single, event-driven clock for pointer lighting and avatar motion.
const RADIUS = 220;
const FRAME_INTERVAL = 1000 / 60;
const SELECTOR = [
  '.nav-btn', '.version-pill', '.mode-btn', '#searchId', '.primary-btn', '.ghost-btn',
  '.recent-item', '.result-panel', '.avatar-img', '.badge', '.metric', '.meta-cell:not(.meta-cell--split)',
  '.api-field', '.cosmetic-card', '.activity-card', '.feature-pill', '.feature-detail', '.action-btn', '.mini-btn'
].join(',');
const EXCLUDED = '[hidden], [inert], [aria-hidden="true"], #helpPanel, #settingsPanel, #captchaDialog';
const smooth = value => { const n = Math.max(0, Math.min(1, value)); return n * n * (3 - 2 * n); };

export function createEffects(getSettings) {
  const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motions = new Map();
  const gradients = new Map();
  let canvas, context, surfaces = [], avatar, anchor, anchorRect;
  let pointer = null, frame = 0, previousTime = 0, nextPaintTime = 0, reactionFrame = 0, phase = 0, intensity = 0;
  let collectDirty = true, geometryDirty = true, paused = false, scale = 0;
  let viewportWidth = innerWidth, viewportHeight = innerHeight;
  let trackingAvatar = false;

  const enabled = () => finePointer.matches && !forcedColors.matches && !reducedMotion.matches &&
    !getSettings().reduceMotion && getSettings().pointerEffects !== false && !document.hidden && !paused;

  function clearAvatar() {
    intensity = 0;
    if (!avatar || !trackingAvatar) return;
    avatar.style.removeProperty('transform');
    avatar.classList.remove('is-tracking');
    trackingAvatar = false;
  }

  function reset() {
    pointer = null;
    previousTime = nextPaintTime = 0;
    if (frame) cancelAnimationFrame(frame);
    if (reactionFrame) cancelAnimationFrame(reactionFrame);
    reactionFrame = 0;
    frame = 0;
    if (canvas) canvas.hidden = true;
    clearAvatar();
    avatar?.classList.remove('avatar-arrival', 'avatar-surprised');
  }

  function schedule() {
    if (!frame && pointer && enabled()) frame = requestAnimationFrame(tick);
  }

  function invalidate() {
    geometryDirty = true;
    schedule();
  }

  function refresh() {
    const next = document.querySelector('.avatar-wrap--interactive');
    if (next !== avatar) {
      if (reactionFrame) cancelAnimationFrame(reactionFrame);
      reactionFrame = 0;
      clearAvatar();
      avatar = next;
      anchor = avatar?.closest('.avatar-anchor');
      anchorRect = null;
      if (avatar && getSettings().pointerEffects !== false && !getSettings().reduceMotion && !reducedMotion.matches) avatar.classList.add('avatar-arrival');
    }
    collectDirty = geometryDirty = true;
    if (!enabled()) reset();
    else schedule();
  }

  function prepareCanvas() {
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'pointer-light';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.hidden = true;
      try { context = canvas.getContext('2d', { alpha: true }); } catch { return false; }
      if (!context) return false;
      document.body.append(canvas);
    }
    if (!context) return false;
    // Limit raster work on high-density displays; the canvas covers only the pointer's neighborhood.
    const nextScale = Math.min(devicePixelRatio || 1, 1.5);
    if (scale !== nextScale) {
      scale = nextScale;
      canvas.width = canvas.height = Math.ceil(RADIUS * 2 * scale);
      canvas.style.width = canvas.style.height = `${RADIUS * 2}px`;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      gradients.clear();
    }
    return true;
  }

  function collect() {
    surfaces = [];
    gradients.clear();
    for (const element of document.querySelectorAll(SELECTOR)) {
      if (element.closest(EXCLUDED) || !element.getClientRects().length) continue;
      const style = getComputedStyle(element);
      if (style.visibility !== 'visible' || Number(style.opacity) < .05) continue;
      if (![style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
        .some(width => parseFloat(width) > 0)) continue;
      const accent = style.getPropertyValue('--profile-accent-rgb').trim();
      surfaces.push({
        element, rect: null,
        radius: parseFloat(style.borderTopLeftRadius) || 0,
        round: style.borderTopLeftRadius.endsWith('%'),
        accent: /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(accent) ? accent : '112, 126, 255',
        avatar: element.classList.contains('avatar-img') && avatar?.contains(element)
      });
    }
    collectDirty = false;
  }

  function moving(element) {
    for (const target of motions.keys()) if (target === element || target.contains(element)) return true;
    return false;
  }

  function updateAvatar(delta) {
    if (!avatar || !anchorRect || !avatar.isConnected) return null;
    const reacting = avatar.classList.contains('avatar-arrival') || avatar.classList.contains('avatar-surprised');
    if (reacting || anchorRect.bottom < 0 || anchorRect.top > viewportHeight) {
      clearAvatar();
      return null;
    }
    const dx = anchorRect.left + anchorRect.width / 2 - pointer.x;
    const dy = anchorRect.top + anchorRect.height / 2 - pointer.y;
    const distance = Math.hypot(dx, dy);
    const target = smooth((210 - distance) / 160);
    intensity += (target - intensity) * (1 - Math.exp(-delta * (target > intensity ? 12 : 16)));
    if (intensity < .003 && target === 0) {
      clearAvatar();
      return null;
    }
    phase += delta * (8 + intensity * 27);
    const amplitude = intensity * (0.3 + intensity * 1.5);
    const retreat = intensity * 2.5 / Math.max(distance, 12);
    const x = dx * retreat + Math.sin(phase * 1.13) * amplitude;
    const y = dy * retreat + Math.cos(phase * 1.41) * amplitude * .7;
    const angle = Math.sin(phase * 1.73) * intensity * 1.3;
    // Predict the transformed circle before the write, keeping all geometry reads together.
    const radians = angle * Math.PI / 180;
    const pivotOffset = -.32 * anchorRect.height;
    const left = anchorRect.left - pivotOffset * Math.sin(radians) + x;
    const top = anchorRect.top + pivotOffset * (Math.cos(radians) - 1) + y;
    return {
      transform: `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${angle.toFixed(2)}deg)`,
      rect: { left, top, width: anchorRect.width, height: anchorRect.height,
        right: left + anchorRect.width, bottom: top + anchorRect.height }
    };
  }

  function outline(rect, radius, offsetX, offsetY) {
    const x = rect.left - offsetX + .5, y = rect.top - offsetY + .5;
    const width = Math.max(0, rect.width - 1), height = Math.max(0, rect.height - 1);
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function tick(now) {
    frame = 0;
    if (!pointer || !enabled() || !prepareCanvas()) { reset(); return; }
    // Cap this decorative work at 60fps, including on 120/144/240Hz screens.
    if (nextPaintTime && now < nextPaintTime - .1) { schedule(); return; }
    const delta = previousTime ? Math.min((now - previousTime) / 1000, .05) : 1 / 60;
    previousTime = now;
    nextPaintTime = nextPaintTime && now - nextPaintTime < FRAME_INTERVAL
      ? nextPaintTime + FRAME_INTERVAL : now + FRAME_INTERVAL;
    for (const target of motions.keys()) if (!target.isConnected) motions.delete(target);
    if (collectDirty) collect();
    const layoutMoving = anchor && moving(anchor);
    if (anchor && (geometryDirty || layoutMoving || !anchorRect)) anchorRect = anchor.getBoundingClientRect();
    // Static surfaces are measured only after layout changes. Only animated surfaces are remeasured per frame.
    for (const surface of surfaces) {
      if (geometryDirty || !surface.rect || moving(surface.element)) {
        surface.rect = surface.element.getBoundingClientRect();
      }
    }
    geometryDirty = false;
    const avatarMotion = updateAvatar(delta);
    const offsetX = pointer.x - RADIUS, offsetY = pointer.y - RADIUS;
    context.clearRect(0, 0, RADIUS * 2, RADIUS * 2);
    for (const surface of surfaces) {
      const rect = surface.avatar && avatarMotion ? avatarMotion.rect : surface.rect;
      if (!rect || rect.width < 3 || rect.height < 3 || rect.bottom < 0 || rect.top > viewportHeight ||
        rect.right < 0 || rect.left > viewportWidth) continue;
      const dx = Math.max(rect.left - pointer.x, 0, pointer.x - rect.right);
      const dy = Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom);
      const strength = smooth(1 - Math.hypot(dx, dy) / RADIUS);
      if (strength < .003) continue;
      let gradient = gradients.get(surface.accent);
      if (!gradient) {
        gradient = context.createRadialGradient(RADIUS, RADIUS, 0, RADIUS, RADIUS, RADIUS);
        gradient.addColorStop(0, `rgba(${surface.accent},.95)`);
        gradient.addColorStop(.35, `rgba(${surface.accent},.65)`);
        gradient.addColorStop(1, `rgba(${surface.accent},0)`);
        gradients.set(surface.accent, gradient);
      }
      context.strokeStyle = gradient;
      outline(rect, surface.round ? Math.min(rect.width, rect.height) / 2 : surface.radius, offsetX, offsetY);
      context.globalAlpha = .12 * strength;
      context.lineWidth = 5;
      context.stroke();
      context.globalAlpha = .85;
      context.lineWidth = 1.5;
      context.stroke();
    }
    if (avatarMotion) {
      if (!trackingAvatar) avatar.classList.add('is-tracking');
      trackingAvatar = true;
      avatar.style.transform = avatarMotion.transform;
    }
    const position = `translate3d(${offsetX.toFixed(1)}px,${offsetY.toFixed(1)}px,0)`;
    if (canvas.style.transform !== position) canvas.style.transform = position;
    if (canvas.hidden) canvas.hidden = false;
    if (avatarMotion || motions.size) schedule();
    else previousTime = nextPaintTime = 0;
  }

  function trackPointer(event) {
    if (event.pointerType === 'touch' || !enabled()) { reset(); return; }
    pointer = { x: event.clientX, y: event.clientY };
    schedule();
  }

  function trackMotion(event) {
    if (event.pseudoElement) return;
    const target = event.target;
    if (!(target instanceof Element) || target === canvas) return;
    const starting = event.type.endsWith('start') || event.type.endsWith('run');
    const key = event.animationName ? `a:${event.animationName}` : `t:${event.propertyName}`;
    if (!starting) {
      // Completion still matters when a dialog, hidden page, or setting suspended the effect.
      const keys = motions.get(target);
      const tracked = keys?.delete(key);
      if (!keys?.size) motions.delete(target);
      if (target === avatar) {
        if (event.animationName === 'avatarArrival') avatar.classList.remove('avatar-arrival');
        if (event.animationName === 'avatarSurprised') avatar.classList.remove('avatar-surprised');
      }
      if (tracked || target === avatar) invalidate();
      return;
    }
    if (target.closest(EXCLUDED)) return;
    if (event.type.startsWith('transition') && !/^(transform|translate|scale|rotate|opacity|width|height|max-height|padding.*|margin.*)$/.test(event.propertyName)) return;
    if (!target.matches('.avatar-wrap, .result-panel') && !surfaces.some(surface => target.contains(surface.element))) return;
    if (!motions.has(target)) motions.set(target, new Set());
    motions.get(target).add(key);
    invalidate();
  }

  function resize() {
    viewportWidth = innerWidth;
    viewportHeight = innerHeight;
    invalidate();
  }

  const pointerOut = event => { if (!event.relatedTarget) reset(); };
  const pointerDown = event => { if (event.pointerType === 'touch') reset(); };
  const visibility = () => { if (document.hidden) reset(); else refresh(); };
  const keyboard = event => {
    if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) reset();
  };
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(invalidate) : null;
  for (const target of document.querySelectorAll('main, .topbar, #resultCard')) resizeObserver?.observe(target);
  const mutationObserver = new MutationObserver(refresh);
  mutationObserver.observe(document.querySelector('main'), { childList: true, subtree: true, attributes: true,
    attributeFilter: ['hidden', 'inert', 'open'] });
  document.addEventListener('pointermove', trackPointer, { passive: true });
  document.addEventListener('pointerout', pointerOut, { passive: true });
  document.addEventListener('pointerdown', pointerDown, { passive: true });
  document.addEventListener('keydown', keyboard);
  document.addEventListener('visibilitychange', visibility);
  document.addEventListener('load', invalidate, true);
  document.addEventListener('toggle', refresh, true);
  for (const name of ['animationstart', 'animationend', 'animationcancel', 'transitionrun', 'transitionstart', 'transitionend', 'transitioncancel']) {
    document.addEventListener(name, trackMotion, true);
  }
  window.addEventListener('blur', reset);
  window.addEventListener('scroll', invalidate, { passive: true, capture: true });
  window.addEventListener('resize', resize, { passive: true });
  window.visualViewport?.addEventListener('resize', resize, { passive: true });
  for (const query of [finePointer, reducedMotion, forcedColors]) {
    if (query.addEventListener) query.addEventListener('change', refresh);
    else query.addListener?.(refresh);
  }
  document.fonts?.ready.then(invalidate);
  refresh();

  return {
    refresh,
    suspend(value) { paused = value; reset(); if (!value) refresh(); },
    react(target) {
      if (getSettings().pointerEffects === false || getSettings().reduceMotion || reducedMotion.matches) return;
      clearAvatar();
      if (reactionFrame) cancelAnimationFrame(reactionFrame);
      target.classList.remove('avatar-arrival', 'avatar-surprised');
      // Restart the one-shot reaction without a forced layout read.
      reactionFrame = requestAnimationFrame(() => {
        reactionFrame = 0;
        if (target.isConnected && getSettings().pointerEffects !== false && !getSettings().reduceMotion && !reducedMotion.matches) target.classList.add('avatar-surprised');
      });
    }
  };
}
