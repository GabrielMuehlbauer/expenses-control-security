import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/auth-context';
import api from '../../services/api';
import Modal from '../Modal/Modal';
import Input from '../Input/Input';
import WideButton from '../WideButton/WideButton';
import { MdAccountBalanceWallet, MdFamilyRestroom } from 'react-icons/md';
import styles from './FamilyPanel.module.css';
const permissionLabels = { VIEW: 'Visualizar', CREATE: 'Criar lançamentos e categorias', EDIT: 'Editar', DELETE: 'Excluir', ATTACH: 'Anexar comprovantes' };
export default function FamilyPanel() {
  const { user, accountId, selectAccount } = useContext(AuthContext);
  const [children, setChildren] = useState([]);
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  useEffect(() => {
    if (user.parentId) return;
    let active = true;
    api.get('/children').then(response => { if (active) setChildren(response.data); }).catch(() => { if (active) setError('Não foi possível carregar as contas dos filhos.'); });
    return () => { active = false; };
  }, [user.parentId, version]);
  if (user.parentId) return null;
  async function createChild(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.post('/children', form); setForm({ name: '', email: '', password: '' }); setVersion(value => value + 1); }
    catch (failure) { setError(failure.response?.data?.error || 'Não foi possível criar a conta.'); }
    finally { setBusy(false); }
  }
  async function toggle(child, permission) {
    let permissions = child.permissions.includes(permission) ? child.permissions.filter(value => value !== permission) : [...child.permissions, permission];
    if (permission === 'VIEW' && !permissions.includes('VIEW')) permissions = [];
    setBusy(true); setError('');
    setChildren(values => values.map(value => value.id === child.id ? { ...value, permissions } : value));
    try {
      const response = await api.put(`/children/${child.id}/permissions`, { permissions });
      setChildren(values => values.map(value => value.id === child.id ? response.data : value));
    } catch (failure) { setChildren(values => values.map(value => value.id === child.id ? child : value)); setError(failure.response?.data?.error || 'Não foi possível atualizar as permissões.'); }
    finally { setBusy(false); }
  }
  return <section className={styles.panel} aria-label="Contas da família">
    <label className={styles.accountSelector}>
      <span className={styles.controlLabel}><MdAccountBalanceWallet aria-hidden="true" /><span>Conta</span></span>
      <select aria-label="Conta selecionada" value={accountId} onChange={event => selectAccount(event.target.value)}><option value="">Minha conta</option>{children.map(child => <option key={child.id} value={child.id}>{child.name}</option>)}</select>
    </label>
    <button className={styles.parentalButton} type="button" onClick={() => setOpen(true)} aria-label="Controle parental" title="Abrir controle parental"><MdFamilyRestroom aria-hidden="true" /><span>Família</span></button>
    {error && !open && <p role="alert">{error}</p>}
    <Modal isOpen={open} onClose={() => setOpen(false)}>
      <h2>Controle parental</h2><p>Os filhos acessam somente os próprios dados. O acesso inicial é apenas para visualizar.</p>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={createChild} className={styles.form}>
        <h3>Criar conta de filho</h3>
        <Input label="Nome do filho" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} minLength={3} maxLength={120} required />
        <Input label="E-mail do filho" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} maxLength={254} required />
        <Input label="Senha inicial do filho" type="password" autoComplete="new-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} minLength={12} required />
        <WideButton type="submit" text={busy ? 'Aguarde...' : 'Criar conta de filho'} disabled={busy} />
      </form>
      {children.map(child => <fieldset key={child.id} className={styles.permissions}><legend>{child.name}</legend><p>{child.email}</p>
        {Object.entries(permissionLabels).map(([permission, label]) => <label key={permission}><input type="checkbox" checked={child.permissions.includes(permission)} disabled={busy || (permission !== 'VIEW' && !child.permissions.includes('VIEW'))} onChange={() => toggle(child, permission)} />{label}</label>)}
      </fieldset>)}
    </Modal>
  </section>;
}
