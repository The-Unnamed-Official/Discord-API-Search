const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const context = vm.createContext({
  console,
  document: { addEventListener() {} },
  setTimeout,
  clearTimeout,
  URL
});

vm.runInContext(source, context, { filename: 'script.js' });

function nitroStatus(user) {
  context.testUser = user;
  return vm.runInContext('getNitroStatus(testUser)', context);
}

assert.equal(nitroStatus({ premium_type: 2 }).confidence, 'confirmed');
assert.equal(nitroStatus({ premium_type: 2 }).summary, 'Discord Nitro');
assert.equal(nitroStatus({ badges: ['nitro'] }).confidence, 'confirmed');

const bannerStatus = nitroStatus({ banner: '777f31860f774ea2c751c76ac34ce05d' });
assert.equal(bannerStatus.detected, true);
assert.equal(bannerStatus.confidence, 'inferred');
assert.match(bannerStatus.detail, /custom profile banner/);
context.testUser = { banner: '777f31860f774ea2c751c76ac34ce05d' };
assert.equal(vm.runInContext('getNitroBadge(testUser).kind', context), 'nitro');
assert.equal(vm.runInContext('getPremiumSummary(testUser)', context), 'Likely Discord Nitro');

const animatedAvatarStatus = nitroStatus({ avatar: 'a_6890abdb7cba278871a871f23a36d332' });
assert.equal(animatedAvatarStatus.detected, true);
assert.equal(animatedAvatarStatus.confidence, 'inferred');
assert.match(animatedAvatarStatus.detail, /animated avatar/);

assert.equal(nitroStatus({ premium_type: 0 }).confidence, 'unknown');
assert.equal(nitroStatus({ avatar_decoration_data: { asset: 'a_hash' } }).confidence, 'unknown');
assert.equal(nitroStatus({ public_flags: 1 << 9 }).confidence, 'unknown');
assert.equal(nitroStatus({ badges: ['early_nitro_supporter'] }).confidence, 'unknown');

const noCosmeticsStatus = nitroStatus({
  id: '397241335050141698',
  avatar: '3c11e53ef04c471b37d3ed23014de9de',
  banner: null,
  premium_type: 0
});
assert.equal(noCosmeticsStatus.confidence, 'unknown');
assert.equal(noCosmeticsStatus.summary, 'Unknown (may still have Nitro)');
assert.match(noCosmeticsStatus.detail, /absence does not mean the user lacks Nitro/);

const botSignals = {
  bot: true,
  premium_type: 2,
  nitro: true,
  banner: 'custom_banner',
  avatar: 'a_animated_avatar',
  badges: ['nitro']
};
assert.equal(nitroStatus(botSignals).detected, false);
assert.equal(nitroStatus(botSignals).confidence, 'not-applicable');
assert.equal(nitroStatus(botSignals).summary, 'Not applicable (bot account)');
context.testUser = botSignals;
assert.equal(vm.runInContext('getNitroBadge(testUser)', context), null);
const renderedBotBadges = vm.runInContext('renderBadges(1 << 16, testUser)', context);
assert.doesNotMatch(renderedBotBadges, /badge--nitro|Discord Nitro/);
assert.match(renderedBotBadges, /badge-symbol--verified-bot/);
assert.match(renderedBotBadges, /badge-symbol--bot-account/);

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
assert.match(html, /Discord API Search v1\.2/);
assert.match(source, /guild: '\d{17,20}'/);
assert.match(css, /\.badge-symbol--verified-bot/);
assert.match(css, /\.badge-symbol--bot-account/);

console.log('Nitro detection tests passed.');
