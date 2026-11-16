const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { Op } = require('sequelize');
const UserModel = require('../models/user');
const { Session } = require('../models/session');
const config = require('../config/auth');
const { hash } = require('../middleware/csrf');
const { httpError } = require('../utils/errors');
const dummyHash = bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 12);
class UserController {
  async create(name, email, password) {
    if (await UserModel.getByEmail(email)) throw httpError(409, 'Nao foi possivel cadastrar com esses dados.');
    return UserModel.create(name, email, password);
  }
  async login(email, password, csrfToken) {
    const user = await UserModel.getByEmail(email);
    const valid = await bcrypt.compare(password, user?.password || dummyHash);
    if (!user || !valid) throw httpError(401, 'E-mail ou senha invalidos.');
    await Session.destroy({ where: { expiresAt: { [Op.lte]: new Date() } } });
    const session = await Session.create({ userId: user.id, csrfHash: hash(csrfToken), expiresAt: new Date(Date.now() + config.ttl * 1000) });
    const token = jwt.sign({}, config.jwt.secret, { algorithm: 'HS256', expiresIn: config.ttl, subject: user.id, jwtid: session.id, issuer: config.jwt.issuer, audience: config.jwt.audience });
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }
}
module.exports = new UserController();
