const controller = require('../controllers/user');
const config = require('../config/auth');
module.exports = {
  async create(req, res) {
    const { name, email, password } = req.body;
    const user = await controller.create(name, email, password);
    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  },
  async login(req, res) {
    const result = await controller.login(req.body.email, req.body.password, req.csrfToken);
    res.cookie(config.sessionCookie, result.token, { ...config.cookieOptions, maxAge: config.ttl * 1000 });
    res.json({ user: result.user });
  }
};
