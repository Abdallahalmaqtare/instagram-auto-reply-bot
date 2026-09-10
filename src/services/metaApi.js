const axios = require('axios');
const crypto = require('crypto');

const GRAPH_API_VERSION = 'v20.0';

/**
 * إرسال رسالة نصية إلى مستخدم عبر Instagram Messaging API
 * @param {string} recipientId - IGSID الخاص بالمستقبل
 * @param {string} text - نص الرسالة
 */
async function sendMessage(recipientId, text) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages`;
  const params = { access_token: process.env.IG_ACCESS_TOKEN };
  const body = {
    recipient: { id: recipientId },
    message: { text }
  };
  const response = await axios.post(url, body, { params });
  return response.data;
}

/**
 * التحقق من أن الطلب الوارد على الـ webhook فعلاً من Meta
 * عن طريق مقارنة توقيع X-Hub-Signature-256 مع تجزئة (HMAC) الجسم الخام باستخدام App Secret
 */
function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader || !process.env.IG_APP_SECRET) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.IG_APP_SECRET)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false; // أطوال مختلفة أو قيمة غير صالحة
  }
}

module.exports = { sendMessage, verifySignature };
