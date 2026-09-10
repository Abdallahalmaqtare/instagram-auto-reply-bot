const express = require('express');
const router = express.Router();
const basicAuth = require('basic-auth');
const { getSettings, saveSettings } = require('../config/settingsStore');

// حماية كل مسارات لوحة التحكم بـ Basic Auth
router.use((req, res, next) => {
  const credentials = basicAuth(req);
  if (
    !credentials ||
    credentials.name !== process.env.ADMIN_USERNAME ||
    credentials.pass !== process.env.ADMIN_PASSWORD
  ) {
    res.set('WWW-Authenticate', 'Basic realm="admin"');
    return res.status(401).send('Access denied');
  }
  next();
});

router.get('/settings', (req, res) => {
  res.json(getSettings());
});

router.put('/settings', (req, res) => {
  const updated = saveSettings(req.body);
  res.json(updated);
});

module.exports = router;
