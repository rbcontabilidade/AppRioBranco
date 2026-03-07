import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { Button } from '../../components/ui/Button/Button';
import { LogIn } from 'lucide-react';
import { GlassInput } from '../../components/ui/GlassInput/GlassInput';
import { useDialog } from '../../contexts/DialogContext';

const Login = () => {
    const { signIn, user } = useAuth();
    const { showAlert } = useDialog();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            navigate('/', { replace: true });
        }
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();

        setLoading(true);
        setError('');

        console.log("Iniciando tentativa de login para funcionário:", username);

        try {
            const { data, error: signInError } = await signIn({
                username: username.trim(),
                password: password
            });

            if (signInError) {
                console.error("Erro de autenticação:", signInError);
                // Extrai a real mensagem de erro do objeto (veja AuthContext)
                const realMsg = signInError.message || "Usuário ou senha incorretos";

                setError(realMsg);
                setLoading(false);
                showAlert({
                    title: 'Acesso Negado',
                    message: realMsg,
                    variant: 'danger',
                    confirmText: 'Tentar Novamente'
                });
                return;
            }

            if (data?.user) {
                console.log("Login auth efetuado, aguardando perfil para redirecionamento automático...");
            }
        } catch (err) {
            console.error("Falha inesperada no login:", err);
            setError("Erro interno do sistema. O servidor pode estar offline.");
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            width: '100vw',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'var(--bg-base)',
            backgroundImage: 'var(--bg-gradient)',
            backgroundAttachment: 'fixed'
        }}>
            <GlassCard style={{ maxWidth: '440px', width: '100%', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        color: 'var(--primary-light)'
                    }}>
                        <LogIn size={32} />
                    </div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)', marginBottom: '8px' }}>Bem-vindo</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        RioBranco | Contabilidade Digital
                    </p>
                </div>

                {error && (
                    <div style={{
                        color: '#ef4444',
                        marginBottom: '20px',
                        padding: '12px 16px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        borderLeft: '4px solid #ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <GlassInput
                        id="username"
                        label="Usuário"
                        placeholder="Seu Id"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        icon="fa-solid fa-user"
                        required
                    />

                    <GlassInput
                        id="password"
                        label="Senha"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        icon="fa-solid fa-lock"
                        rightIcon={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}
                        onRightIconClick={() => setShowPassword(!showPassword)}
                        required
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                        <a href="#" style={{ color: 'var(--primary-light)', fontSize: '0.85rem', textDecoration: 'none' }}>
                            Esqueceu a senha?
                        </a>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        style={{
                            padding: '14px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                        }}
                        disabled={loading}
                    >
                        {loading ? 'Autenticando...' : 'Acessar Plataforma'}
                    </Button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Ainda não tem acesso? <span style={{ color: 'var(--primary-light)', cursor: 'pointer' }}>Contate o Admin</span>
                </div>
            </GlassCard>
        </div>
    );
};

export default Login;
