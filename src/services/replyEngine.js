const { getSettings } = require('../config/settingsStore');
const { sendMessage } = require('./metaApi');

/*
  تتبّع "آخر رد" لكل مستخدم يبقى في الذاكرة فقط (لا قاعدة بيانات).
  ميزته: بسيط ولا يحتاج أي استضافة إضافية.
  محدوديته: يُعاد تصفيره عند كل إعادة تشغيل لعملية الخادم (مثلاً بعد نشر تحديث جديد).
  هذا مقبول تماماً لغرض "لا يرد على نفس الشخص أكثر من مرة كل عدة ساعات".
*/
const lastRepliedAt = new Map();

function nowInTimezone(timezone) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(new Date()); // مثل "14:35"
}

function isWithinWorkingHours(settings) {
  if (!settings.workingHoursEnabled) return true;
  const current = nowInTimezone(settings.timezone);
  const [curH, curM] = current.split(':').map(Number);
  const [startH, startM] = settings.workingHoursStart.split(':').map(Number);
  const [endH, endM] = settings.workingHoursEnd.split(':').map(Number);

  const curMinutes = curH * 60 + curM;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return curMinutes >= startMinutes && curMinutes <= endMinutes;
  }
  return curMinutes >= startMinutes || curMinutes <= endMinutes; // نطاق يعبر منتصف الليل
}

function findMatchingRule(settings, textLower) {
  for (const rule of settings.keywordRules) {
    if (!rule.enabled) continue;
    for (const kw of rule.keywords) {
      if (kw && textLower.includes(kw)) return rule;
    }
  }
  return null;
}

function computeDelaySeconds(settings) {
  if (settings.delayMode === 'fixed') {
    return Math.max(0, settings.fixedDelaySeconds);
  }
  const min = Math.max(0, settings.randomDelayMinSeconds);
  const max = Math.max(min, settings.randomDelayMaxSeconds);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function scheduleReply(senderId, replyText, delaySeconds) {
  lastRepliedAt.set(senderId, Date.now());
  setTimeout(() => {
    sendMessage(senderId, replyText).catch(err => {
      console.error('❌ فشل إرسال الرد إلى', senderId, err.message);
    });
  }, delaySeconds * 1000);
}

/**
 * تُستدعى عند وصول رسالة جديدة من الـ webhook.
 */
async function handleIncomingMessage(senderId, text) {
  const settings = getSettings();
  const textLower = (text || '').toLowerCase();

  if (!settings.botEnabled) return;
  if (settings.blacklist.includes(senderId)) return;
  if (settings.whitelist.length > 0 && !settings.whitelist.includes(senderId)) return;

  if (settings.onceEveryHours > 0) {
    const last = lastRepliedAt.get(senderId);
    if (last) {
      const hoursSince = (Date.now() - last) / 3_600_000;
      if (hoursSince < settings.onceEveryHours) return;
    }
  }

  if (!isWithinWorkingHours(settings)) {
    if (settings.sendOutsideHoursReply) {
      scheduleReply(senderId, settings.outsideHoursReply, computeDelaySeconds(settings));
    }
    return;
  }

  const rule = findMatchingRule(settings, textLower);
  let replyText = null;

  if (rule) {
    replyText = rule.reply;
  } else if (settings.enableDefaultReply) {
    replyText = settings.defaultReply;
  }

  if (!replyText) return; // لا تطابق ولا رد افتراضي مفعّل

  scheduleReply(senderId, replyText, computeDelaySeconds(settings));
}

module.exports = { handleIncomingMessage };
