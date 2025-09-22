// Show Help & Tips when info icon is clicked
document.addEventListener('DOMContentLoaded', function() {
  var infoFab = document.getElementById('infoFab');
  var infoCard = document.getElementById('infoCard');
  if (infoFab && infoCard) {
    infoFab.addEventListener('click', function() {
      if (infoCard.classList.contains('visible')) {
        infoCard.classList.remove('visible');
        setTimeout(function(){ infoCard.style.display = 'none'; }, 450);
      } else {
        infoCard.style.display = 'block';
        setTimeout(function(){ infoCard.classList.add('visible'); }, 10);
      }
    });
  }
});
// (Assumes proxy-based API; adjust API_BASE as needed)
const DISCORD_EPOCH = 1420070400000n;
const API_BASE = 'https://discord-api-search.bbrraaggee.workers.dev/api';
const cache = new Map();
let currentReqToken = 0;

const MODE_CONFIG = {
  user: {
    label: 'User ID',
    placeholder: 'Enter Discord user ID (snowflake)',
    helper: 'Example: <code>80351110224678912</code> • Right‑click a user in Discord (Dev Mode) → Copy ID',
    empty: 'Enter an ID to fetch a public user profile.',
    emptyIcon: '🧪',
    validation: 'Enter a numeric Discord user ID (5–30 digits).',
    notFound: 'User not found (404).'
  },
  guild: {
    label: 'Guild ID',
    placeholder: 'Enter Discord guild/server ID (snowflake)',
    helper: 'Example: <code>290926798629997171</code> • Right‑click a server icon (Dev Mode) → Copy ID',
    empty: 'Enter an ID to fetch a public server snapshot.',
    emptyIcon: '🏰',
    validation: 'Enter a numeric Discord guild ID (5–30 digits).',
    notFound: 'Guild not found (404).'
  }
};

let currentMode = 'user';

const FEATURE_DESCRIPTIONS = {
  COMMUNITY: 'Community servers unlock welcome screens, server insights, and membership screening tools.',
  DISCOVERABLE: 'Eligible for Discord’s Server Discovery directory so people can find it organically.',
  HUB: 'Part of the Student Hubs program that connects school communities.',
  NEWS: 'Announcement channels can publish updates that followers receive in their own servers.',
  PARTNERED: 'Recognized by Discord as a Partnered community with extra perks.',
  VERIFIED: 'Officially verified by Discord (typically for game studios, artists, or large brands).'
};

/* ------------ Utilities ------------ */
function snowflakeToDate(id) {
  try { return new Date(Number(((BigInt(id) >> 22n) + DISCORD_EPOCH))); } catch { return null; }
}
function escapeHTML(s='') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function escapeMultiline(str='') {
  return escapeHTML(str).replace(/\n+/g, '<br>');
}

function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return '—';
  try { return Number(value).toLocaleString(); } catch { return String(value); }
}

function formatVerificationLevel(level) {
  const map = ['None','Low','Medium','High','Very High'];
  return map[level] ?? 'Unknown';
}

function formatBoostTier(tier) {
  if (tier == null) return '—';
  if (tier === 0) return 'None';
  return `Level ${tier}`;
}

function formatNSFWLevel(level) {
  const map = ['Default','Explicit','Safe','Age-Restricted'];
  return map[level] ?? 'Unknown';
}

function formatLocale(locale) {
  if (!locale) return '—';
  try {
    const display = new Intl.DisplayNames(undefined, { type:'language' });
    const normalized = locale.replace('_','-');
    const label = display.of(normalized.toLowerCase());
    return label ? `${label} (${normalized})` : normalized;
  } catch {
    return locale.replace('_','-');
  }
}

function formatFeatureName(feature='') {
  return feature
    .toLowerCase()
    .split('_')
    .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
    .join(' ');
}

function fallbackGuildGradient(id='') {
  const palettes = [
    ['#3b4b6b','#1f242f','#5865f2'],
    ['#2c3448','#1a1f2b','#8b5cf6'],
    ['#31424d','#1c242a','#43b581'],
    ['#3a2f54','#201c32','#ff73fa'],
    ['#2f3d4f','#1b222c','#00b5d8']
  ];
  let idx = 0;
  try { idx = Number(BigInt(id) % BigInt(palettes.length)); } catch {}
  const [a,b,c] = palettes[idx];
  return `linear-gradient(145deg,${a},${b} 55%,${c})`;
}

/* ------------ Badges ------------ */
const BADGES = [
  { flag: 1 << 0, icon: 'https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png', name: 'Discord Employee' },
  { flag: 1 << 1, icon: 'https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png', name: 'Partnered Server Owner' },
  { flag: 1 << 2, icon: 'https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png', name: 'HypeSquad Events Member' },
  { flag: 1 << 3, icon: 'https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png', name: 'Bug Hunter Level 1' },
  { flag: 1 << 6, icon: 'https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png', name: 'House Bravery Member' },
  { flag: 1 << 7, icon: 'https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png', name: 'House Brilliance Member' },
  { flag: 1 << 8, icon: 'https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png', name: 'House Balance Member' },
  { flag: 1 << 9, icon: 'https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png', name: 'Early Nitro Supporter' },
  { flag: 1 << 14, icon: 'https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png', name: 'Bug Hunter Level 2' },
  { flag: 1 << 17, icon: 'https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png', name: 'Early Verified Bot Developer' },
  { flag: 1 << 18, icon: 'https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png', name: 'Moderator Programs Alumni' },
  { flag: 1 << 22, icon: 'https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png', name: 'Active Developer' }
];
function renderBadges(flags=0) {
  const out = BADGES.filter(b => flags & b.flag)
    .map(b => `
      <span class="badge-icon">
        <img class="badge-img" src="${b.icon}" loading="lazy" draggable="false" alt="${escapeHTML(b.name)}">
        <span class="badge-tooltip">${escapeHTML(b.name)}</span>
      </span>
    `)
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

function getGuildIcon(guild) {
  if (guild.icon) {
    const animated = guild.icon.startsWith('a_');
    const base = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}`;
    return { static:`${base}.webp?size=256`, gif: animated ? `${base}.gif?size=256` : '', fallback:false };
  }
  const letter = (guild.name || '?').trim()[0]?.toUpperCase() || '#';
  return { fallback:true, letter, background:fallbackGuildGradient(guild.id) };
}

function getGuildBanner(guild) {
  if (guild.banner) {
    const anim = guild.banner.startsWith('a_');
    const base = `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}`;
    return { static:`${base}.webp?size=480`, gif: anim ? `${base}.gif?size=480` : '' };
  }
  const splash = guild.discovery_splash || guild.splash;
  if (splash) {
    const path = guild.discovery_splash ? 'discovery-splashes' : 'splashes';
    const base = `https://cdn.discordapp.com/${path}/${guild.id}/${splash}`;
    return { static:`${base}.webp?size=640`, gif:'' };
  }
  return { static:fallbackGuildGradient(guild.id), gif:'' };
}

function buildBannerStyle(staticResource='') {
  if (!staticResource) return '';
  if (staticResource.startsWith('#') || staticResource.startsWith('linear')) {
    return `background:${staticResource}`;
  }
  return `background-image:url('${staticResource}')`;
}

function applyBackgroundFromResource(el, resource) {
  if (!el || !resource) return;
  if (resource.startsWith('#')) {
    el.style.background = resource;
    el.style.backgroundImage = '';
  } else if (resource.startsWith('linear')) {
    el.style.backgroundImage = resource;
  } else {
    el.style.backgroundImage = `url('${resource}')`;
  }
}

/* ------------ Rendering ------------ */
function renderUserCard(user) {
  const avatar = getAvatar(user);
  const banner = getBanner(user);
  const created = snowflakeToDate(user.id);
  const createdStr = created ? created.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '';
  const bannerStyle = buildBannerStyle(banner.static);

  return `
    <div class="banner" id="banner"
      style="${bannerStyle}"
      ${banner.gif ? `data-static="${banner.static}" data-gif="${banner.gif}"`:''}></div>
    <div class="avatar-wrapper">
    <img class="avatar intro" id="avatar" src="${avatar.static}" data-static="${avatar.static}" data-anim-avatar="true"
        ${avatar.gif ? `data-gif="${avatar.gif}"`:''} alt="Avatar of ${escapeHTML(user.username)}" draggable="false">
    </div>
    <div class="username">${escapeHTML(user.username)}</div>
    <div class="badges">${renderBadges(user.public_flags)}</div>
    <div class="created">Created: ${createdStr}</div>
    <div class="id">ID: ${user.id}</div>
  `;
}

function renderGuildFeaturePill(feature='', highlight=false) {
  const name = escapeHTML(formatFeatureName(feature));
  const tooltip = FEATURE_DESCRIPTIONS[feature] ? ` data-tooltip="${escapeHTML(FEATURE_DESCRIPTIONS[feature])}"` : '';
  const highlightAttr = highlight ? ' data-highlight="true"' : '';
  return `<span class="feature-pill"${highlightAttr}${tooltip}>${name}</span>`;
}

function renderGuildCard(guild) {
  const icon = getGuildIcon(guild);
  const banner = getGuildBanner(guild);
  const created = snowflakeToDate(guild.id);
  const createdStr = created ? created.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '';
  const bannerStyle = buildBannerStyle(banner.static);
  const highlightFeatures = new Set(['VERIFIED','PARTNERED','DISCOVERABLE','COMMUNITY','HUB']);
  const features = Array.isArray(guild.features) ? guild.features : [];
  const featurePills = features
    .map(f => renderGuildFeaturePill(f, highlightFeatures.has(f)))
    .join('');
  const featureMarkup = `
    <div class="feature-section">
      <div class="feature-header">
        <span class="feature-title">Public features</span>
        <span class="feature-hint">Flags provided by Discord — hover for details.</span>
      </div>
      ${featurePills ? `<div class="guild-features">${featurePills}</div>` : '<div class="no-features">No public guild features detected</div>'}
    </div>
  `;
  const counts = [];
  if (guild.approximate_member_count != null) counts.push({ label:'Members', value: formatNumber(guild.approximate_member_count) });
  if (guild.approximate_presence_count != null) counts.push({ label:'Online', value: formatNumber(guild.approximate_presence_count) });
  if (guild.premium_subscription_count != null) counts.push({ label:'Boosts', value: formatNumber(guild.premium_subscription_count) });
  const countsMarkup = counts.length
    ? `<div class="guild-counts">${counts.map(c => `<div class="count-box"><span class="count-label">${escapeHTML(c.label)}</span><span class="count-value">${escapeHTML(c.value)}</span></div>`).join('')}</div>`
    : '';
  const metaItems = [
    { label:'Owner ID', html: guild.owner_id ? `<code>${escapeHTML(guild.owner_id)}</code>` : '—' },
    { label:'Preferred Locale', text: formatLocale(guild.preferred_locale) },
    { label:'Verification Level', text: formatVerificationLevel(guild.verification_level) },
    { label:'2FA Requirement', text: guild.mfa_level === 1 ? 'Required' : 'Not required' },
    { label:'Boost Tier', text: formatBoostTier(guild.premium_tier) },
    { label:'NSFW Level', text: formatNSFWLevel(guild.nsfw_level) },
    { label:'Vanity URL', html: guild.vanity_url_code ? `<a href="https://discord.gg/${encodeURIComponent(guild.vanity_url_code)}" target="_blank" rel="noopener">discord.gg/${escapeHTML(guild.vanity_url_code)}</a>` : '—' }
  ];
  const metaMarkup = `<div class="meta-grid">${metaItems.map(item => {
    const value = item.html != null ? item.html : escapeHTML(item.text ?? '—');
    return `<div class="meta-item"><span class="meta-label">${escapeHTML(item.label)}</span><span class="meta-value">${value}</span></div>`;
  }).join('')}</div>`;

  const description = guild.description ? `<div class="guild-description">${escapeMultiline(guild.description)}</div>` : '';
  const avatarMarkup = icon.fallback
    ? `<div class="avatar avatar--placeholder" id="avatar" style="background:${escapeHTML(icon.background)}" data-anim-avatar="true" role="img" aria-label="Placeholder icon for ${escapeHTML(guild.name || 'guild')}">${escapeHTML(icon.letter)}</div>`
    : `<img class="avatar intro" id="avatar" src="${icon.static}" data-static="${icon.static}" data-anim-avatar="true" ${icon.gif ? `data-gif="${icon.gif}"`:''} alt="Icon of ${escapeHTML(guild.name)}" draggable="false">`;

  return `
    <div class="banner" id="banner"
      style="${bannerStyle}"
      data-static="${escapeHTML(banner.static)}"
      ${banner.gif ? `data-gif="${banner.gif}"`:''}></div>
    <div class="avatar-wrapper">
      ${avatarMarkup}
    </div>
    <div class="username">${escapeHTML(guild.name || 'Unknown Guild')}</div>
    <div class="created">Created: ${createdStr}</div>
    <div class="id">ID: ${guild.id}</div>
    <div class="guild-meta">
      ${description}
      ${metaMarkup}
      ${countsMarkup}
      ${featureMarkup}
    </div>
  `;
}

/* ------------ Skeleton / States ------------ */
function renderEmptyState(mode=currentMode) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.user;
  const icon = config.emptyIcon || '🔍';
  const msg = config.empty || 'Enter an ID to fetch data.';
  return `
    <div class="placeholder-msg">
      <div class="placeholder-icon">${icon}</div>
      <p>${escapeHTML(msg)}</p>
    </div>
  `;
}

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

function setCard(html, cls='', mode=currentMode) {
  const card = document.getElementById('resultCard');
  if (!card) return;
  const modeClass = mode ? `result-card--${mode}` : '';
  const classes = ['panel','panel--glass','result-card', cls, modeClass].filter(Boolean).join(' ');
  card.className = classes;
  card.innerHTML = html;
}

function showLoading(mode=currentMode) {
  setCard(skeletonCard(), 'loading-state', mode);
}

function showError(msg, detail='', mode=currentMode) {
  let extra = '';
  if (detail) {
    const safe = escapeHTML(detail); // full text; scrolling handled via CSS
    extra = `\n<details class="err-details" open>\n  <summary><span class="err-icon" aria-hidden="true">!</span><span>Details</span><span class="chevron" aria-hidden="true"></span></summary>\n  <div class="collapsible-body">\n    <pre class="err-pre">${safe}</pre>\n  </div>\n</details>`;
  }
  setCard(`<div class="error">${escapeHTML(msg)}${extra}</div>`, 'error-state', mode);
  // Apply same animation enhancement to error details
  const d = document.querySelector('#resultCard .err-details');
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
  document.querySelectorAll('#resultCard [data-gif]').forEach(el => {
    if (el.dataset.gifBound) return;
    if (el.tagName === 'IMG') {
      el.addEventListener('mouseenter', () => { el.src = el.dataset.gif; });
      el.addEventListener('mouseleave', () => { el.src = el.dataset.static; });
    } else {
      el.addEventListener('mouseenter', () => { el.style.backgroundImage = `url('${el.dataset.gif}')`; });
      el.addEventListener('mouseleave', () => applyBackgroundFromResource(el, el.dataset.static));
    }
    el.dataset.gifBound = '1';
  });

  document.querySelectorAll('#resultCard [data-anim-avatar]').forEach(el => {
    if (el.dataset.clickAnimBound) return;
    el.addEventListener('click', () => {
      if (el.classList.contains('spin-bounce')) return;
      el.classList.add('spin-bounce');
    });
    el.addEventListener('animationend', ev => {
      if (ev.animationName === 'avatarSpin') {
        el.classList.remove('spin-bounce');
      }
      if (ev.animationName === 'avatarIn') {
        el.classList.remove('intro');
      }
    }, { passive:true });
    el.dataset.clickAnimBound = '1';
  });

  const banner = document.querySelector('#resultCard #banner');
  if (banner && banner.dataset.static && !banner.dataset.staticBound) {
    banner.addEventListener('mouseleave', () => applyBackgroundFromResource(banner, banner.dataset.static));
    banner.dataset.staticBound = '1';
  }
}

/* ------------ Fetch ------------ */
async function fetchDiscordUser(userId, signal) {
  const key = `user:${userId}`;
  if (cache.has(key)) return cache.get(key);
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
  cache.set(key, json);
  return json;
}

async function fetchDiscordGuild(guildId, signal) {
  const key = `guild:${guildId}`;
  if (cache.has(key)) return cache.get(key);
  const res = await fetch(`${API_BASE}/guilds/${guildId}?with_counts=true`, { signal });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : null; } catch {}
  if (!res.ok) {
    const err = new Error('HTTP '+res.status);
    err.status = res.status;
    err.body = raw;
    throw err;
  }
  cache.set(key, json);
  return json;
}

/* ------------ DOM Wiring ------------ */
const form = document.getElementById('searchForm');
const input = document.getElementById('searchId');
const helperLine = document.getElementById('lookupHelper');
const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));
let abortController = null;

function updateModeUI(resetCard=false) {
  const config = MODE_CONFIG[currentMode] || MODE_CONFIG.user;
  modeButtons.forEach(btn => {
    const isActive = btn.dataset.mode === currentMode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
  });
  if (input) {
    input.placeholder = config.placeholder;
    input.setAttribute('aria-label', config.label);
  }
  if (helperLine) helperLine.innerHTML = config.helper;
  if (resetCard) {
    setCard(renderEmptyState(currentMode), 'empty', currentMode);
  }
}

function setMode(mode) {
  if (!mode || !MODE_CONFIG[mode] || mode === currentMode) return;
  currentMode = mode;
  if (abortController) { abortController.abort(); abortController = null; }
  if (input) { input.value = ''; input.focus(); }
  updateModeUI(true);
  announceStatus(`Switched to ${MODE_CONFIG[mode].label} lookup`, 'ok');
}

modeButtons.forEach((btn, idx) => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
  btn.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const direction = e.key === 'ArrowRight' ? 1 : -1;
      const target = (idx + direction + modeButtons.length) % modeButtons.length;
      const targetBtn = modeButtons[target];
      targetBtn.focus();
      setMode(targetBtn.dataset.mode);
    }
  });
});

updateModeUI(true);

if (form && input) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const id = input.value.trim();
    const mode = currentMode;
    const config = MODE_CONFIG[mode] || MODE_CONFIG.user;
    if (!/^\d{5,30}$/.test(id)) { showError(config.validation, '', mode); shakeScreen(); return; }

    if (abortController) abortController.abort();
    abortController = new AbortController();
    const reqToken = ++currentReqToken;
    showLoading(mode);
    try {
      const data = mode === 'guild'
        ? await fetchDiscordGuild(id, abortController.signal)
        : await fetchDiscordUser(id, abortController.signal);
      if (reqToken !== currentReqToken || mode !== currentMode) return;
      const renderer = mode === 'guild' ? renderGuildCard : renderUserCard;
      setCard(renderer(data), '', mode);
      wireMediaHover();
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (reqToken !== currentReqToken || mode !== currentMode) return;
      if (err.status === 404) { showError(config.notFound, err.body||'', mode); shakeScreen(); }
      else if (err.status === 429) showError('Rate limited (429).', err.body||'', mode);
      else if (err.status) showError(`HTTP ${err.status}`, err.body||'', mode);
      else showError('Network error.', '', mode);
    }
  });

  /* Debounced auto-search */
  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    if (input.value.trim().length < 15) return;
    debounceTimer = setTimeout(()=> form.dispatchEvent(new Event('submit')), 650);
  });
}

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
  const el = document.getElementById('searchId');
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
    if (!inEditable || e.target.id !== 'searchId') {
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