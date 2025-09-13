// (Assumes proxy-based API; adjust API_BASE as needed)
const DISCORD_EPOCH = 1420070400000n;
const API_BASE = 'https://-discord-api-search.bbrraaggee.workers.dev/';
const cache = new Map();
let currentReqToken = 0;

/* ------------ Utilities ------------ */
function snowflakeToDate(id) {
  try { return new Date(Number(((BigInt(id) >> 22n) + DISCORD_EPOCH))); } catch { return null; }
}
function escapeHTML(s='') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ------------ Badges ------------ */
const BADGES = [
  { flag: 1 << 6, icon: 'https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png', name: 'HypeSquad Bravery' },
  { flag: 1 << 7, icon: 'https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png', name: 'HypeSquad Brilliance' },
  { flag: 1 << 8, icon: 'https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png', name: 'HypeSquad Balance' }
];
function renderBadges(flags=0) {
  const out = BADGES.filter(b => flags & b.flag)
    .map(b => `<img class="badge-icon" src="${b.icon}" title="${escapeHTML(b.name)}" loading="lazy" draggable="false">`)
    .join('');
  return out || '<span class="no-badges">No public badges</span>';
}

/* ------------ Avatar / Banner ------------ */
function getAvatar(user) {
  if (user.avatar) {
    const animated = user.avatar.startsWith('a_');
    const base = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`;
    return { static:`${base}.webp?size=256`, gif: animated ? `${base}.gif?size=256` : '' };
  }
  const disc = Number(user.discriminator) % 5 || 0;
  return { static:`https://cdn.discordapp.com/embed/avatars/${disc}.png`, gif:'' };
}
function getBanner(user) {
  if (user.banner) {
    const anim = user.banner.startsWith('a_');
    const base = `https://cdn.discordapp.com/banners/${user.id}/${user.banner}`;
    return { static:`${base}.webp?size=480`, gif: anim ? `${base}.gif?size=480` : '' };
  }
  const accent = user.accent_color != null
    ? '#' + user.accent_color.toString(16).padStart(6,'0')
    : '#262b33';
  return { static:accent, gif:'' };
}

/* ------------ Rendering ------------ */
function renderUserCard(user) {
  const avatar = getAvatar(user);
  const banner = getBanner(user);
  const created = snowflakeToDate(user.id);
  const createdStr = created ? created.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '';
  const bannerStyle = banner.static.startsWith('#')
    ? `background:${banner.static}`
    : `background-image:url('${banner.static}')`;

  return `
    <div class="banner" id="banner"
      style="${bannerStyle}"
      ${banner.gif ? `data-static="${banner.static}" data-gif="${banner.gif}"`:''}></div>
    <div class="avatar-wrapper">
    <img class="avatar intro" id="avatar" src="${avatar.static}" data-static="${avatar.static}"
        ${avatar.gif ? `data-gif="${avatar.gif}"`:''} alt="Avatar of ${escapeHTML(user.username)}" draggable="false">
    </div>
    <div class="username">${escapeHTML(user.username)}</div>
    <div class="badges">${renderBadges(user.public_flags)}</div>
    <div class="created">Created: ${createdStr}</div>
    <div class="id">ID: ${user.id}</div>
  `;
}

/* ------------ Skeleton / States ------------ */
function skeletonCard() {
  return `
    <div class="skeleton">
      <div class="skel-banner"></div>
      <div class="skel-avatar"></div>
      <div class="skel-body">
        <div class="skel-line"></div>
        <div class="skel-line skel-small"></div>
        <div class="skel-badges">
          <div class="skel-pill"></div>
          <div class="skel-pill"></div>
          <div class="skel-pill"></div>
        </div>
        <div class="skel-line skel-small" style="width:68%;"></div>
      </div>
    </div>
  `;
}

function setCard(html, cls='') {
  const card = document.getElementById('userCard');
  card.className = `panel panel--glass user-card ${cls}`.trim();
  card.innerHTML = html;
}

function showLoading() {
  setCard(skeletonCard(), 'loading-state');
}

function showError(msg, detail='') {
  let extra = '';
  if (detail) {
    const safe = escapeHTML(detail); // full text; scrolling handled via CSS
    extra = `\n<details class="err-details" open>\n  <summary><span class="err-icon" aria-hidden="true">!</span><span>Details</span><span class="chevron" aria-hidden="true"></span></summary>\n  <div class="collapsible-body">\n    <pre class="err-pre">${safe}</pre>\n  </div>\n</details>`;
  }
  setCard(`<div class="error">${escapeHTML(msg)}${extra}</div>`);
  // Apply same animation enhancement to error details
  const d = document.querySelector('#userCard .err-details');
  if (d) {
    const summary = d.querySelector('summary');
    const body = d.querySelector('.collapsible-body');
    if (summary && body) {
      body.style.display='block';
      summary.addEventListener('click', e => { e.preventDefault(); const isOpen = d.hasAttribute('open'); animateDetails(d, body, !isOpen); });
    }
  }
}

function shakeScreen() {
  const body = document.body;
  const html = document.documentElement;
  body.classList.remove('shake-screen');
  html.classList.remove('shake-screen');
  void body.offsetWidth; // reflow to restart animation
  body.classList.add('shake-screen');
  html.classList.add('shake-screen');
  setTimeout(()=> { body.classList.remove('shake-screen'); html.classList.remove('shake-screen'); }, 650);
}

function wireMediaHover() {
  const a = document.getElementById('avatar');
  if (a && a.dataset.gif) {
    a.addEventListener('mouseenter', () => a.src = a.dataset.gif);
    a.addEventListener('mouseleave', () => a.src = a.dataset.static);
  }
  // Click spin + bounce animation
  if (a) {
    // Avoid stacking listeners if re-rendered
    if (!a.dataset.clickAnimBound) {
      a.addEventListener('click', () => {
        if (a.classList.contains('spin-bounce')) return; // already animating
        a.classList.add('spin-bounce');
      });
      a.addEventListener('animationend', (ev) => {
        if (ev.animationName === 'avatarSpin') {
          a.classList.remove('spin-bounce');
        }
        if (ev.animationName === 'avatarIn') {
          a.classList.remove('intro'); // ensure intro animation does not replay
        }
      }, { passive:true });
      a.dataset.clickAnimBound = '1';
    }
  }
  const b = document.getElementById('banner');
  if (b && b.dataset.gif) {
    b.addEventListener('mouseenter', () => {
      b.style.backgroundImage = `url('${b.dataset.gif}')`;
    });
    b.addEventListener('mouseleave', () => {
      b.style.backgroundImage = `url('${b.dataset.static}')`;
    });
  }
}

/* ------------ Fetch ------------ */
async function fetchDiscordUser(userId, signal) {
  if (cache.has(userId)) return cache.get(userId);
  const res = await fetch(`${API_BASE}/users/${userId}`, { signal });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : null; } catch {}
  if (!res.ok) {
    const err = new Error('HTTP '+res.status);
    err.status = res.status;
    err.body = raw;
    throw err;
  }
  cache.set(userId, json);
  return json;
}

/* ------------ DOM Wiring ------------ */
const form = document.getElementById('searchForm');
const input = document.getElementById('userId');
let abortController = null;

form.addEventListener('submit', async e => {
  e.preventDefault();
  const id = input.value.trim();
  if (!/^\d{5,30}$/.test(id)) { showError('Enter a numeric Discord user ID (5–30 digits).'); shakeScreen(); return; }

  if (abortController) abortController.abort();
  abortController = new AbortController();
  const reqToken = ++currentReqToken;
  showLoading();
  try {
    const user = await fetchDiscordUser(id, abortController.signal);
    if (reqToken !== currentReqToken) return;
    setCard(renderUserCard(user));
    wireMediaHover();
  } catch (err) {
    if (err.name === 'AbortError') return;
  if (err.status === 404) { showError('User not found (404).', err.body||''); shakeScreen(); }
    else if (err.status === 429) showError('Rate limited (429).', err.body||'');
    else if (err.status) showError(`HTTP ${err.status}`, err.body||'');
    else showError('Network error.');
  }
});

/* Debounced auto-search */
let debounceTimer;
input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  if (input.value.trim().length < 15) return;
  debounceTimer = setTimeout(()=> form.dispatchEvent(new Event('submit')), 650);
});

/* Progressive animated reveal for first paint */
window.addEventListener('DOMContentLoaded', () => {
  // Stagger already handled via nth-of-type; can add manual delay if needed.
  initTheme();
  wireSettings();
  activateNoScrollbar();
  enhanceDetailsAnimation();
});

/* ------------ Theme / Settings ------------ */
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = saved || (prefersLight ? 'light' : 'dark');
  applyTheme(theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = theme === 'light';
}
function applyTheme(theme) {
  const root = document.documentElement;
  beginThemeTransition();
  if (theme === 'light') root.setAttribute('data-theme','light'); else root.removeAttribute('data-theme');
  localStorage.setItem('theme', theme);
}
let __themeTransitionTimer;
function beginThemeTransition() {
  const root = document.documentElement;
  root.classList.add('theme-transition');
  clearTimeout(__themeTransitionTimer);
  __themeTransitionTimer = setTimeout(()=> root.classList.remove('theme-transition'), 650);
}
/* ------------ No Scrollbar Mode (preserve layout width) ------------ */
function activateNoScrollbar() {
  const MOBILE_BREAKPOINT = 900; // px width below which we allow native scrolling
  function applyMode() {
    const isMobileLike = window.innerWidth < MOBILE_BREAKPOINT || window.matchMedia('(pointer: coarse)').matches;
    if (isMobileLike) {
      document.documentElement.classList.remove('no-scrollbar');
      document.body.classList.remove('no-scrollbar');
      document.body.style.paddingRight = '';
      return;
    }
    // Desktop: hide scrollbar while preserving layout
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
    document.documentElement.classList.add('no-scrollbar');
    document.body.classList.add('no-scrollbar');
  }
  applyMode();
  // Listen for viewport changes
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyMode, 120);
  });
  // React to pointer type changes (orientation / input method shifts)
  const coarseQuery = window.matchMedia('(pointer: coarse)');
  if (coarseQuery.addEventListener) {
    coarseQuery.addEventListener('change', applyMode);
  } else if (coarseQuery.addListener) { // legacy Safari
    coarseQuery.addListener(applyMode);
  }
}

/* ------------ Smooth <details> animation (Troubleshooting) ------------ */
function enhanceDetailsAnimation() {
  const detailsEls = document.querySelectorAll('.info-details');
  detailsEls.forEach(d => {
    const summary = d.querySelector('summary');
    const body = d.querySelector('.collapsible-body');
    if (!summary || !body) return;
    // Ensure body has block layout for measurement
    body.style.display = 'block';
    summary.addEventListener('click', e => {
      e.preventDefault(); // we'll toggle manually
      const isOpen = d.hasAttribute('open');
      animateDetails(d, body, !isOpen);
    });
  });
}

function animateDetails(detailsEl, bodyEl, open) {
  if (detailsEl.classList.contains('animating')) return;
  detailsEl.classList.add('animating');
  detailsEl.classList.remove('toggling-open','toggling-close');
  detailsEl.classList.add(open ? 'toggling-open':'toggling-close');
  const startHeight = bodyEl.getBoundingClientRect().height;
  if (open) {
    detailsEl.setAttribute('open','');
  }
  // measure target
  const targetHeight = open ? bodyEl.getBoundingClientRect().height : 0;
  // revert to start height for transition
  bodyEl.style.height = startHeight + 'px';
  bodyEl.style.transition = 'height .5s cubic-bezier(.25,.8,.3,1), margin-top .5s cubic-bezier(.25,.8,.3,1), transform .5s cubic-bezier(.25,.8,.3,1), opacity .4s ease';
  if (open) { bodyEl.style.transform='scaleY(.6)'; bodyEl.style.opacity='0'; requestAnimationFrame(()=> { bodyEl.style.transform='scaleY(1)'; bodyEl.style.opacity='1'; }); }
  requestAnimationFrame(() => {
    bodyEl.style.height = targetHeight + 'px';
    if (!open) {
      bodyEl.style.marginTop = '0px';
      bodyEl.style.transform='scaleY(.6)';
      bodyEl.style.opacity='0';
    } else {
      bodyEl.style.marginTop = '12px';
    }
  });
  bodyEl.addEventListener('transitionend', function onEnd() {
    bodyEl.removeEventListener('transitionend', onEnd);
  bodyEl.style.transition = '';
  bodyEl.style.height = '';
  bodyEl.style.transform=''; bodyEl.style.opacity=''; bodyEl.style.marginTop='';
    if (!open) {
      detailsEl.removeAttribute('open');
      bodyEl.style.display = 'block';
    }
    detailsEl.classList.remove('animating','toggling-open','toggling-close');
  });
  if (!open) {
    // schedule height animation with attribute removal afterwards
  }
}
function wireSettings() {
  const fab = document.getElementById('settingsFab');
  const root = document.getElementById('settingsRoot');
  const panel = document.getElementById('settingsPanel');
  const toggle = document.getElementById('themeToggle');
  if (!fab || !root) return;
  fab.addEventListener('click', () => {
    const open = root.classList.toggle('open');
    fab.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) panel?.focus?.();
    // Trigger slow spin animation
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      // Restart spin each click
      fab.classList.remove('spin');
      // Force reflow
      void fab.offsetWidth;
      fab.classList.add('spin');
      setTimeout(()=> fab.classList.remove('spin'), 2000);
    }
  });
  document.addEventListener('click', e => {
    if (!root.classList.contains('open')) return;
    if (e.target === fab || root.contains(e.target)) return;
    root.classList.remove('open');
    fab.setAttribute('aria-expanded','false');
  });
  if (toggle) {
    toggle.addEventListener('change', () => applyTheme(toggle.checked ? 'light':'dark'));
  }
  // Close on escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && root.classList.contains('open')) {
      root.classList.remove('open');
      fab.setAttribute('aria-expanded','false');
    }
  });
}

// Preferences
const PREF_REDUCE_ANIM_KEY = 'pref_reduce_anim';

function applyReduceAnim(pref) {
  if (pref) {
    document.documentElement.classList.add('reduced-anim');
    finalizeAnimatedPanels();
  } else {
    document.documentElement.classList.remove('reduced-anim');
    // Optionally remove inline overrides so future dynamic content can animate
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.filter = '';
    });
  }
}

function loadReduceAnimPref() {
  const stored = localStorage.getItem(PREF_REDUCE_ANIM_KEY);
  if (stored === null) {
    // Auto-enable if user system already prefers reduced motion
    const sys = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    applyReduceAnim(sys);
    return sys;
  }
  const enabled = stored === '1';
  applyReduceAnim(enabled);
  return enabled;
}

function saveReduceAnimPref(on) {
  localStorage.setItem(PREF_REDUCE_ANIM_KEY, on ? '1' : '0');
  applyReduceAnim(on);
}

const reduceAnimToggle = document.getElementById('reduceAnimToggle');
if (reduceAnimToggle) {
  const initialReduce = loadReduceAnimPref();
  reduceAnimToggle.checked = initialReduce;
  reduceAnimToggle.addEventListener('change', () => {
    saveReduceAnimPref(reduceAnimToggle.checked);
  });
} else {
  // If toggle not present, still respect stored preference
  loadReduceAnimPref();
}

/* ------------ Finalize Animated Panels ------------ */
function finalizeAnimatedPanels() {
  document.querySelectorAll('[data-animate]').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.style.filter = 'none';
  });
  // Also ensure user card content (if skeleton or loaded) is fully visible
  const avatar = document.querySelector('.avatar');
  if (avatar) avatar.style.transform = 'none';
}


/* -------- Keyboard Shortcut Enhancements -------- */
function focusSearch() {
  const el = document.getElementById('userId');
  if (el) { el.focus(); el.select(); announceStatus('Search focused'); }
}
function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  applyTheme(isLight ? 'dark' : 'light');
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = !isLight;
  announceStatus('Theme ' + (isLight ? 'dark' : 'light'));
}
function toggleReducedAnimations() {
  const willEnable = !document.documentElement.classList.contains('reduced-anim');
  saveReduceAnimPref(willEnable);
  const rToggle = document.getElementById('reduceAnimToggle');
  if (rToggle) rToggle.checked = willEnable;
  announceStatus('Reduced animations ' + (willEnable ? 'enabled' : 'disabled'));
}
function announceStatus(msg) {
  const live = document.getElementById('statusLive');
  if (live) live.textContent = msg;
}

document.addEventListener('keydown', e => {
  // Ignore if user is typing in an input/textarea (except dedicated shortcuts)
  const tag = (e.target.tagName || '').toLowerCase();
  const inEditable = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;

  // Enter global focus when not inside search input (or if body focused)
  if (e.key === 'Enter' && !e.altKey && !e.metaKey && !e.ctrlKey) {
    if (!inEditable || e.target.id !== 'userId') {
      e.preventDefault();
      focusSearch();
      return;
    }
  }

  if (!e.altKey && !e.metaKey && !e.ctrlKey) {
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      toggleTheme();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      toggleReducedAnimations();
    } else if ((e.key === '/' && !inEditable) ) {
      e.preventDefault();
      focusSearch();
    } else if ((e.key === 'h' || (e.shiftKey && e.key === '/')) && !inEditable) {
      // Toggle troubleshooting details
      const det = document.querySelector('.info-details');
      if (det) {
        const body = det.querySelector('.collapsible-body');
        if (body) animateDetails(det, body, !det.hasAttribute('open'));
        else det.open = !det.open;
        announceStatus('Troubleshooting ' + (det.hasAttribute('open') ? 'opened' : 'closed'));
      }
    }
  }

  // Ctrl+F (browser find) – repurpose for search field focus
  if (e.key.toLowerCase() === 'f' && e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    focusSearch();
  }
});

// Live status helper
function updateStatus(msg, tone) {
  const el = document.getElementById('statusLive');
  if (!el) return;
  el.className = ''; // reset classes
  el.id = 'statusLive';
  if (tone) el.classList.add(`status-${tone}`);
  if (msg) {
    el.textContent = msg;
    void el.offsetWidth;
    el.classList.add('show','changed');
  } else {
    el.textContent = '';
    el.classList.remove('show','changed','status-ok','status-warn','status-err');
  }
}

// Enhance existing announceStatus (if present) to also call updateStatus
if (typeof announceStatus === 'function') {
  const _origAnnounce = announceStatus;
  announceStatus = function(msg, tone) {
    _origAnnounce(msg);
    updateStatus(msg, tone);
  };
} else {
  // fallback announceStatus
  function announceStatus(msg, tone) { updateStatus(msg, tone); }
}

// Hotkey chord: Alt + H + 1 / Alt + H + 2 (while Troubleshooting open)
const pressedKeys = new Set();
const CHORD_KEY = 'h';
document.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
  if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

  pressedKeys.add(e.key.toLowerCase());

  // Require Troubleshooting details open
  const details = document.querySelector('.info-details');
  const open = details && details.hasAttribute('open');
  if (!open) return;

  // Need Alt held and 'H' in the chord
  if (e.altKey && pressedKeys.has(CHORD_KEY)) {
    if (e.key === '1') {
      e.preventDefault();
      handleTroubleshootLink(0);
    } else if (e.key === '2') {
      e.preventDefault();
      handleTroubleshootLink(1);
    }
  }
});

document.addEventListener('keyup', (e) => {
  pressedKeys.delete(e.key.toLowerCase());
});

// Open link (index) and copy associated text
function handleTroubleshootLink(idx) {
  const links = document.querySelectorAll('.info-details .issue-link');
  if (!links.length) return;
  const link = links[idx] || links[0];

  const copyTexts = [
    'Trouble with No response',
    'Weird HTML error / Wrong Path / 404 No users found'
  ];
  const text = copyTexts[idx] || copyTexts[0];

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(()=>{});
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch(_) {}
      ta.remove();
    }
  } catch(_) {}

  if (link && link.href) {
    window.open(link.href, '_blank', 'noopener');
  }
  announceStatus(`Copied: ${text}`, 'ok');
}

// Optional: initial ready status
updateStatus('Ready','ok');

// Click on "make an issue" links should also copy the same canned text
document.addEventListener('click', (e) => {
  const link = e.target.closest('.info-details .issue-link');
  if (!link) return;

  const links = Array.from(document.querySelectorAll('.info-details .issue-link'));
  const idx = links.indexOf(link);
  if (idx === -1) return;

  // Prevent the default immediate navigation so our copy + status fires first
  e.preventDefault();
  handleTroubleshootLink(idx);
});