import { useEffect, useState } from 'react';
import { MdDeleteOutline, MdDownload, MdInsertDriveFile, MdReceiptLong, MdUploadFile } from 'react-icons/md';
import api from '../../services/api';
import styles from './ReceiptPanel.module.css';
export default function ReceiptPanel({ entryId, canAttach, canEdit, canDelete }) {
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    api.get(`/entries/${entryId}/receipt`).then(response => { if (active) { setReceipt(response.data.receipt); setLoaded(true); } }).catch(() => { if (active) setError('Não foi possível consultar o comprovante.'); });
    return () => { active = false; };
  }, [entryId]);
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (file.size > 5 * 1024 * 1024) { setError('O arquivo deve ter até 5 MB.'); return; }
    setBusy(true); setError('');
    try { const data = new FormData(); data.append('receipt', file); const response = await api.post(`/entries/${entryId}/receipt`, data); setReceipt(response.data.receipt); }
    catch (failure) { setError(failure.response?.data?.error || 'Não foi possível anexar o comprovante.'); }
    finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setError('');
    try {
      const response = await api.get(`/entries/${entryId}/receipt/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data), link = document.createElement('a');
      link.href = url; link.download = `comprovante.${receipt.mimeType === 'application/pdf' ? 'pdf' : receipt.mimeType === 'image/png' ? 'png' : 'jpg'}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('Não foi possível baixar o comprovante.'); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm('Remover este comprovante?')) return;
    setBusy(true); setError('');
    try { await api.delete(`/entries/${entryId}/receipt`); setReceipt(null); }
    catch (failure) { setError(failure.response?.data?.error || 'Não foi possível remover o comprovante.'); }
    finally { setBusy(false); }
  }
  return <section className={styles.panel} aria-label="Comprovante">
    <header className={styles.header}>
      <span className={styles.headerIcon} aria-hidden="true"><MdReceiptLong /></span>
      <div>
        <h3>Comprovante</h3>
        <p>{receipt ? 'Arquivo anexado ao lançamento' : 'Nenhum comprovante anexado'}</p>
      </div>
    </header>

    {receipt && <div className={styles.fileCard}>
      <MdInsertDriveFile className={styles.fileIcon} aria-hidden="true" />
      <span className={styles.fileName}>{receipt.originalName}</span>
      <div className={styles.actions}>
        <button className={styles.downloadButton} type="button" disabled={busy} onClick={download} aria-label="Baixar comprovante"><MdDownload aria-hidden="true" /><span>Baixar</span></button>
        {canAttach && canDelete && <button className={styles.removeButton} type="button" disabled={busy} onClick={remove} aria-label="Remover comprovante"><MdDeleteOutline aria-hidden="true" /><span>Remover</span></button>}
      </div>
    </div>}

    {canAttach && loaded && (!receipt || canEdit) && <label className={styles.uploadArea}>
      <input className={styles.fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg" aria-label="Arquivo do comprovante" onChange={upload} disabled={busy} />
      <MdUploadFile aria-hidden="true" />
      <span>
        <strong>{receipt ? 'Substituir comprovante' : 'Selecionar comprovante'}</strong>
        <small>PDF, JPG ou PNG • até 5 MB</small>
      </span>
    </label>}

    {busy && <p className={styles.status} role="status">Processando comprovante...</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}
