import { useContext, useState } from 'react';
import { AuthContext } from '../../contexts/auth-context';
import { currency } from '../../utils/format';
import styles from './Header.module.css';
import logoExpensesControl from '../../assets/images/logo-expenses-control.svg';
import logout from '../../assets/images/logout.svg';
function Header({ valorTotal }) {
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
    <img src={logoExpensesControl} alt="Expenses Control" />
    <div className={styles.totalValueContainer}>
      <div className={styles.logoutContainer}><button onClick={handleLogout} disabled={busy} title="Sair do sistema" className={styles.logoutButton}>
        <img src={logout} alt="" /><span className={styles.logoutText}>{busy ? 'Saindo...' : 'Sair'}</span>
      </button></div>
      {error && <p role="alert">{error}</p>}
      <div><p>Total Gasto</p><h2 className={styles.totalValue}>{currency(valorTotal)}</h2></div>
    </div>
  </header>;
}
export default Header;
