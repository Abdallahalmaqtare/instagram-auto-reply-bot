const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FILE_PATH = path.join(DATA_DIR, 'settings.json');

const DEFAULTS = {
  botEnabled: true,

  replyMode: 'keyword_only', // 'keyword_only' | 'reply_all'
  defaultReply: 'شكراً لتواصلك معنا، سيتم الرد عليك قريباً 🌸',
  enableDefaultReply: false,

  keywordRules: [], // [{ keywords: ['السعر'], reply: '...', enabled: true }]

  delayMode: 'random', // 'random' | 'fixed'
  fixedDelaySeconds: 5,
  randomDelayMinSeconds: 3,
  randomDelayMaxSeconds: 5,

  onceEveryHours: 24,

  workingHoursEnabled: false,
  workingHoursStart: '09:00',
  workingHoursEnd: '22:00',
  timezone: 'Asia/Riyadh',
  outsideHoursReply: 'شكراً لرسالتك، نحن خارج أوقات العمل حالياً وسنرد عليك في أقرب وقت 🙏',
  sendOutsideHoursReply: false,

  whitelist: [],
  blacklist: []
};

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) {
    fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULTS, null, 2));
  }
}

function getSettings() {
  ensureFile();
  const raw = fs.readFileSync(FILE_PATH, 'utf8');
  return { ...DEFAULTS, ...JSON.parse(raw) };
}

function saveSettings(partialOrFull) {
  const merged = { ...getSettings(), ...partialOrFull };
  fs.writeFileSync(FILE_PATH, JSON.stringify(merged, null, 2));
  return merged;
}

module.exports = { getSettings, saveSettings };
