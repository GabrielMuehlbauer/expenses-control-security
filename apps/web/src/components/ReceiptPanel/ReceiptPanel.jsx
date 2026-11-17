import { useEffect, useState } from 'react';
import api from '../../services/api';
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
  return <section style={{ margin: '20px 0', overflowWrap: 'anywhere' }} aria-label="Comprovante">
    <h3>Comprovante</h3>
    {receipt ? <><p>{receipt.originalName}</p><button type="button" disabled={busy} onClick={download}>Baixar comprovante</button>{canAttach && canDelete && <button type="button" disabled={busy} onClick={remove}>Remover comprovante</button>}</> : <p>Nenhum comprovante anexado.</p>}
    {canAttach && loaded && (!receipt || canEdit) && <label style={{ display: 'block', marginTop: '12px' }}>{receipt ? 'Substituir comprovante' : 'Anexar comprovante'}<input type="file" accept=".pdf,.png,.jpg,.jpeg" aria-label="Arquivo do comprovante" onChange={upload} disabled={busy} style={{ display: 'block', maxWidth: '100%' }} /></label>}
    {canAttach && <p>PDF, JPG ou PNG de até 5 MB.</p>}
    {busy && <p role="status">Processando comprovante...</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
