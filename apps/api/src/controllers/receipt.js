const { sequelize } = require('../models/database');
const { User } = require('../models/user');
const { Expense, getById } = require('../models/expense');
const { Receipt } = require('../models/receipt');
const storage = require('../utils/receipt-storage');
const { permissionsFor } = require('../middleware/permissions');
const { httpError } = require('../utils/errors');
const publicReceipt = receipt => receipt ? { id: receipt.id, originalName: receipt.originalName, mimeType: receipt.mimeType, size: receipt.size, createdAt: receipt.createdAt } : null;
module.exports = {
  async get(entryId, accountId) { await getById(entryId, accountId); return Receipt.findOne({ where: { entryId, userId: accountId } }); },
  async upload(entryId, accountId, user, file) {
    await getById(entryId, accountId);
    const prepared = await storage.prepare(file);
    await storage.write(prepared);
    let previous, previousStorageName, result;
    try {
      result = await sequelize.transaction(async transaction => {
        await User.findByPk(accountId, { transaction, lock: transaction.LOCK.UPDATE });
        const entry = await Expense.findOne({ where: { id: entryId, userId: accountId }, transaction, lock: transaction.LOCK.UPDATE });
        if (!entry) throw httpError(404, 'Lancamento nao encontrado.');
        previous = await Receipt.findOne({ where: { entryId }, transaction });
        previousStorageName = previous?.storageName;
        if (previous && !permissionsFor(user).includes('EDIT')) throw httpError(403, 'Substituir comprovante exige permissao de editar.');
        const used = Number(await Receipt.sum('size', { where: { userId: accountId }, transaction }) || 0);
        if (used - (previous?.size || 0) + prepared.size > 100 * 1024 * 1024) throw httpError(413, 'Limite de 100 MB de comprovantes desta conta atingido.');
        const values = { storageName: prepared.storageName, originalName: prepared.originalName, mimeType: prepared.mimeType, size: prepared.size };
        return previous ? previous.update(values, { transaction }) : Receipt.create({ ...values, entryId, userId: accountId }, { transaction });
      });
    } catch (error) { await storage.remove(prepared.storageName); throw error; }
    // O nome anterior e capturado antes de atualizar a instancia do ORM.
    if (previousStorageName) await storage.remove(previousStorageName);
    return publicReceipt(result);
  },
  async remove(entryId, accountId) {
    let name;
    await sequelize.transaction(async transaction => {
      await User.findByPk(accountId, { transaction, lock: transaction.LOCK.UPDATE });
      const entry = await Expense.findOne({ where: { id: entryId, userId: accountId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!entry) throw httpError(404, 'Lancamento nao encontrado.');
      const receipt = await Receipt.findOne({ where: { entryId, userId: accountId }, transaction });
      if (!receipt) throw httpError(404, 'Comprovante nao encontrado.');
      name = receipt.storageName;
      await receipt.destroy({ transaction });
    });
    await storage.remove(name);
  }, publicReceipt
};
