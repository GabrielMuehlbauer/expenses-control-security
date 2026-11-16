import { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import Input from '../../components/Input/Input';
import WideButton from '../../components/WideButton/WideButton';
import styles from './Login.module.css';

function Login() {
    const { signIn, authError } = useContext(AuthContext);
    const navigate = useNavigate();

    // Estados dos campos
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Requisitos de Interface: Estados de Controle
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Requisito: Validação de Formulário
    function validateForm() {
        if (!email.includes('@') || email.length < 5) {
            setError('Por favor, insira um e-mail válido.');
            return false;
        }
        if (password.length < 1) {
            setError('Informe sua senha.');
            return false;
        }
        return true;
    }

    async function handleLogin(e) {
        e.preventDefault();
        setError(''); // Limpa erros antigos antes de tentar de novo

        // Executa a validação antes de mandar para a API
        if (!validateForm()) return;

        setLoading(true); // Ativa o estado de Loading visual

        try {
            // Chama a função global de autenticação
            await signIn(email, password);

            navigate('/'); // Redireciona para o Dashboard após login bem-sucedido
        } catch (err) {
            // Requisito: Tratamento de Erro e Feedback Visual
            setError(err.response?.status === 429 ? 'Muitas tentativas. Aguarde alguns minutos.' : (err.response?.data?.error || 'Não foi possível conectar ao servidor.'));
        } finally {
            setLoading(false); // Desativa o Loading independente se deu certo ou errado
        }
    }

    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
                {/* Título com a identidade visual do projeto */}
                <h1 className={styles.logoTitle}>
                    Expenses <i>Control</i>
                </h1>
                <p className={styles.subtitle}>Gerencie suas finanças de forma simples e elegante</p>

                {/* Feedback Visual de Erros */}
                {(error || authError) && <div role="alert" className={styles.errorAlert}>{error || authError}</div>}

                <form onSubmit={handleLogin} className={styles.loginForm}>
                    <Input
                        label="E-mail"
                        type="email"
                        id="email"
                        placeholder="seuemail@exemplo.com" autoComplete="email" maxLength={254}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={loading}
                        required
                    />
                    <Input
                        label="Senha"
                        type="password"
                        id="password"
                        placeholder="Digite sua senha" autoComplete="current-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={loading}
                        required
                    />

                    {/* Requisito: Loading State no Botão */}
                    <WideButton
                        type="submit"
                        disabled={loading}
                        text={loading ? 'Carregando...' : 'Entrar'}
                    />

                    {/* Novo: Opção para Cadastrar */}
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                        <p style={{ color: '#888', fontSize: '0.9rem', fontFamily: 'var(--font-family-accent)' }}>
                            Ainda não tem conta?{' '}
                            <span
                                style={{ color: 'var(--yellowish-green)', cursor: 'pointer', fontWeight: 'bold' }}
                                onClick={() => navigate('/register')}
                            >
                                Cadastre-se aqui
                            </span>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;