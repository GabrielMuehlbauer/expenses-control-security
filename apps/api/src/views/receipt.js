const controller = require('../controllers/receipt');
const storage = require('../utils/receipt-storage');
const { httpError } = require('../utils/errors');
module.exports = {
  async get(req, res) { res.json({ receipt: controller.publicReceipt(await controller.get(req.params.id, req.accountId)) }); },
  async upload(req, res) { res.status(201).json({ receipt: await controller.upload(req.params.id, req.accountId, req.user, req.file) }); },
  async download(req, res, next) {
    const receipt = await controller.get(req.params.id, req.accountId);
    if (!receipt) throw httpError(404, 'Comprovante nao encontrado.');
    res.set('Content-Security-Policy', "default-src 'none'; sandbox");
    res.download(storage.filePath(receipt.storageName), `comprovante.${receipt.storageName.split('.').at(-1)}`, { dotfiles: 'allow' }, error => { if (error && !res.headersSent) next(httpError(404, 'Comprovante indisponivel.')); });
  },
  async remove(req, res) { await controller.remove(req.params.id, req.accountId); res.status(204).end(); }
};
