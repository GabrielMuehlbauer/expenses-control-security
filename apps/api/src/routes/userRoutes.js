const express = require('express');
const { rateLimit } = require('express-rate-limit');
const view = require('../views/user');
const { validate, credentials } = require('../middleware/validation');
const router = express.Router();
const limits = (limit, windowMs) => rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, skipSuccessfulRequests: true, message: { error: 'Muitas tentativas. Aguarde e tente novamente.' } });
router.post('/users', limits(20, 60 * 60 * 1000), validate(body => credentials(body, true)), view.create);
router.post('/auth/login', limits(5, 15 * 60 * 1000), validate(body => credentials(body, false)), view.login);
module.exports = router;
