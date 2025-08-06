// NOTE: This uses mock data. For real data, you must use a backend to call Discord's API securely.

const form = document.getElementById('searchForm');
const userCard = document.getElementById('userCard');
const errorDiv = document.getElementById('error');

// Mock badge icons (replace with SVGs or images for real use)
const BADGE_ICONS = {
  'staff': '⭐',
  'partner': '🤝',
  'hypesquad': '🎉',
  'bug_hunter': '🐛',
  'verified_bot': '🤖',
  'early_supporter': '⏰'
};

// Mock user data for demo
const MOCK_USERS = {
  '123456789012345678': {
    username: 'Clyde#0000',
    avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
    bio: 'I am the official Discord bot!',
    banner: null,
    banner_color: '#5865f2',
    badges: ['verified_bot', 'staff'],
    created_at: '2015-05-13T12:00:00.000Z'
  },
  '987654321098765432': {
    username: 'JaneDoe#1234',
    avatar: 'https://cdn.discordapp.com/embed/avatars/1.png',
    bio: 'Just a regular Discord user.',
    banner: 'https://cdn.discordapp.com/banners/987654321098765432/abcdef1234567890.png?size=512',
    banner_color: null,
    badges: ['hypesquad', 'early_supporter'],
    created_at: '2017-11-21T08:30:00.000Z'
  },
  '611204110955446301': {
    username: 'not.unnamed',
    avatar: 'https://cdn.discordapp.com/avatars/611204110955446301/a_ed042603a7540b0b5cc4cf15939fab36.webp?size=128',
    gif_avatar: 'https://cdn.discordapp.com/avatars/611204110955446301/a_ed042603a7540b0b5cc4cf15939fab36.gif?size=128',
    bio: `
      Midnight = <code>12:00:00 AM</code> 🌃<br><br>
      <b>Unnamed's RNG:</b><br>
      <a href="https://the-unnamed-official.github.io/Unnamed-RNG/" target="_blank">https://the-unnamed-official.github.io/Unnamed-RNG/</a><br>
      <a href="https://discord.gg/m6k7Jagm3v" target="_blank">https://discord.gg/m6k7Jagm3v</a>
    `,
    banner: 'https://cdn.discordapp.com/banners/611204110955446301/58f215ca99acd3b6b8bce25cc1515e1c.png?size=480',
    banner_color: '#e38e2b',
    badges: ['hypesquad'],
    created_at: '2018-07-15T10:00:00.000Z'
  },
  '1248988886605103222': {
    username: 'mythicdude_40528',
    avatar: 'https://cdn.discordapp.com/avatars/1248988886605103222/fe41777157caa0d313ff34558c1bfe3c.webp?size=128',
    bio: `
      Midnight = <code>12:00:00 AM</code> 🌃<br><br>
      <b>Unnamed's RNG:</b><br>
      <a href="https://the-unnamed-official.github.io/Unnamed-RNG/" target="_blank">https://the-unnamed-official.github.io/Unnamed-RNG/</a><br>
      <a href="https://discord.gg/m6k7Jagm3v" target="_blank">https://discord.gg/m6k7Jagm3v</a>
    `,
    banner: 'https://cdn.discordapp.com/banners/611204110955446301/58f215ca99acd3b6b8bce25cc1515e1c.png?size=480',
    banner_color: '#e38e2b',
    badges: ['hypesquad'],
    created_at: '2018-07-15T10:00:00.000Z'
  }
};

// Aliases for the same user
MOCK_USERS['William'] = MOCK_USERS['1248988886605103222'];
MOCK_USERS['mythicdude_40528'] = MOCK_USERS['1248988886605103222'];

function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderUser(user) {
  const bannerStyle = user.banner
    ? `background-image: url('${user.banner}');`
    : user.banner_color
      ? `background: ${user.banner_color};`
      : '';
  const badges = user.badges.map(b => `<span class="badge" title="${b.replace('_', ' ')}">${BADGE_ICONS[b] || '🏅'}</span>`).join('');
  const gifAvatar = user.gif_avatar || user.avatar;
  return `
    <div class="banner" style="${bannerStyle}"></div>
    <img class="avatar" src="${user.avatar}" alt="Avatar"
      onmouseover="this.src='${gifAvatar}'"
      onmouseout="this.src='${user.avatar}'">
    <div class="username">${user.username}</div>
    <div class="bio">${user.bio || ''}</div>
    <div class="badges">${badges}</div>
    <div class="created">Created: ${formatDate(user.created_at)}</div>
  `;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorDiv.textContent = '';
  userCard.classList.add('hidden');
  const userId = document.getElementById('userId').value.trim();
  // Replace this with a real API call to your backend
  const user = MOCK_USERS[userId];
  if (!user) {
    errorDiv.textContent = 'User not found or not accessible.';
    return;
  }
  userCard.innerHTML = renderUser(user);
  userCard.classList.remove('hidden');
});