import { useEffect, useState } from 'react';
import { AuthContext } from './auth-context';
import api, { resetCsrf } from '../services/api';
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  useEffect(() => {
    let active = true;
    // Remocao dos dados da versao anterior; novas sessoes usam somente cookies HttpOnly.
    localStorage.removeItem('@ExpensesControl:token');
    localStorage.removeItem('@ExpensesControl:user');
    const expired = () => { setUser(null); setAuthError('Sua sessão terminou. Entre novamente.'); resetCsrf(); };
    window.addEventListener('expenses:unauthorized', expired);
    api.get('/auth/session').then(response => { if (active) setUser(response.data.user); })
      .catch(error => { if (active && error.response?.status !== 401) setAuthError('Não foi possível conectar ao servidor. Tente novamente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener('expenses:unauthorized', expired); };
  }, []);
  async function signIn(email, password) {
    const response = await api.post('/auth/login', { email, password });
    setUser(response.data.user); setAuthError('');
  }
  async function signOut() {
    await api.post('/auth/logout');
    setUser(null); setAuthError(''); resetCsrf();
  }
  return <AuthContext.Provider value={{ user, signed: !!user, loading, signIn, signOut, authError }}>{children}</AuthContext.Provider>;
}
