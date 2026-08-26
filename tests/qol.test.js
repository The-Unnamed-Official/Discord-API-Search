const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'worker.js'), 'utf8');
const context = vm.createContext({
  console,
  document: { addEventListener() {} },
  setTimeout,
  clearTimeout,
  URL
});

vm.runInContext(source, context, { filename: 'script.js' });

function evaluate(expression, value) {
  context.testValue = value;
  return vm.runInContext(expression, context);
}

assert.equal(evaluate('extractSnowflake(testValue)', '<@611204110955446301>'), '611204110955446301');
assert.equal(evaluate('extractSnowflake(testValue)', 'https://discord.com/users/611204110955446301'), '611204110955446301');
assert.equal(evaluate('extractSnowflake(testValue)', '1234567890123456789012345678901'), '');
assert.equal(evaluate('validateSnowflake(testValue)', '611204110955446301'), true);
assert.equal(vm.runInContext('proximityStressIntensity(260)', context), 0);
assert.equal(vm.runInContext('proximityStressIntensity(54)', context), 1);
assert.equal(vm.runInContext('proximityStressIntensity(157)', context), 0.5);
assert.ok(vm.runInContext('proximityStressIntensity(100)', context) > vm.runInContext('proximityStressIntensity(200)', context));
assert.equal(vm.runInContext('cardRevealIntensity(240)', context), 0);
assert.equal(vm.runInContext('cardRevealIntensity(0)', context), 1);
context.testValue = {
  presence: {
    status: 'online',
    activities: [{ type: 2, name: 'Spotify', details: 'A song', state: 'An artist' }]
  }
};
const activityMarkup = vm.runInContext('renderUserActivity(testValue)', context);
assert.match(activityMarkup, /Listening to/);
assert.match(activityMarkup, /Spotify/);
assert.match(activityMarkup, /presence-status--online/);
context.testValue = {};
assert.match(vm.runInContext('renderUserActivity(testValue)', context), /Activity not available/);

context.testValue = {
  id: '611204110955446301',
  username: 'not.unnamed',
  avatar: 'a_6890abdb7cba278871a871f23a36d332',
  banner: 'a_777f31860f774ea2c751c76ac34ce05d',
  avatar_decoration_data: { asset: 'a_6849a20e97b279bd835ed5526597196e', sku_id: '1531406020851793950' },
  collectibles: {
    nameplate: { sku_id: '1506049874590699751', asset: 'nameplates/spray_doodles/1506049874590699751/', label: 'Neon graffiti' },
    profile_frame: {
      sku_id: '222222222222222222',
      title: 'Test Profile Frame',
      animation_url: 'https://cdn.discordapp.com/profile-frames/test-frame.webm',
      reduced_motion_url: 'https://cdn.discordapp.com/profile-frames/test-frame.png'
    }
  },
  profile_effect: {
    id: '111111111111111111',
    title: 'Test Profile Effect',
    animation_url: 'https://cdn.discordapp.com/profile-effects/test-effect.webm',
    thumbnail_preview_src: 'https://cdn.discordapp.com/profile-effects/test-effect.png'
  }
};
assert.equal(vm.runInContext('getProfileEffect(testValue).name', context), 'Test Profile Effect');
assert.equal(vm.runInContext('getProfileFrame(testValue).name', context), 'Test Profile Frame');
const cosmeticMarkup = vm.runInContext('renderUserCard(testValue)', context);
assert.match(cosmeticMarkup, /profile-effect-layer/);
assert.match(cosmeticMarkup, /profile-frame-layer/);
assert.match(cosmeticMarkup, /Test Profile Effect/);
assert.match(cosmeticMarkup, /Test Profile Frame/);
assert.match(cosmeticMarkup, /class="action-btn action-btn--share" data-action="share-lookup"/);
assert.match(cosmeticMarkup, /Avatar decoration[\s\S]*data-copy="1531406020851793950"/);
assert.doesNotMatch(cosmeticMarkup, /data-copy="a_6849a20e97b279bd835ed5526597196e"/);
assert.match(cosmeticMarkup, /data-animated-url="https:\/\/cdn\.discordapp\.com\/avatars\/611204110955446301\/a_6890abdb7cba278871a871f23a36d332\.webp/);
assert.match(cosmeticMarkup, /src="https:\/\/cdn\.discordapp\.com\/avatars\/611204110955446301\/a_6890abdb7cba278871a871f23a36d332\.webp\?size=512&amp;animated=true"/);

assert.match(html, /class="skip-link" href="#mainContent"/);
assert.match(html, /id="resultCard"[^>]+aria-busy="false"[^>]+tabindex="-1"/);
assert.match(html, /id="recentSearches"[^>]+hidden/);
assert.match(html, /id="settingsPanel"[^>]+aria-hidden="true" inert/);
assert.match(html, /id="captchaDialog"[^>]+aria-modal="true"/);
assert.match(html, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
assert.match(html, /property="og:image" content="https:\/\/discord-id-hub\.info\/resources\/discord-api-search-og\.png"/);
assert.match(source, /const APP_VERSION = 'v1\.2'/);
assert.match(source, /avatar-stress-adaptive/);
assert.match(source, /proximity-border-layer/);
assert.match(source, /PROXIMITY_SURFACE_SELECTOR/);
assert.match(source, /element\.closest\('\[hidden\], \[inert\], \[aria-hidden="true"\]'\)/);
assert.match(source, /element\.closest\('#helpPanel, #settingsPanel, #captchaDialog'\)/);
assert.doesNotMatch(vm.runInContext('PROXIMITY_SURFACE_SELECTOR', context), /help-item|help-link/);
assert.doesNotMatch(source, /\$\$\('body \*'\)/);
assert.match(css, /\.proximity-border-layer/);
assert.match(css, /\.profile-effect-layer/);
assert.match(css, /\.profile-frame-layer/);
assert.match(source, /syncAnimatedMedia/);
assert.doesNotMatch(source, /navigator\.share/);
assert.match(source, /await copyText\(window\.location\.href, 'Lookup link copied', target\)/);
assert.match(source, /await requireCaptchaBeforeSearch\(\)/);
assert.ok(source.indexOf('await requireCaptchaBeforeSearch()') < source.indexOf('const data = await fetchDiscord(mode, id'));
assert.match(source, /appearance: 'always'/);
assert.match(source, /card\.style\.setProperty\('--profile-accent-rgb', accent\)/);
assert.match(css, /\.action-btn--share\.is-copied::after/);
assert.match(css, /@keyframes copiedButtonPop/);
assert.match(css, /:root\[data-theme="light"\] \.identity-copy/);
assert.match(css, /--brand-2: #006eaa/);
assert.match(worker, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
assert.match(worker, /crypto\.subtle\.verify/);
assert.match(worker, /captcha_required: true/);
assert.match(worker, /X-Captcha-Session/);
assert.match(worker, /token\.length > 2048/);
assert.doesNotMatch(`${html}\n${source}`, /TURNSTILE_SECRET_KEY|CAPTCHA_SESSION_SECRET/);
assert.doesNotMatch(source, /distance <= 76|avatar-stress-3', stage/);
assert.doesNotMatch(`${html}\n${source}`, /v1\.(?:3|[4-9]|\d{2,})/);

console.log('Quality-of-life tests passed.');
