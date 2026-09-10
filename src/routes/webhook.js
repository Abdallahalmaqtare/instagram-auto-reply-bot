const express = require('express');
const router = express.Router();
const { verifySignature } = require('../services/metaApi');
const { handleIncomingMessage } = require('../services/replyEngine');

// 1) التحقق من الـ Webhook عند إعداده أول مرة في لوحة Meta (GET)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.IG_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2) استقبال الرسائل الفعلية (POST)
router.post('/', async (req, res) => {
  // نرد فوراً بـ 200 حتى لا تعيد Meta إرسال نفس الحدث بسبب انتهاء المهلة
  res.sendStatus(200);

  const signature = req.headers['x-hub-signature-256'];
  if (!verifySignature(req.rawBody, signature)) {
    console.warn('⚠️ توقيع غير صالح - تم تجاهل الطلب');
    return;
  }

  try {
    const entries = req.body.entry || [];
    for (const entry of entries) {
      const messagingEvents = entry.messaging || [];
      for (const event of messagingEvents) {
        // نتجاهل الرسائل الصادرة منا نفسنا (echo) وأحداث القراءة/التسليم
        if (event.message && !event.message.is_echo && event.sender && event.sender.id) {
          const senderId = event.sender.id;
          const text = event.message.text || '';
          await handleIncomingMessage(senderId, text);
        }
      }
    }
  } catch (err) {
    console.error('❌ خطأ في معالجة الـ webhook:', err);
  }
});

module.exports = router;
