import { useContext, useState } from 'react';
import { AuthContext } from '../../contexts/auth-context';
import { currency } from '../../utils/format';
import { MdLogout } from 'react-icons/md';
import styles from './Header.module.css';
import logoExpensesControl from '../../assets/images/logo-expenses-control.svg';
function Header({ summary, showSummary = true }) {
  const { signOut } = useContext(AuthContext);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function handleLogout() {
    setBusy(true); setError('');
    try { await signOut(); }
    catch { setError('Não foi possível encerrar a sessão. Tente novamente.'); }
    finally { setBusy(false); }
  }
  return <header className={styles.headerContent}>
    <img className={styles.logo} src={logoExpensesControl} alt="Expenses Control" />
    {showSummary && <div className={styles.summary} aria-label="Resumo financeiro">
      <div><p>Recebido</p><h2>{currency(summary?.received)}</h2></div>
      <div><p>Pago</p><h2>{currency(summary?.paid)}</h2></div>
      <div><p>Saldo</p><h2>{currency(summary?.balance)}</h2></div>
    </div>}
    <div className={styles.logoutContainer}>
      <button onClick={handleLogout} disabled={busy} title="Sair do sistema" className={styles.logoutButton}>
        <MdLogout aria-hidden="true" /><span className={styles.logoutText}>{busy ? 'Saindo...' : 'Sair'}</span>
      </button>
      {error && <p className={styles.logoutError} role="alert">{error}</p>}
    </div>
  </header>;
}
export default Header;
