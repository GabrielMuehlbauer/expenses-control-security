const { parentPort, workerData } = require('node:worker_threads');
const { PDFDocument, PDFDict, PDFArray, PDFName } = require('pdf-lib');
const decodeName = name => name.asString().replace(/#([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/^\//, '');
const forbidden = new Set(['JavaScript', 'JS', 'OpenAction', 'AA', 'Launch', 'EmbeddedFiles', 'EmbeddedFile', 'AcroForm', 'XFA', 'RichMedia', 'SubmitForm', 'ImportData', 'Rendition', 'Movie', 'Sound', 'GoToR', 'URI']);
async function check() {
  const document = await PDFDocument.load(workerData, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true });
  if (document.getPageCount() > 100) throw new Error('PDF muito extenso.');
  const objects = document.context.enumerateIndirectObjects();
  if (objects.length > 20000) throw new Error('PDF muito complexo.');
  const queue = objects.map(([, object]) => object), seen = new Set();
  while (queue.length) {
    const value = queue.pop();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    if (seen.size > 100000) throw new Error('PDF muito complexo.');
    if (value instanceof PDFName && forbidden.has(decodeName(value))) throw new Error('Conteudo ativo nao permitido.');
    if (value instanceof PDFDict) {
      for (const [key, entry] of value.entries()) {
        if (forbidden.has(decodeName(key))) throw new Error('Conteudo ativo nao permitido.');
        queue.push(entry);
      }
    }
    if (value instanceof PDFArray) queue.push(...value.asArray());
  }
  parentPort.postMessage(true);
}
check().catch(() => parentPort.postMessage(false));
