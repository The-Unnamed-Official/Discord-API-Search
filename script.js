const APP_VERSION = 'v1.1';
const DISCORD_API_VERSION = 10;
const DISCORD_EPOCH = 1420070400000n;
const API_BASE = 'https://discord-api-search.bbrraaggee.workers.dev/api';
const BOT_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1406921951196221520&integration_type=0&scope=bot%20applications.commands&permissions=8';
const CACHE_TTL_MS = 5 * 60 * 1000;
const SETTINGS_VERSION = 2;

const EXAMPLES = {
  user: '611204110955446301',
  guild: '1275558913592529019'
};

const state = {
  mode: 'user',
  currentToken: 0,
  abortController: null,
  lastSearch: null,
  settings: {
    theme: 'dark',
    reduceMotion: false,
    autoSearch: true,
    badgeLabels: false
  },
  avatarMotionCleanup: null
};

const cache = new Map();
const guildTagCache = new Map();

const MODE_CONFIG = {
  user: {
    label: 'User',
    input: 'Enter a Discord user ID',
    helper: 'Paste a user snowflake. URLs and mentions are cleaned automatically.',
    emptyTitle: 'Ready for a user lookup',
    emptyText: 'Search a user ID to inspect public profile data, badges, avatar resources, and snowflake dates.',
    notFound: 'User not found.'
  },
  guild: {
    label: 'Guild',
    input: 'Enter a Discord guild/server ID',
    helper: 'Guild lookups require the proxy bot to be in that server.',
    emptyTitle: 'Ready for a guild lookup',
    emptyText: 'Search a guild ID to inspect public server data, features, counts, and CDN resources.',
    notFound: 'Guild not found.'
  }
};

const BADGES = [
  { bit: 1n << 0n, code: 'STAFF', name: 'Discord Employee', hash: '5e74e9b61934fc1f67c65515d1f7e60d' },
  { bit: 1n << 1n, code: 'PARTNER', name: 'Partnered Server Owner', hash: '3f9748e53446a137a052f3454e2de41e' },
  { bit: 1n << 2n, code: 'HYPESQUAD', name: 'HypeSquad Events Member', hash: 'bf01d1073931f921909045f3a39fd264' },
  { bit: 1n << 3n, code: 'BUG 1', name: 'Bug Hunter Level 1', hash: '2717692c7dca7289b35297368a940dd0' },
  { bit: 1n << 6n, code: 'BRAVERY', name: 'House Bravery Member', hash: '8a88d63823d8a71cd5e390baa45efa02', fallback: 'resources/7158-bravery.png' },
  { bit: 1n << 7n, code: 'BRILLIANCE', name: 'House Brilliance Member', hash: '011940fd013da3f7fb926e4a1cd2e618', fallback: 'resources/7156-brilliance.png' },
  { bit: 1n << 8n, code: 'BALANCE', name: 'House Balance Member', hash: '3aa41de486fa12454c3761e8e223442e.png', fallback: 'resources/7157-balance.png' },
  { bit: 1n << 9n, code: 'SUPPORTER', name: 'Early Supporter', hash: '7060786766c9c840eb3019e725d2b358' },
  { bit: 1n << 10n, code: 'TEAM', name: 'Team User' },
  { bit: 1n << 14n, code: 'BUG 2', name: 'Bug Hunter Level 2', hash: '848f79194d4be5ff5f81505cbd0ce1e6' },
  { bit: 1n << 16n, code: 'BOT', name: 'Verified Bot' },
  { bit: 1n << 17n, code: 'DEV', name: 'Early Verified Bot Developer', hash: '6df5892e0f35b051f8b61eace34f4967' },
  { bit: 1n << 18n, code: 'MOD', name: 'Moderator Programs Alumni', hash: 'fee1624003e2fee35cb398e125dc479b' },
  { bit: 1n << 19n, code: 'HTTP', name: 'HTTP Interactions Bot' },
  { bit: 1n << 22n, code: 'ACTIVE', name: 'Active Developer', hash: '6bdc42827a38498929a4920da12695d9' }
];

const NITRO_BADGE = {
  id: 'nitro',
  code: 'NITRO',
  name: 'Discord Nitro',
  hash: '2ba85e8026a8614b640c2837bcdfe21b',
  kind: 'nitro'
};

const FEATURE_DESCRIPTIONS = {
  ACTIVITIES_ALPHA: 'Early access flag for Discord Activities support in this guild.',
  ACTIVITIES_EMPLOYEE: 'Internal or employee-facing Activities capability returned by Discord.',
  ACTIVITIES_INTERNAL_DEV: 'Internal development flag for Discord Activities in this guild.',
  ANIMATED_BANNER: 'The guild can use an animated banner resource on supported surfaces.',
  ANIMATED_ICON: 'The guild can use an animated icon resource, normally shown as an animated server icon.',
  APPLICATION_COMMAND_PERMISSIONS_V2: 'The guild uses the newer application command permissions system for apps and commands.',
  AUTO_MODERATION: 'Discord AutoMod is available or configured for automated message and member safety rules.',
  BANNER: 'The guild can use a server banner image resource.',
  COMMERCE: 'Legacy commerce capability for guilds that had Discord commerce features.',
  COMMUNITY: 'Community mode is enabled, unlocking rules, announcements, discovery readiness, welcome tools, and moderation requirements.',
  CREATOR_MONETIZABLE: 'The guild has creator monetization capability returned by Discord.',
  CREATOR_MONETIZABLE_PROVISIONAL: 'The guild is provisionally eligible for creator monetization features.',
  CREATOR_STORE_PAGE: 'The guild has or had access to a creator store page surface.',
  DEVELOPER_SUPPORT_SERVER: 'The guild is marked as a developer support server for an application.',
  DISCOVERABLE: 'The guild can appear in Discord Server Discovery so people can find it organically.',
  ENHANCED_ROLE_COLORS: 'The guild can use enhanced role colors such as gradient role styling.',
  EXPOSED_TO_ACTIVITIES_WTP_EXPERIMENT: 'The guild is exposed to an Activities experiment returned by Discord.',
  FEATURABLE: 'The guild is eligible to be featured by Discord in discovery or recommendation surfaces.',
  GUESTS_ENABLED: 'Guest access flows are enabled for this guild.',
  GUILD_HOME_OVERRIDE: 'The guild has access to a customized or overridden server home experience.',
  GUILD_HOME_TEST: 'The guild is included in Discord server home testing.',
  GUILD_MEMBER_VERIFICATION_EXPERIMENT: 'The guild is part of membership verification experiments.',
  GUILD_ONBOARDING: 'Server onboarding is enabled so new members can choose channels, roles, and interests.',
  GUILD_ONBOARDING_ADMIN_ONLY: 'Server onboarding configuration is limited to admins or staged for admin-only access.',
  GUILD_ONBOARDING_EVER_ENABLED: 'Server onboarding has been enabled on this guild at least once.',
  GUILD_ONBOARDING_HAS_PROMPTS: 'Server onboarding prompts are configured for new members.',
  GUILD_PRODUCTS: 'The guild has access to guild product or monetization surfaces.',
  GUILD_ROLE_SUBSCRIPTIONS: 'Role subscriptions are available as a guild-level monetization capability.',
  GUILD_ROLE_SUBSCRIPTION_PURCHASE_FEEDBACK_LOOP: 'Discord has enabled role subscription purchase feedback surfaces for this guild.',
  GUILD_SERVER_GUIDE: 'The guild has access to a server guide or new-member guide experience.',
  GUILD_TAGS: 'Guild tags are available, letting members display a short server identity badge where Discord supports it.',
  GUILD_WEB_PAGE_VANITY_URL: 'The guild has a public web page vanity URL capability.',
  HAD_EARLY_ACTIVITIES_ACCESS: 'The guild previously had early access to Discord Activities.',
  HAS_DIRECTORY_ENTRY: 'The guild has an entry in a directory, commonly related to hubs or discovery-style listings.',
  HUB: 'The guild is a Student Hub server connecting school communities.',
  INCREASED_THREAD_LIMIT: 'The guild has an increased thread limit compared with normal guild limits.',
  INVITES_DISABLED: 'Invite creation or invite usage is paused for this guild.',
  INVITE_SPLASH: 'The guild can use an invite splash image resource.',
  LINKED_TO_HUB: 'The guild is linked to a Student Hub or hub-style directory.',
  MEMBER_PROFILES: 'The guild supports server-specific member profile customization.',
  MEMBER_SAFETY_PAGE_ROLLOUT: 'The guild has access to newer member safety page surfaces.',
  MEMBER_VERIFICATION_GATE_ENABLED: 'Membership screening is enabled, requiring new members to accept rules or answer checks before participating.',
  MORE_EMOJI: 'The guild has an increased emoji capacity.',
  MORE_SOUNDBOARD: 'The guild has additional soundboard capacity.',
  MORE_STICKERS: 'The guild has additional sticker capacity.',
  NEWS: 'Announcement channels are available, allowing followed updates to be published into other servers.',
  NEW_THREAD_PERMISSIONS: 'The guild uses newer thread permission behavior.',
  PARTNERED: 'The guild is recognized as a Discord Partnered server.',
  PREMIUM_TIER_3_OVERRIDE: 'The guild has a premium tier override returned by Discord.',
  PREVIEW_ENABLED: 'The guild preview endpoint can expose a public preview for this server.',
  PRIVATE_THREADS: 'The guild supports private threads.',
  RAID_ALERTS_DISABLED: 'Discord raid alerts are disabled for this guild.',
  RELAY_ENABLED: 'Relay capability is enabled for this guild.',
  ROLE_ICONS: 'The guild can use role icons for roles shown in supported Discord clients.',
  ROLE_SUBSCRIPTIONS_AVAILABLE_FOR_PURCHASE: 'Members can purchase role subscriptions in this guild.',
  ROLE_SUBSCRIPTIONS_ENABLED: 'Role subscriptions are enabled for this guild.',
  SEVEN_DAY_THREAD_ARCHIVE: 'The guild supports seven-day thread auto-archive durations.',
  SOUNDBOARD: 'The guild has soundboard support.',
  TEXT_IN_VOICE_ENABLED: 'Text chat in voice channels is enabled.',
  THREADS_ENABLED: 'Thread channels and thread conversations are enabled.',
  THREE_DAY_THREAD_ARCHIVE: 'The guild supports three-day thread auto-archive durations.',
  TICKETED_EVENTS_ENABLED: 'Ticketed event capability is enabled for the guild.',
  VANITY_URL: 'The guild can use a custom discord.gg vanity invite code.',
  VERIFIED: 'The guild is officially verified by Discord.',
  VIP_REGIONS: 'Legacy VIP voice region support is enabled for this guild.',
  WELCOME_SCREEN_ENABLED: 'The community welcome screen is enabled for new visitors or members.'
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeAttr(value = '') {
  return escapeHTML(value).replace(/`/g, '&#96;');
}

function toBigIntFlag(value) {
  try {
    if (value == null || value === '') return 0n;
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function snowflakeToDate(id) {
  try {
    return new Date(Number((BigInt(id) >> 22n) + DISCORD_EPOCH));
  } catch {
    return null;
  }
}

function snowflakeAge(id) {
  const date = snowflakeToDate(id);
  if (!date) return 'Unknown';
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  if (days < 31) return `${days} days`;
  const months = Math.floor(days / 30.4375);
  if (months < 24) return `${months} months`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} years, ${rest} months` : `${years} years`;
}

function formatDate(date) {
  if (!date || Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function formatNumber(value) {
  if (value == null || value === '') return 'Unknown';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString();
}

function formatHexColor(value) {
  if (value == null) return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return `#${number.toString(16).padStart(6, '0')}`;
}

function normalizeApiColor(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return formatHexColor(value);
  const trimmed = String(value).trim();
  const match = trimmed.match(/^#?([0-9a-f]{6})$/i);
  return match ? `#${match[1].toLowerCase()}` : '';
}

function hexToRgbTriplet(hex) {
  const normalized = normalizeApiColor(hex);
  if (!normalized) return '88, 101, 242';
  const value = normalized.slice(1);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ].join(', ');
}

function profileAccentStyle(color) {
  const accent = normalizeApiColor(color);
  if (!accent) return '';
  return ` style="--profile-accent:${escapeAttr(accent)}; --profile-accent-rgb:${hexToRgbTriplet(accent)};"`;
}

function formatLocale(locale) {
  if (!locale) return 'Unknown';
  const normalized = String(locale).replace('_', '-');
  try {
    const display = new Intl.DisplayNames(undefined, { type: 'language' });
    const label = display.of(normalized.toLowerCase());
    return label ? `${label} (${normalized})` : normalized;
  } catch {
    return normalized;
  }
}

function formatFeatureName(feature) {
  return String(feature || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatPremiumType(type) {
  if (type == null || type === '') return 'Not returned';
  return ['None or unavailable', 'Nitro Classic', 'Discord Nitro', 'Nitro Basic'][Number(type)] || 'Unknown';
}

function formatVerificationLevel(level) {
  return ['None', 'Low', 'Medium', 'High', 'Very High'][Number(level)] || 'Unknown';
}

function formatNotificationLevel(level) {
  return ['All messages', 'Only mentions'][Number(level)] || 'Unknown';
}

function formatExplicitFilter(level) {
  return ['Disabled', 'Members without roles', 'All members'][Number(level)] || 'Unknown';
}

function formatNSFWLevel(level) {
  return ['Default', 'Explicit', 'Safe', 'Age Restricted'][Number(level)] || 'Unknown';
}

function formatBoostTier(tier) {
  const number = Number(tier);
  if (!Number.isFinite(number)) return 'Unknown';
  return number === 0 ? 'None' : `Tier ${number}`;
}

function fallbackGradient(id = '') {
  const palettes = [
    ['#5865f2', '#2f3136', '#57f287'],
    ['#eb459e', '#2b2d31', '#fee75c'],
    ['#00a8fc', '#25272d', '#57f287'],
    ['#f0b232', '#25272d', '#5865f2'],
    ['#ed4245', '#2b2d31', '#00a8fc']
  ];
  let index = 0;
  try {
    index = Number(BigInt(id) % BigInt(palettes.length));
  } catch {}
  const [a, b, c] = palettes[index];
  return `linear-gradient(135deg, ${a}, ${b} 48%, ${c})`;
}

function badgeIconUrl(hash) {
  if (!hash) return '';
  const cleanHash = String(hash).replace(/\.png$/i, '');
  return `https://cdn.discordapp.com/badge-icons/${cleanHash}.png`;
}

function cdnAsset(path, id, hash, size = 512, animated = true) {
  if (!hash) return null;
  const base = `https://cdn.discordapp.com/${path}/${id}/${hash}`;
  const supportsAnimation = animated && String(hash).startsWith('a_');
  return {
    static: `${base}.webp?size=${size}`,
    animated: supportsAnimation ? `${base}.webp?size=${size}&animated=true` : '',
    original: `${base}.${supportsAnimation ? 'gif' : 'png'}?size=4096`,
    isAnimated: supportsAnimation
  };
}

function defaultAvatar(user) {
  let index = 0n;
  const discriminator = String(user.discriminator || '0');
  try {
    if (discriminator && discriminator !== '0' && discriminator !== '0000') {
      index = BigInt(Number(discriminator) % 5);
    } else {
      index = (BigInt(user.id) >> 22n) % 6n;
    }
  } catch {
    index = 0n;
  }
  return {
    static: `https://cdn.discordapp.com/embed/avatars/${index}.png`,
    animated: '',
    original: `https://cdn.discordapp.com/embed/avatars/${index}.png`,
    isAnimated: false
  };
}

function getUserAvatar(user) {
  return user.avatar ? cdnAsset('avatars', user.id, user.avatar, 512) : defaultAvatar(user);
}

function getUserBanner(user) {
  if (user.banner) return cdnAsset('banners', user.id, user.banner, 1024);
  const accent = normalizeApiColor(user.accent_color);
  return {
    static: accent || fallbackGradient(user.id),
    animated: '',
    original: '',
    isAnimated: false,
    isColor: Boolean(accent)
  };
}

function getAvatarDecoration(user) {
  const asset = user.avatar_decoration_data && user.avatar_decoration_data.asset;
  if (!asset) return '';
  return `https://cdn.discordapp.com/avatar-decoration-presets/${asset}.png?size=160`;
}

function getPrimaryGuildIdentity(user) {
  if (!user || typeof user !== 'object') return null;
  return user.primary_guild || user.clan || null;
}

function rememberPrimaryGuildTag(user) {
  const identity = getPrimaryGuildIdentity(user);
  if (!identity?.identity_enabled || !identity.identity_guild_id || !identity.tag) return null;
  const tag = {
    guildId: String(identity.identity_guild_id),
    tag: String(identity.tag),
    badge: identity.badge ? String(identity.badge) : ''
  };
  guildTagCache.set(tag.guildId, tag);
  return tag;
}

function getGuildTagData(guild) {
  if (!guild?.id) return null;
  const candidates = [
    guild.guild_tag,
    guild.tag_data,
    guild.guild_profile,
    guild.profile,
    guild.identity,
    guild.primary_guild,
    guild
  ].filter(value => value && typeof value === 'object');
  const source = candidates.find(value => value.tag || value.guild_tag || value.identity_tag);
  const cached = guildTagCache.get(String(guild.id));
  const tag = source?.tag || source?.guild_tag || source?.identity_tag || cached?.tag;
  if (!tag) return null;
  return {
    guildId: String(guild.id),
    tag: String(tag),
    badge: String(source?.badge || source?.badge_hash || source?.guild_tag_badge || cached?.badge || '')
  };
}

function getGuildTagBadge(guild) {
  const data = getGuildTagData(guild);
  if (!data) return null;
  return {
    id: `guild-tag:${data.guildId}`,
    code: data.tag,
    name: data.tag,
    src: data.badge ? `https://cdn.discordapp.com/guild-tag-badges/${data.guildId}/${data.badge}.png?size=64` : '',
    kind: 'server',
    tag: data.tag
  };
}

function getPrimaryGuildBadge(user, guildDetails = null) {
  const guild = getPrimaryGuildIdentity(user);
  if (!guild || !guild.identity_enabled || !guild.identity_guild_id || !guild.badge) return null;
  rememberPrimaryGuildTag(user);
  const tag = guild.tag || 'TAG';
  return {
    id: `primary-guild:${guild.identity_guild_id}`,
    code: tag,
    name: guildDetails?.name || tag,
    detail: guildDetails?.name ? tag : '',
    src: `https://cdn.discordapp.com/guild-tag-badges/${guild.identity_guild_id}/${guild.badge}.png?size=64`,
    kind: 'server',
    guildId: guild.identity_guild_id,
    tag
  };
}

function getNitroBadge(user) {
  if (!user || typeof user !== 'object') return null;
  const premiumType = Number(user.premium_type);
  const hasTypedPremium = Number.isInteger(premiumType) && premiumType > 0;
  const hasExplicitPremium = user.nitro === true
    || user.premium === true
    || user.is_nitro === true
    || Boolean(user.premium_since || user.nitro_since);
  if (!hasTypedPremium && !hasExplicitPremium) return null;

  const name = hasTypedPremium ? formatPremiumType(premiumType) : NITRO_BADGE.name;
  return {
    ...NITRO_BADGE,
    name,
    detail: user.premium_since || user.nitro_since ? `Subscriber since ${user.premium_since || user.nitro_since}` : 'Premium subscription'
  };
}

function getCollectibleNameplate(user) {
  const nameplate = user.collectibles && user.collectibles.nameplate;
  if (!nameplate || typeof nameplate !== 'object') return null;
  return {
    code: 'PLATE',
    name: nameplate.label || 'Collectible Nameplate',
    skuId: nameplate.sku_id || '',
    src: nameplate.asset ? `https://cdn.discordapp.com/assets/collectibles/nameplates/${nameplate.asset}.png?size=64` : ''
  };
}

function getGuildIcon(guild) {
  if (guild.icon) return cdnAsset('icons', guild.id, guild.icon, 512);
  const letter = (guild.name || '?').trim().charAt(0).toUpperCase() || '#';
  return {
    fallback: true,
    letter,
    gradient: fallbackGradient(guild.id)
  };
}

function getGuildBanner(guild) {
  if (guild.banner) return cdnAsset('banners', guild.id, guild.banner, 1024);
  if (guild.discovery_splash) return cdnAsset('discovery-splashes', guild.id, guild.discovery_splash, 1024, false);
  if (guild.splash) return cdnAsset('splashes', guild.id, guild.splash, 1024, false);
  const colorSource = guild.banner_color != null && guild.banner_color !== '' ? guild.banner_color : guild.accent_color;
  const color = normalizeApiColor(colorSource);
  if (color) {
    return {
      static: color,
      animated: '',
      original: '',
      isAnimated: false,
      isColor: true
    };
  }
  return {
    static: fallbackGradient(guild.id),
    animated: '',
    original: '',
    isAnimated: false
  };
}

function bannerStyle(asset) {
  if (!asset || !asset.static) return '';
  if (asset.static.startsWith('#') || asset.static.startsWith('linear-gradient')) {
    return `background:${escapeAttr(asset.static)}`;
  }
  return `background-image:url('${escapeAttr(asset.static)}')`;
}

function renderBadge(badge) {
  const src = badge.src || (badge.hash ? badgeIconUrl(badge.hash) : '');
  const fallback = badge.fallback ? ` data-fallback="${escapeAttr(badge.fallback)}"` : '';
  const icon = src
    ? `<img class="badge-img" src="${escapeAttr(src)}" alt="" loading="lazy" draggable="false"${fallback}>`
    : `<span class="badge-fallback" aria-hidden="true">${escapeHTML(badge.code.slice(0, 4))}</span>`;
  const detail = badge.detail ? `<span class="badge-detail">${escapeHTML(badge.detail)}</span>` : '';
  const kind = badge.kind ? ` badge--${String(badge.kind).replace(/[^a-z0-9_-]/gi, '')}` : '';
  const title = badge.detail ? `${badge.name} — ${badge.detail}` : badge.name;
  return `
    <span class="badge${kind}" role="img" aria-label="${escapeAttr(title)}" tabindex="0">
      <span class="badge-icon">${icon}</span>
      <span class="badge-copy">
        <span class="badge-label">${escapeHTML(badge.name)}</span>
        ${detail}
      </span>
    </span>
  `;
}

function forwardedBadgeName(id, fallback = '') {
  const normalized = String(id || '').toLowerCase();
  if (normalized === 'premium' || normalized.includes('nitro')) return 'Discord Nitro';
  if (normalized.startsWith('guild_booster')) return 'Server Booster';
  if (normalized === 'legacy_username') return 'Originally known as';
  if (normalized === 'quest_completed') return 'Quest completed';
  if (fallback) return fallback;
  return formatFeatureName(normalized || 'profile badge');
}

function isNitroBadgeSignal(value) {
  const normalized = String(value || '').toLowerCase();
  if (/early[^a-z0-9]*(?:nitro[^a-z0-9]*)?supporter/.test(normalized)) return false;
  return /nitro|premium/.test(normalized);
}

function normalizeIncomingBadge(raw, index) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const kind = isNitroBadgeSignal(raw) ? 'nitro' : 'forwarded';
    return {
      id: raw,
      code: raw.slice(0, 6).toUpperCase(),
      name: forwardedBadgeName(raw),
      hash: kind === 'nitro' ? NITRO_BADGE.hash : '',
      kind
    };
  }
  if (typeof raw !== 'object') return null;
  const id = raw.id || raw.badge || raw.code || `profile-badge-${index + 1}`;
  const fallbackName = raw.name || raw.label || '';
  const name = forwardedBadgeName(id, fallbackName || raw.description || `Profile Badge ${index + 1}`);
  const description = raw.description && raw.description !== name ? raw.description : '';
  const icon = raw.icon_url || raw.image_url || raw.url || raw.src || raw.icon || raw.icon_hash || '';
  const iconValue = typeof icon === 'string' ? icon.trim() : '';
  const src = /^https?:\/\//i.test(iconValue)
    ? iconValue
    : /^[a-f0-9]{32}(?:\.png)?$/i.test(iconValue) ? badgeIconUrl(iconValue) : '';
  const kind = isNitroBadgeSignal(`${id} ${name}`) ? 'nitro' : 'forwarded';
  return {
    id: String(id),
    code: String(raw.code || id || name).slice(0, 6).toUpperCase(),
    name,
    detail: description,
    src: src || (kind === 'nitro' ? badgeIconUrl(NITRO_BADGE.hash) : ''),
    kind
  };
}

function renderForwardedBadges(user) {
  if (!user) return [];
  const extras = [];
  const arrays = [user.badges, user.profile_badges, user.profileBadges].filter(Array.isArray);
  arrays.forEach(list => {
    list.forEach((badge, index) => {
      const normalized = normalizeIncomingBadge(badge, index);
      if (normalized) extras.push(normalized);
    });
  });

  return extras;
}

function getPremiumSummary(user) {
  const explicit = getNitroBadge(user);
  if (explicit) return explicit.name;
  const forwarded = renderForwardedBadges(user).find(badge => badgeDedupeKey(badge) === 'nitro');
  if (forwarded) return forwarded.name;
  return formatPremiumType(user?.premium_type);
}

function badgeDedupeKey(badge) {
  const source = `${badge.id || ''} ${badge.code || ''} ${badge.name || ''}`.toLowerCase();
  if (/early[^a-z0-9]*(?:nitro[^a-z0-9]*)?supporter/.test(source)) return 'early-supporter';
  if (isNitroBadgeSignal(source)) return 'nitro';
  if (/active[^a-z0-9]*developer/.test(source)) return 'active-developer';
  const name = String(badge.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return name || source.replace(/[^a-z0-9]/g, '') || badge.src || 'profile-badge';
}

function dedupeBadges(badges) {
  const seen = new Set();
  return badges.filter(badge => {
    if (!badge) return false;
    const key = badgeDedupeKey(badge);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderBadges(flags, user, guildDetails = null) {
  const bitset = toBigIntFlag(flags);
  const badges = BADGES
    .filter(badge => (bitset & badge.bit) === badge.bit)
    .map(badge => ({ ...badge, id: badge.code.toLowerCase(), kind: 'public' }));
  const forwardedBadges = renderForwardedBadges(user);
  const accountBadges = [
    getPrimaryGuildBadge(user, guildDetails),
    getNitroBadge(user),
    user?.bot ? { id: 'bot-account', code: 'BOT', name: 'Bot account', kind: 'account' } : null,
    user?.system ? { id: 'system-account', code: 'SYS', name: 'Discord system user', kind: 'account' } : null
  ];
  const allBadges = dedupeBadges([...accountBadges, ...badges, ...forwardedBadges]);

  if (!allBadges.length) {
    return '<span class="muted-text">No public badges returned</span>';
  }
  return allBadges.map(renderBadge).join('');
}

function renderActions(actions) {
  const visibleActions = actions.filter(Boolean);
  if (!visibleActions.length) return '';
  return `
    <div class="action-row">
      ${visibleActions.map(action => {
        if (action.href) {
          return `<a class="action-btn" href="${escapeAttr(action.href)}" target="_blank" rel="noopener">${escapeHTML(action.label)}</a>`;
        }
        const data = action.copy ? ` data-copy="${escapeAttr(action.copy)}"` : '';
        const actionName = action.action ? ` data-action="${escapeAttr(action.action)}"` : '';
        return `<button type="button" class="action-btn"${actionName}${data}>${escapeHTML(action.label)}</button>`;
      }).join('')}
    </div>
  `;
}

function renderMetric(label, value, extraClass = '') {
  return `
    <div class="metric ${extraClass}">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value)}</strong>
    </div>
  `;
}

function renderMeta(label, value, copy = '') {
  const copyAttr = copy ? ` data-action="copy" data-copy="${escapeAttr(copy)}"` : '';
  const asButton = Boolean(copy);
  const color = label === 'Accent color' ? normalizeApiColor(value) : '';
  const colorClass = color ? ' meta-cell--accent' : '';
  const colorStyle = color ? ` style="--shown-accent:${escapeAttr(color)}"` : '';
  const swatch = color ? '<span class="color-swatch" aria-hidden="true"></span>' : '';
  const inner = `<span class="meta-label">${escapeHTML(label)}</span><span class="meta-value">${swatch}${escapeHTML(value)}</span>`;
  return asButton
    ? `<button type="button" class="meta-cell copyable${colorClass}" title="Click to copy ${escapeAttr(label)}"${colorStyle}${copyAttr}>${inner}</button>`
    : `<div class="meta-cell${colorClass}"${colorStyle}>${inner}</div>`;
}

function renderOwnerMeta(ownerId) {
  if (!ownerId) return renderMeta('Owner ID', 'Not returned');
  return `
    <div class="meta-cell meta-cell--split">
      <button type="button" class="meta-copy owner-copy copyable" title="Click to copy Owner ID"
        data-action="copy" data-copy="${escapeAttr(ownerId)}">
        <span class="meta-label">Owner ID</span>
        <span class="meta-value">${escapeHTML(ownerId)}</span>
      </button>
      <div class="meta-actions">
        <button type="button" class="mini-btn mini-btn--primary" data-action="search-user" data-user-id="${escapeAttr(ownerId)}">Search</button>
      </div>
    </div>
  `;
}

function renderApiField(label, value, copy = '') {
  const inner = `
      <span class="api-field-copy">
        <span class="meta-label">${escapeHTML(label)}</span>
        <span class="meta-value">${escapeHTML(value)}</span>
      </span>`;
  return copy
    ? `<button type="button" class="api-field copyable" title="Click to copy ${escapeAttr(label)}" data-action="copy" data-copy="${escapeAttr(copy)}">${inner}</button>`
    : `<div class="api-field">${inner}</div>`;
}

function renderUserApiDetails(user, guildDetails = null) {
  const decoration = user.avatar_decoration_data;
  const nameplate = getCollectibleNameplate(user);
  const primaryGuild = getPrimaryGuildBadge(user, guildDetails);
  const collectibleKeys = user.collectibles && typeof user.collectibles === 'object'
    ? Object.keys(user.collectibles)
    : [];
  const lines = [
    renderApiField('Nitro / premium type', getPremiumSummary(user)),
    renderApiField('Profile banner', user.banner ? 'Returned by API' : 'Not returned'),
    renderApiField('Accent color', formatHexColor(user.accent_color) || 'Not returned', formatHexColor(user.accent_color)),
    renderApiField('Avatar decoration', decoration ? `SKU ${decoration.sku_id || 'unknown'}` : 'Not returned', decoration?.asset || ''),
    renderApiField('Nameplate', nameplate ? `${nameplate.name || 'Nameplate'}${nameplate.skuId ? ` - SKU ${nameplate.skuId}` : ''}` : 'Not returned', nameplate?.skuId || ''),
    renderApiField('Collectibles', collectibleKeys.length ? collectibleKeys.join(', ') : 'Not returned'),
    renderApiField('Primary server tag', primaryGuild ? `${primaryGuild.tag} — ${guildDetails?.name || primaryGuild.guildId}` : 'Not returned', primaryGuild?.tag || ''),
    renderApiField('Forwarded badge arrays', renderForwardedBadges(user).length ? `${renderForwardedBadges(user).length} badge entries` : 'Not returned')
  ];

  return `
    <section class="api-details" aria-label="API profile fields">
      <div class="section-title-row">
        <h3>API profile fields</h3>
        <span>not badges</span>
      </div>
      <div class="api-grid">${lines.join('')}</div>
    </section>
  `;
}

function renderRawBlock(data) {
  const json = JSON.stringify(data, null, 2);
  return `
    <details class="raw-block">
      <summary>
        <span>Raw JSON</span>
        <span class="chevron" aria-hidden="true"></span>
      </summary>
      <pre class="copyable raw-copy" role="button" tabindex="0" title="Click to copy raw JSON"
        data-action="copy" data-copy="${escapeAttr(json)}">${escapeHTML(json)}</pre>
    </details>
  `;
}

function renderUserCard(user, guildDetails = null) {
  const avatar = getUserAvatar(user);
  const banner = getUserBanner(user);
  const decoration = getAvatarDecoration(user);
  const created = snowflakeToDate(user.id);
  const displayName = user.global_name || user.username || 'Unknown user';
  const tag = user.discriminator && user.discriminator !== '0' ? `${user.username}#${user.discriminator}` : `@${user.username}`;
  const accent = normalizeApiColor(user.accent_color);
  const flags = user.public_flags ?? user.flags ?? 0;
  const actions = [
    avatar.original && { label: 'Open avatar', href: avatar.original },
    banner.original && { label: 'Open banner', href: banner.original }
  ];

  return `
    <article class="profile-card"${profileAccentStyle(accent)}>
      <div class="media-banner" style="${bannerStyle(banner)}"
        ${banner.animated ? `data-static-url="${escapeAttr(banner.static)}" data-animated-url="${escapeAttr(banner.animated)}"` : ''}></div>
      <div class="identity-block">
        <div class="avatar-wrap avatar-wrap--interactive" role="button" tabindex="0" aria-label="Surprise ${escapeAttr(displayName)}'s profile picture">
          <img class="avatar-img" src="${escapeAttr(avatar.static)}" alt="Avatar of ${escapeAttr(displayName)}" draggable="false"
            ${avatar.animated ? `data-static-url="${escapeAttr(avatar.static)}" data-animated-url="${escapeAttr(avatar.animated)}"` : ''}>
          ${decoration ? `<img class="avatar-decoration" src="${escapeAttr(decoration)}" alt="" loading="lazy" draggable="false">` : ''}
        </div>
        <div class="identity-copy">
          <h2>${escapeHTML(displayName)}</h2>
          <p>${escapeHTML(tag)}</p>
          <div class="badge-strip" aria-label="Profile badges">${renderBadges(flags, user, guildDetails)}</div>
        </div>
      </div>

      <div class="metrics-grid">
        ${renderMetric('Created', formatDate(created))}
        ${renderMetric('Account age', snowflakeAge(user.id))}
        ${renderMetric('Public flags', String(flags))}
        ${renderMetric('Nitro', getPremiumSummary(user))}
      </div>

      <div class="meta-grid">
        ${renderMeta('User ID', user.id, user.id)}
        ${renderMeta('Bot account', user.bot ? 'Yes' : 'No')}
        ${renderMeta('System user', user.system ? 'Yes' : 'No')}
        ${renderMeta('Accent color', accent || 'Not set', accent)}
        ${renderMeta('Locale', user.locale || 'Not returned')}
        ${renderMeta('API version', `Discord REST v${DISCORD_API_VERSION}`)}
      </div>

      ${renderUserApiDetails(user, guildDetails)}

      ${renderActions(actions)}
      ${renderRawBlock(user)}
    </article>
  `;
}

function featureDescription(feature) {
  return FEATURE_DESCRIPTIONS[feature] || `Discord returned the raw guild feature flag "${feature}". It represents a capability, rollout, experiment, or legacy entitlement on this guild, but Discord does not publish a stable plain-language description for this exact flag in the public docs.`;
}

function renderFeaturePill(feature, active = false) {
  const label = formatFeatureName(feature);
  const description = featureDescription(feature);
  return `
    <button type="button" class="feature-pill${active ? ' is-active' : ''}" data-action="feature-detail"
      data-feature="${escapeAttr(feature)}"
      data-feature-label="${escapeAttr(label)}"
      data-feature-description="${escapeAttr(description)}">
      ${escapeHTML(label)}
    </button>
  `;
}

function renderGuildCard(guild) {
  const icon = getGuildIcon(guild);
  const banner = getGuildBanner(guild);
  const accentSource = guild.banner_color != null && guild.banner_color !== '' ? guild.banner_color : guild.accent_color;
  const accent = normalizeApiColor(accentSource);
  const created = snowflakeToDate(guild.id);
  const features = Array.isArray(guild.features) ? guild.features.slice().sort() : [];
  const guildTag = getGuildTagBadge(guild);
  const hasGuildTags = features.includes('GUILD_TAGS');
  const guildTagDisplay = guildTag || (hasGuildTags ? {
    code: 'TAG',
    name: 'Tags enabled',
    detail: 'Tag value not returned by Discord',
    kind: 'server-capability'
  } : null);
  const firstFeature = features[0] || '';
  const vanity = guild.vanity_url_code ? `https://discord.gg/${guild.vanity_url_code}` : '';
  const iconMarkup = icon.fallback
    ? `<div class="avatar-img avatar-fallback" style="background:${escapeAttr(icon.gradient)}">${escapeHTML(icon.letter)}</div>`
    : `<img class="avatar-img" src="${escapeAttr(icon.static)}" alt="Icon of ${escapeAttr(guild.name || 'guild')}" draggable="false"
        ${icon.animated ? `data-static-url="${escapeAttr(icon.static)}" data-animated-url="${escapeAttr(icon.animated)}"` : ''}>`;
  const actions = [
    !icon.fallback && icon.original && { label: 'Open icon', href: icon.original },
    banner.original && { label: 'Open banner', href: banner.original },
    vanity && { label: 'Open vanity', href: vanity },
    { label: 'Invite bot', href: BOT_INVITE_URL }
  ];

  return `
    <article class="profile-card guild-profile"${profileAccentStyle(accent)}>
      <div class="media-banner" style="${bannerStyle(banner)}"
        ${banner.animated ? `data-static-url="${escapeAttr(banner.static)}" data-animated-url="${escapeAttr(banner.animated)}"` : ''}></div>
      <div class="identity-block">
        <div class="avatar-wrap">${iconMarkup}</div>
        <div class="identity-copy">
          <h2>${escapeHTML(guild.name || 'Unknown guild')}</h2>
          <p>${escapeHTML(guild.description || 'No public description returned')}</p>
          ${guildTagDisplay ? `<div class="badge-strip guild-tag-strip" aria-label="Guild tag">${renderBadge(guildTagDisplay)}</div>` : ''}
        </div>
      </div>

      <div class="metrics-grid">
        ${renderMetric('Members', formatNumber(guild.approximate_member_count))}
        ${renderMetric('Online', formatNumber(guild.approximate_presence_count))}
        ${renderMetric('Boosts', formatNumber(guild.premium_subscription_count))}
        ${renderMetric('Boost tier', formatBoostTier(guild.premium_tier))}
      </div>

      <div class="meta-grid">
        ${renderMeta('Guild ID', guild.id, guild.id)}
        ${renderOwnerMeta(guild.owner_id)}
        ${renderMeta('Server tag', guildTag?.tag || (hasGuildTags ? 'Enabled - value not returned' : 'Not enabled'), guildTag?.tag || '')}
        ${renderMeta('Locale', formatLocale(guild.preferred_locale))}
        ${renderMeta('Verification', formatVerificationLevel(guild.verification_level))}
        ${renderMeta('2FA requirement', guild.mfa_level === 1 ? 'Required' : 'Not required')}
        ${renderMeta('Content filter', formatExplicitFilter(guild.explicit_content_filter))}
        ${renderMeta('Notifications', formatNotificationLevel(guild.default_message_notifications))}
        ${renderMeta('NSFW level', formatNSFWLevel(guild.nsfw_level))}
        ${renderMeta('Max members', formatNumber(guild.max_members))}
        ${renderMeta('Created', formatDate(created))}
      </div>

      <section class="feature-section" aria-label="Guild feature flags">
        <div class="section-title-row">
          <h3>Guild features</h3>
          <span>${features.length} returned</span>
        </div>
        ${features.length
          ? `<div class="feature-grid">${features.map((feature, index) => renderFeaturePill(feature, index === 0)).join('')}</div>
             <div class="feature-detail" id="featureDetail"><strong>${escapeHTML(formatFeatureName(firstFeature))}</strong><span>${escapeHTML(featureDescription(firstFeature))}</span></div>`
          : '<div class="note-box">No public guild features returned.</div>'}
      </section>

      ${renderActions(actions)}
      ${renderRawBlock(guild)}
    </article>
  `;
}

function loadingCard() {
  return `
    <div class="loading-card" aria-label="Loading">
      <div class="skeleton banner-skeleton"></div>
      <div class="skeleton avatar-skeleton"></div>
      <div class="skeleton line-skeleton wide"></div>
      <div class="skeleton line-skeleton"></div>
      <div class="skeleton-grid">
        <div class="skeleton metric-skeleton"></div>
        <div class="skeleton metric-skeleton"></div>
        <div class="skeleton metric-skeleton"></div>
      </div>
    </div>
  `;
}

function emptyCard(mode = state.mode) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.user;
  return `
    <div class="empty-state">
      <span class="empty-glyph" aria-hidden="true">${mode === 'guild' ? 'G' : 'ID'}</span>
      <h2>${escapeHTML(config.emptyTitle)}</h2>
      <p>${escapeHTML(config.emptyText)}</p>
    </div>
  `;
}

function renderError(error, mode = state.mode) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.user;
  const detail = parseErrorDetail(error);
  const title = error.status === 404 ? config.notFound
    : error.status === 429 ? 'Discord rate limit reached.'
    : error.status ? `HTTP ${error.status}` : 'Network error.';
  const guildInvite = mode === 'guild' && (detail.code === 10004 || detail.code === 50001);
  const retry = state.lastSearch ? '<button type="button" class="primary-btn compact" data-action="retry">Retry</button>' : '';
  const invite = guildInvite
    ? `<a class="primary-btn compact" href="${BOT_INVITE_URL}" target="_blank" rel="noopener">Invite bot</a>`
    : '';

  return `
    <div class="error-card">
      <span class="error-code">${escapeHTML(error.status || 'ERR')}</span>
      <h2>${escapeHTML(guildInvite ? 'The bot is not in that guild yet.' : title)}</h2>
      <p>${escapeHTML(detail.message || error.message || 'Request failed.')}</p>
      <div class="action-row centered">${invite}${retry}</div>
      ${error.body ? `
        <details class="raw-block" open>
          <summary><span>Response details</span><span class="chevron" aria-hidden="true"></span></summary>
          <pre>${escapeHTML(error.body)}</pre>
        </details>
      ` : ''}
    </div>
  `;
}

function setResult(html, className = '') {
  const card = $('#resultCard');
  if (!card) return;
  stopAvatarMotion();
  card.className = `panel result-panel ${className}`.trim();
  card.innerHTML = html;
  requestAnimationFrame(() => card.classList.add('is-ready'));
  wireResultMedia(card);
  wireAvatarMotion(card);
}

function setMode(mode, reset = true) {
  if (!MODE_CONFIG[mode]) return;
  state.mode = mode;
  $$('.mode-btn').forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.tabIndex = active ? 0 : -1;
  });
  const input = $('#searchId');
  const helper = $('#lookupHelper');
  if (input) {
    input.placeholder = MODE_CONFIG[mode].input;
    input.setAttribute('aria-label', MODE_CONFIG[mode].input);
  }
  if (helper) helper.textContent = MODE_CONFIG[mode].helper;
  if (reset) setResult(emptyCard(mode), 'empty');
  announce(`${MODE_CONFIG[mode].label} lookup selected`, 'ok');
}

function extractSnowflake(value) {
  const match = String(value || '').match(/\d{5,30}/);
  return match ? match[0] : '';
}

function validateSnowflake(id) {
  return /^\d{5,30}$/.test(id);
}

async function fetchDiscord(mode, id, signal) {
  const cacheKey = `${mode}:${id}:v${DISCORD_API_VERSION}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL_MS) return cached.data;

  const path = mode === 'guild' ? `guilds/${id}?with_counts=true` : `users/${id}`;
  const response = await fetch(`${API_BASE}/${path}`, { signal });
  const body = await response.text();
  let data = null;
  try {
    data = body ? JSON.parse(body) : null;
  } catch {}

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    error.body = body;
    error.data = data;
    error.retryAfter = response.headers.get('Retry-After') || response.headers.get('retry-after');
    throw error;
  }

  if (!data || typeof data !== 'object') {
    const error = new Error('Discord returned an empty or invalid JSON response.');
    error.body = body;
    throw error;
  }

  cache.set(cacheKey, { time: Date.now(), data });
  return data;
}

async function fetchPrimaryGuildDetails(user, signal) {
  const identity = getPrimaryGuildIdentity(user);
  if (!identity?.identity_enabled || !identity.identity_guild_id) return null;

  try {
    const guild = await fetchDiscord('guild', identity.identity_guild_id, signal);
    return {
      id: guild.id,
      name: guild.name || '',
      icon: guild.icon || ''
    };
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return null;
  }
}

function parseErrorDetail(error) {
  if (error && error.data && typeof error.data === 'object') {
    return {
      code: error.data.code,
      message: error.data.message || error.data.error || error.message
    };
  }
  if (error && error.body) {
    try {
      const parsed = JSON.parse(error.body);
      return {
        code: parsed.code,
        message: parsed.message || parsed.error || error.message
      };
    } catch {}
  }
  if (error && error.status === 429 && error.retryAfter) {
    return { message: `Retry after ${error.retryAfter} seconds.` };
  }
  return { message: error ? error.message : 'Unknown error.' };
}

async function runSearch() {
  const input = $('#searchId');
  if (!input) return;
  const id = extractSnowflake(input.value);
  const mode = state.mode;

  if (!validateSnowflake(id)) {
    setResult(renderError({ message: 'Enter a numeric Discord snowflake ID between 5 and 30 digits.' }, mode), 'error');
    announce('Invalid snowflake ID', 'err');
    return;
  }

  input.value = id;
  state.lastSearch = { mode, id };
  if (state.abortController) state.abortController.abort();
  state.abortController = new AbortController();
  const token = ++state.currentToken;
  setResult(loadingCard(), 'loading');
  announce(`Searching ${MODE_CONFIG[mode].label.toLowerCase()} ${id}`, 'info');

  try {
    const data = await fetchDiscord(mode, id, state.abortController.signal);
    if (token !== state.currentToken || mode !== state.mode) return;
    if (mode === 'user') rememberPrimaryGuildTag(data);
    const primaryGuildDetails = mode === 'user'
      ? await fetchPrimaryGuildDetails(data, state.abortController.signal)
      : null;
    if (token !== state.currentToken || mode !== state.mode) return;
    setResult(mode === 'guild' ? renderGuildCard(data) : renderUserCard(data, primaryGuildDetails), `${mode}-result`);
    announce(`${MODE_CONFIG[mode].label} loaded`, 'ok');
  } catch (error) {
    if (error.name === 'AbortError') return;
    if (token !== state.currentToken || mode !== state.mode) return;
    setResult(renderError(error, mode), 'error');
    announce(parseErrorDetail(error).message, error.status === 429 ? 'warn' : 'err');
  }
}

function retryLastSearch() {
  if (!state.lastSearch) return;
  setMode(state.lastSearch.mode, false);
  const input = $('#searchId');
  if (input) input.value = state.lastSearch.id;
  runSearch();
}

function clearInput() {
  const input = $('#searchId');
  if (input) {
    input.value = '';
    input.focus();
  }
  setResult(emptyCard(state.mode), 'empty');
  announce('Search cleared', 'info');
}

function useExample() {
  const input = $('#searchId');
  if (!input) return;
  input.value = EXAMPLES[state.mode];
  runSearch();
}

function flashCopied(target) {
  if (!target) return;
  target.classList.remove('is-copied');
  void target.offsetWidth;
  target.classList.add('is-copied');
  clearTimeout(target.copyFeedbackTimer);
  target.copyFeedbackTimer = setTimeout(() => target.classList.remove('is-copied'), 2000);
}

async function copyText(text, label = 'Copied', target = null) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    flashCopied(target);
    announce(label, 'ok');
    return true;
  } catch {}

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    const ok = document.execCommand('copy');
    textArea.remove();
    if (ok) flashCopied(target);
    announce(ok ? label : 'Copy failed', ok ? 'ok' : 'warn');
    return ok;
  } catch {
    announce('Copy failed', 'warn');
    return false;
  }
}

function wireResultMedia(root = document) {
  $$('[data-animated-url]', root).forEach(element => {
    if (element.dataset.mediaBound === '1') return;
    element.dataset.mediaBound = '1';
    const showAnimated = () => {
      if (element.tagName === 'IMG') element.src = element.dataset.animatedUrl;
      else element.style.backgroundImage = `url('${element.dataset.animatedUrl}')`;
    };
    const showStatic = () => {
      if (element.tagName === 'IMG') element.src = element.dataset.staticUrl;
      else element.style.backgroundImage = `url('${element.dataset.staticUrl}')`;
    };
    element.addEventListener('mouseenter', showAnimated);
    element.addEventListener('mouseleave', showStatic);
    element.addEventListener('focus', showAnimated);
    element.addEventListener('blur', showStatic);
  });

  $$('.badge-img', root).forEach(image => {
    if (image.dataset.fallbackBound === '1') return;
    image.dataset.fallbackBound = '1';
    image.addEventListener('error', () => {
      const fallback = image.dataset.fallback;
      if (fallback && image.src !== fallback) {
        image.src = fallback;
        return;
      }
      const icon = image.closest('.badge-icon');
      if (!icon) return;
      image.remove();
      icon.innerHTML = '<span class="badge-fallback" aria-hidden="true">BADGE</span>';
    });
  });
}

function clearAvatarMotionClasses(avatar) {
  if (!avatar) return;
  avatar.classList.remove('avatar-arrival', 'avatar-surprised', 'avatar-stress-1', 'avatar-stress-2', 'avatar-stress-3');
  avatar.style.removeProperty('--stress-x');
  avatar.style.removeProperty('--stress-y');
}

function stopAvatarMotion() {
  if (typeof state.avatarMotionCleanup === 'function') state.avatarMotionCleanup();
  state.avatarMotionCleanup = null;
}

function wireAvatarMotion(root = document) {
  const avatar = $('.avatar-wrap--interactive', root);
  if (!avatar || state.settings.reduceMotion || avatar.dataset.motionBound === '1') return;

  avatar.dataset.motionBound = '1';
  const canTrackPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let frame = 0;
  let pointerX = null;
  let pointerY = null;

  const removeStress = () => {
    avatar.classList.remove('avatar-stress-1', 'avatar-stress-2', 'avatar-stress-3');
    avatar.style.removeProperty('--stress-x');
    avatar.style.removeProperty('--stress-y');
  };

  const updateStress = () => {
    frame = 0;
    if (pointerX == null || pointerY == null || avatar.classList.contains('avatar-arrival') || avatar.classList.contains('avatar-surprised')) return;
    const rect = avatar.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = centerX - pointerX;
    const offsetY = centerY - pointerY;
    const distance = Math.hypot(offsetX, offsetY);
    const stage = distance <= 76 ? 3 : distance <= 145 ? 2 : distance <= 245 ? 1 : 0;

    avatar.classList.toggle('avatar-stress-1', stage === 1);
    avatar.classList.toggle('avatar-stress-2', stage === 2);
    avatar.classList.toggle('avatar-stress-3', stage === 3);
    if (!stage) {
      removeStress();
      return;
    }

    const safeDistance = Math.max(distance, 1);
    const retreat = stage * 1.35;
    avatar.style.setProperty('--stress-x', `${(offsetX / safeDistance * retreat).toFixed(2)}px`);
    avatar.style.setProperty('--stress-y', `${(offsetY / safeDistance * retreat).toFixed(2)}px`);
  };

  const queueStressUpdate = event => {
    if (!canTrackPointer || event.pointerType === 'touch') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!frame) frame = requestAnimationFrame(updateStress);
  };

  const resetPointer = () => {
    pointerX = null;
    pointerY = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    removeStress();
  };

  const surprise = () => {
    if (state.settings.reduceMotion) return;
    avatar.classList.remove('avatar-arrival', 'avatar-surprised');
    removeStress();
    void avatar.offsetWidth;
    avatar.classList.add('avatar-surprised');
  };

  const handleAvatarKey = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    surprise();
  };

  const handleAnimationEnd = event => {
    if (event.target !== avatar) return;
    if (event.animationName === 'avatarArrival') avatar.classList.remove('avatar-arrival');
    if (event.animationName === 'avatarSurprised') {
      avatar.classList.remove('avatar-surprised');
      if (pointerX != null && !frame) frame = requestAnimationFrame(updateStress);
    }
  };

  root.addEventListener('pointermove', queueStressUpdate);
  root.addEventListener('pointerleave', resetPointer);
  avatar.addEventListener('click', surprise);
  avatar.addEventListener('keydown', handleAvatarKey);
  avatar.addEventListener('animationend', handleAnimationEnd);
  requestAnimationFrame(() => {
    if (!state.settings.reduceMotion && avatar.isConnected) avatar.classList.add('avatar-arrival');
  });

  state.avatarMotionCleanup = () => {
    if (frame) cancelAnimationFrame(frame);
    root.removeEventListener('pointermove', queueStressUpdate);
    root.removeEventListener('pointerleave', resetPointer);
    avatar.removeEventListener('click', surprise);
    avatar.removeEventListener('keydown', handleAvatarKey);
    avatar.removeEventListener('animationend', handleAnimationEnd);
    delete avatar.dataset.motionBound;
    clearAvatarMotionClasses(avatar);
  };
}

function handleFeature(button) {
  const detail = $('#featureDetail');
  if (!detail) return;
  $$('.feature-pill').forEach(pill => pill.classList.toggle('is-active', pill === button));
  detail.innerHTML = `<strong>${escapeHTML(button.dataset.featureLabel || button.dataset.feature || 'Feature')}</strong><span>${escapeHTML(button.dataset.featureDescription || '')}</span>`;
  announce(`${button.dataset.featureLabel || 'Feature'} selected`, 'info');
}

function searchUserId(userId) {
  const id = extractSnowflake(userId);
  if (!validateSnowflake(id)) {
    announce('Owner ID is not searchable', 'warn');
    return;
  }
  setMode('user', false);
  const input = $('#searchId');
  if (input) input.value = id;
  runSearch();
}

function toggleHelp(force) {
  const panel = $('#helpPanel');
  const fab = $('#helpFab');
  if (!panel) return;
  const next = typeof force === 'boolean' ? force : panel.classList.contains('is-collapsed');
  panel.classList.toggle('is-collapsed', !next);
  document.body.classList.toggle('help-hidden', !next);
  panel.setAttribute('aria-hidden', next ? 'false' : 'true');
  if (fab) fab.setAttribute('aria-expanded', next ? 'true' : 'false');
  announce(next ? 'Help opened' : 'Help hidden', 'info');
}

function toggleSettings(force) {
  const panel = $('#settingsPanel');
  const fab = $('#settingsFab');
  if (!panel) return;
  const next = typeof force === 'boolean' ? force : panel.getAttribute('aria-hidden') === 'true';
  panel.classList.toggle('is-open', next);
  panel.setAttribute('aria-hidden', next ? 'false' : 'true');
  if (fab) fab.setAttribute('aria-expanded', next ? 'true' : 'false');
  if (next) panel.focus({ preventScroll: true });
}

function loadSettings() {
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem('discord-search-settings') || '{}') || {};
  } catch {
    stored = {};
  }
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  state.settings = {
    theme: stored.theme || (prefersLight ? 'light' : 'dark'),
    reduceMotion: stored.reduceMotion ?? prefersReduced,
    autoSearch: stored.autoSearch ?? true,
    badgeLabels: stored.version === SETTINGS_VERSION ? stored.badgeLabels ?? false : false
  };
  applySettings(false);
}

function saveSettings() {
  localStorage.setItem('discord-search-settings', JSON.stringify({ ...state.settings, version: SETTINGS_VERSION }));
}

function applySettings(persist = true) {
  document.documentElement.dataset.theme = state.settings.theme;
  document.documentElement.classList.toggle('reduced-motion', Boolean(state.settings.reduceMotion));
  document.documentElement.classList.toggle('badge-labels-off', !state.settings.badgeLabels);
  const themeToggle = $('#themeToggle');
  const reduceToggle = $('#reduceAnimToggle');
  const autoToggle = $('#autoSearchToggle');
  const badgeToggle = $('#badgeLabelToggle');
  if (themeToggle) themeToggle.checked = state.settings.theme === 'light';
  if (reduceToggle) reduceToggle.checked = Boolean(state.settings.reduceMotion);
  if (autoToggle) autoToggle.checked = Boolean(state.settings.autoSearch);
  if (badgeToggle) badgeToggle.checked = Boolean(state.settings.badgeLabels);
  if (state.settings.reduceMotion) {
    stopAvatarMotion();
  } else {
    wireAvatarMotion($('#resultCard'));
  }
  if (persist) saveSettings();
}

let statusTimer = null;
function announce(message, tone = 'info') {
  const live = $('#statusLive');
  if (!live) return;
  live.textContent = message;
  live.className = `status-live is-visible ${tone ? `status-${tone}` : ''}`;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    live.classList.remove('is-visible');
  }, 3200);
}

function bindEvents() {
  const form = $('#searchForm');
  const input = $('#searchId');

  form?.addEventListener('submit', event => {
    event.preventDefault();
    runSearch();
  });

  let autoTimer = null;
  input?.addEventListener('input', () => {
    if (!state.settings.autoSearch) return;
    clearTimeout(autoTimer);
    const id = extractSnowflake(input.value);
    if (id.length < 17) return;
    autoTimer = setTimeout(runSearch, 550);
  });

  $$('.mode-btn').forEach((button, index, buttons) => {
    button.addEventListener('click', () => setMode(button.dataset.mode));
    button.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const target = buttons[(index + direction + buttons.length) % buttons.length];
      target.focus();
      setMode(target.dataset.mode);
    });
  });

  document.addEventListener('click', event => {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    const action = actionTarget.dataset.action;
    if (action === 'copy') copyText(actionTarget.dataset.copy, 'Copied', actionTarget);
    if (action === 'clear-input') clearInput();
    if (action === 'use-example') useExample();
    if (action === 'retry') retryLastSearch();
    if (action === 'feature-detail') handleFeature(actionTarget);
    if (action === 'search-user') searchUserId(actionTarget.dataset.userId);
  });

  $('#helpFab')?.addEventListener('click', () => toggleHelp());
  $('#settingsFab')?.addEventListener('click', () => toggleSettings());
  $('#brandButton')?.addEventListener('click', () => {
    const mark = $('#brandMark');
    if (!mark) return;
    mark.classList.remove('logo-burst');
    void mark.offsetWidth;
    mark.classList.add('logo-burst');
    announce('Logo animation played', 'info');
  });

  $('#themeToggle')?.addEventListener('change', event => {
    state.settings.theme = event.target.checked ? 'light' : 'dark';
    applySettings();
    announce(`${state.settings.theme} theme`, 'ok');
  });
  $('#reduceAnimToggle')?.addEventListener('change', event => {
    state.settings.reduceMotion = event.target.checked;
    applySettings();
    announce(`Reduced motion ${state.settings.reduceMotion ? 'enabled' : 'disabled'}`, 'ok');
  });
  $('#autoSearchToggle')?.addEventListener('change', event => {
    state.settings.autoSearch = event.target.checked;
    applySettings();
    announce(`Auto search ${state.settings.autoSearch ? 'enabled' : 'disabled'}`, 'ok');
  });
  $('#badgeLabelToggle')?.addEventListener('change', event => {
    state.settings.badgeLabels = event.target.checked;
    applySettings();
    announce(`Badge labels ${state.settings.badgeLabels ? 'shown' : 'hidden'}`, 'ok');
  });

  document.addEventListener('keydown', event => {
    const target = event.target;
    const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
    const editing = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
    const keyboardCopyTarget = target?.closest?.('[data-action="copy"][role="button"]');

    if (keyboardCopyTarget === target && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      copyText(keyboardCopyTarget.dataset.copy, 'Copied', keyboardCopyTarget);
      return;
    }

    if (event.key === 'Escape') {
      toggleSettings(false);
      return;
    }

    if ((event.key === '/' || (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey))) && !editing) {
      event.preventDefault();
      input?.focus();
      input?.select();
      announce('Search focused', 'info');
      return;
    }

    if (editing || event.altKey || event.ctrlKey || event.metaKey) return;

    if (event.key.toLowerCase() === 't') {
      event.preventDefault();
      state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light';
      applySettings();
      announce(`${state.settings.theme} theme`, 'ok');
    }

    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      state.settings.reduceMotion = !state.settings.reduceMotion;
      applySettings();
      announce(`Reduced motion ${state.settings.reduceMotion ? 'enabled' : 'disabled'}`, 'ok');
    }

    if (event.key.toLowerCase() === 'h') {
      event.preventDefault();
      toggleHelp();
    }
  });

  document.addEventListener('pointerdown', event => {
    const panel = $('#settingsPanel');
    const fab = $('#settingsFab');
    if (!panel || panel.getAttribute('aria-hidden') === 'true') return;
    if (panel.contains(event.target) || fab?.contains(event.target)) return;
    toggleSettings(false);
  });
}

function init() {
  loadSettings();
  bindEvents();
  setMode('user', true);
}

document.addEventListener('DOMContentLoaded', init);
