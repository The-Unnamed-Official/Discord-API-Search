const DISCORD_EPOCH = 1420070400000n;
const API_BASE = 'https://discord.com/api/v10';
const cache = new Map();
let currentReqToken = 0;

/* ------------ Utilities ------------ */
function snowflakeToDate(id) {
  try { return new Date(Number(((BigInt(id) >> 22n) + DISCORD_EPOCH))); } catch { return null; }
}
function escapeHTML(s='') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function normalizeToken(t) { return t.replace(/^Bot\s+/i,'').trim(); }

/* ------------ Badges ------------ */
const BADGES = [
  { flag: 1 << 6, icon: 'https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png', name: 'HypeSquad Bravery' },
  { flag: 1 << 7, icon: 'https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png', name: 'HypeSquad Brilliance' },
  { flag: 1 << 8, icon: 'https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png', name: 'HypeSquad Balance' }
];
function renderBadges(flags=0) {
  const out = BADGES.filter(b => flags & b.flag)
    .map(b => `<img class="badge-icon" src="${b.icon}" title="${escapeHTML(b.name)}" loading="lazy">`)
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
    : '#232428';
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
      <img class="avatar" id="avatar" src="${avatar.static}" data-static="${avatar.static}"
        ${avatar.gif ? `data-gif="${avatar.gif}"`:''} alt="Avatar of ${escapeHTML(user.username)}" draggable="false">
    </div>
    <div class="username">${escapeHTML(user.username)}</div>
    <div class="badges">${renderBadges(user.public_flags)}</div>
    <div class="created">Created: ${createdStr}</div>
    <div class="id">ID: ${user.id}</div>
  `;
}

function setCard(html, cls='') {
  const card = document.getElementById('userCard');
  card.className = `panel user-card ${cls}`.trim();
  card.innerHTML = html;
}
function showLoading() { setCard('<div class="loading">Loading...</div>'); }
function showError(msg, detail='') {
  const details = detail
    ? `<details><summary>details</summary><pre style="white-space:pre-wrap;font-size:.7em;line-height:1.25;max-height:180px;overflow:auto;">${escapeHTML(detail.slice(0,2000))}</pre></details>`
    : '';
  setCard(`<div class="error">${escapeHTML(msg)}</div>${details}`);
}
function wireMediaHover() {
  const a = document.getElementById('avatar');
  if (a && a.dataset.gif) {
    a.addEventListener('mouseenter', () => a.src = a.dataset.gif);
    a.addEventListener('mouseleave', () => a.src = a.dataset.static);
  }
  const b = document.getElementById('banner');
  if (b && b.dataset.gif) {
    b.addEventListener('mouseenter', () => { b.style.backgroundImage = `url('${b.dataset.gif}')`; b.style.background=''; });
    b.addEventListener('mouseleave', () => { b.style.backgroundImage = `url('${b.dataset.static}')`; });
  }
}

/* ------------ Fetch ------------ */
async function fetchDiscordUser(token, userId, signal) {
  const t = normalizeToken(token);
  const cacheKey = t.slice(0,12) + ':' + userId;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const res = await fetch(`${API_BASE}/users/${userId}`, {
    headers:{ Authorization:`Bot ${t}` },
    signal
  });
  const raw = await res.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : null; } catch {}
  if (!res.ok) {
    const err = new Error('HTTP '+res.status);
    err.status = res.status;
    err.body = raw;
    throw err;
  }
  cache.set(cacheKey, json);
  return json;
}

/* ------------ Token persistence ------------ */
function loadToken() { return localStorage.getItem('discord_bot_token') || ''; }
function saveToken(t) { t ? localStorage.setItem('discord_bot_token', normalizeToken(t)) : localStorage.removeItem('discord_bot_token'); }

/* ------------ DOM wiring ------------ */
const form = document.getElementById('searchForm');
const input = document.getElementById('userId');
const tokenInput = document.getElementById('botToken');
const saveBtn = document.getElementById('saveToken');
const clearBtn = document.getElementById('clearToken');
const showChk = document.getElementById('toggleTokenVisible');
tokenInput.value = loadToken();

saveBtn.addEventListener('click', () => {
  if (!tokenInput.value.trim()) { alert('Empty token.'); return; }
  saveToken(tokenInput.value);
  saveBtn.textContent = 'Saved';
  setTimeout(()=> saveBtn.textContent='Save',1100);
});
clearBtn.addEventListener('click', () => {
  tokenInput.value='';
  saveToken('');
});
showChk.addEventListener('change', () => {
  tokenInput.type = showChk.checked ? 'text' : 'password';
});

let abortController = null;
form.addEventListener('submit', async e => {
  e.preventDefault();
  const id = input.value.trim();
  if (!/^\d{5,30}$/.test(id)) { showError('Enter a numeric Discord user ID (5–30 digits).'); return; }
  const token = tokenInput.value.trim() || loadToken();
  if (!token) { showError('Paste a bot token first.'); return; }
  saveToken(token);
  if (abortController) abortController.abort();
  abortController = new AbortController();
  const reqToken = ++currentReqToken;
  showLoading();
  try {
    const user = await fetchDiscordUser(token, id, abortController.signal);
    if (reqToken !== currentReqToken) return;
    setCard(renderUserCard(user));
    wireMediaHover();
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.warn('[Fetch failed]', err.status, err.body);
    if (err.status === 404) showError('User not found (404).', err.body||'');
    else if (err.status === 401 || err.status === 403) showError('Unauthorized (401/403). Check token.', err.body||'');
    else if (err.status === 400) showError('Bad request (400). ID malformed?', err.body||'');
    else if (err.status === 429) showError('Rate limited (429). Slow down.', err.body||'');
    else if (err.status) showError(`HTTP ${err.status} from Discord.`, err.body||'');
    else showError('Network / CORS error (no status). Possible block.');
  }
});

/* Optional debounce */
let debounceTimer;
input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  if (input.value.trim().length < 15) return;
  debounceTimer = setTimeout(()=> form.dispatchEvent(new Event('submit')), 600);
});