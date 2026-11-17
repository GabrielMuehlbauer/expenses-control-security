const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Worker } = require('node:worker_threads');
const sharp = require('sharp');
const { httpError } = require('./errors');
const LIMIT = 5 * 1024 * 1024;
const directory = path.resolve(process.env.RECEIPT_DIRECTORY || path.join(__dirname, process.env.NODE_ENV === 'test' ? '../../data/test-receipts' : '../../data/receipts'));
const webDirectory = path.resolve(__dirname, '../../../web');
if (directory === webDirectory || directory.startsWith(webDirectory + path.sep)) throw new Error('Comprovantes devem ficar fora do diretorio publico do frontend.');
function filePath(name) {
  if (!/^[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(name)) throw new Error('Nome de armazenamento invalido.');
  return path.join(directory, name);
}
function checkPdf(buffer) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'pdf-check.js'), { workerData: buffer, resourceLimits: { maxOldGenerationSizeMb: 64 } });
    const timer = setTimeout(() => { worker.terminate(); reject(httpError(400, 'PDF invalido ou muito complexo.')); }, 3000);
    worker.once('message', valid => { clearTimeout(timer); worker.terminate(); valid ? resolve() : reject(httpError(400, 'PDF invalido ou com conteudo ativo.')); });
    worker.once('error', () => { clearTimeout(timer); reject(httpError(400, 'PDF invalido ou muito complexo.')); });
    worker.once('exit', code => { if (code !== 0) { clearTimeout(timer); reject(httpError(400, 'PDF invalido.')); } });
  });
}
async function prepare(file) {
  if (!file || !file.buffer || file.size === 0 || file.size > LIMIT) throw httpError(400, 'Envie um comprovante PDF, JPG ou PNG de ate 5 MB.');
  const extension = path.extname(file.originalname).toLowerCase();
  const isPdf = /^%PDF-(1\.[0-7]|2\.0)/.test(file.buffer.subarray(0, 16).toString('ascii'));
  let data, mimeType, suffix;
  if (isPdf && extension === '.pdf' && file.mimetype === 'application/pdf') {
    if (!file.buffer.subarray(-1024).includes(Buffer.from('%%EOF'))) throw httpError(400, 'PDF invalido.');
    await checkPdf(file.buffer); data = file.buffer; mimeType = 'application/pdf'; suffix = 'pdf';
  } else {
    const png = file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = file.buffer[0] === 255 && file.buffer[1] === 216 && file.buffer[2] === 255;
    if (!(png && extension === '.png' && file.mimetype === 'image/png') && !(jpeg && ['.jpg', '.jpeg'].includes(extension) && file.mimetype === 'image/jpeg')) throw httpError(400, 'Formato nao permitido. Use PDF, JPG ou PNG validos.');
    try {
      const image = sharp(file.buffer, { limitInputPixels: 20000000, failOn: 'warning' }).rotate();
      data = png ? await image.png().toBuffer() : await image.jpeg({ quality: 85 }).toBuffer();
    } catch { throw httpError(400, 'Imagem invalida ou maior que 20 megapixels.'); }
    mimeType = png ? 'image/png' : 'image/jpeg'; suffix = png ? 'png' : 'jpg';
  }
  if (data.length > LIMIT) throw httpError(413, 'Comprovante excede 5 MB apos validacao.');
  return { data, mimeType, storageName: `${crypto.randomUUID()}.${suffix}`, originalName: path.basename(file.originalname).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 120) || `comprovante.${suffix}`, size: data.length };
}
async function write(file) { await fs.mkdir(directory, { recursive: true, mode: 0o700 }); await fs.writeFile(filePath(file.storageName), file.data, { flag: 'wx', mode: 0o600 }); }
async function remove(name) {
  try { await fs.unlink(filePath(name)); }
  catch (error) { if (error.code !== 'ENOENT') console.error(JSON.stringify({ event: 'receipt_cleanup_failed', type: error.code })); }
}
module.exports = { LIMIT, prepare, write, remove, filePath };
