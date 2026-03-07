import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Camera, Upload, AlertCircle } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput/GlassInput';
import { Button } from '../../components/ui/Button/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useDialog } from '../../contexts/DialogContext';

/**
 * Aba: Meu Perfil
 * Permite ao usuário editar o próprio nome, foto (avatar) e alterar a senha.
 */
const MyProfile = () => {
    const { user } = useAuth();
    const { showAlert } = useDialog();

    // Estado do Perfil
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Estado da Senha
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);

    // Ref para upload oculto
    const fileInputRef = useRef(null);

    // Carrega dados mais recentes da tabela public.profiles ao iniciar
    useEffect(() => {
        if (!user?.id) return;

        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) {
                setName(data.name || user.nome || '');
                setAvatarUrl(data.avatar_url || null);
            } else if (user.nome) {
                setName(user.nome);
            }
        };

        fetchProfile();
    }, [user]);

    // Lida com o Upload de Avatar
    const handleAvatarUpload = async (e) => {
        try {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];

            // Validar tamanho (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                showAlert({
                    title: 'Arquivo muito grande',
                    message: 'O tamanho maximo para a foto de perfil é 2MB.',
                    variant: 'danger'
                });
                return;
            }

            setLoadingProfile(true);

            // Criar nome único para o arquivo
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}-${Math.random()}.${fileExt}`;

            // 1. Upload pro bucket 'avatars' (certifique-se de que ele exista e permita public/auth)
            // Se o bucket não existir, este passo irá falhar. Confirme que ele foi criado no Supabase.
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Obter URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(publicUrl);

            // 3. Atualizar tabela profiles via onSubmit ou diretamente aqui
            // Optaremos por atualizar diretamente o avatar pelo upload
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            showAlert({
                title: 'Foto Atualizada',
                message: 'Sua foto de perfil foi alterada com sucesso.',
                variant: 'success'
            });

        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Erro de Upload',
                message: error.message || 'Falha ao enviar a imagem. O bucket "avatars" foi criado no painel?',
                variant: 'danger'
            });
        } finally {
            setLoadingProfile(false);
        }
    };

    // Lida com salvamento dos dados de Perfil (Nome apenas, já que o username/email é base)
    const handleSaveProfile = async () => {
        try {
            setLoadingProfile(true);
            const { error } = await supabase
                .from('profiles')
                .update({ name: name })
                .eq('id', user.id);

            if (error) throw error;

            // Atualiza localmente
            const storedUser = JSON.parse(localStorage.getItem('user'));
            storedUser.nome = name;
            localStorage.setItem('user', JSON.stringify(storedUser));

            // Atualiza o name do AuthContext caso ele se expusesse direto lá (ideal reload)
            showAlert({
                title: 'Perfil Salvo',
                message: 'Suas informações foram atualizadas com sucesso.',
                variant: 'success'
            });

        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Erro ao Salvar',
                message: 'Falha ao atualizar as informações.',
                variant: 'danger'
            });
        } finally {
            setLoadingProfile(false);
        }
    };

    // Lida com atualização de Senha via Auth do Supabase
    const handleUpdatePassword = async () => {
        if (!newPassword || !confirmPassword) {
            showAlert({ title: 'Atenção', message: 'Preencha os campos de senha.', variant: 'warning' });
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert({ title: 'Atenção', message: 'As senhas não coincidem.', variant: 'warning' });
            return;
        }

        try {
            setLoadingPassword(true);
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setNewPassword('');
            setConfirmPassword('');

            showAlert({
                title: 'Senha Atualizada',
                message: 'Sua senha foi alterada com sucesso.',
                variant: 'success'
            });

        } catch (error) {
            console.error(error);
            showAlert({
                title: 'Erro',
                message: error.message || 'Falha ao alterar a senha.',
                variant: 'danger'
            });
        } finally {
            setLoadingPassword(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Cabeçalho */}
            <div>
                <h2 style={{
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '4px',
                }}>
                    <User size={22} color="var(--primary-light)" />
                    Meu Perfil
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Gerencie suas informações pessoais, foto e segurança de acesso.
                </p>
            </div>

            {/* Grid 2 colunas para Info Pessoal e Senha */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px' }}>

                {/* 1. SEÇÃO PERFIL */}
                <GlassCard style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                        Informações Pessoais
                    </h3>

                    {/* Avatar Upload */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div
                            style={{
                                width: '90px',
                                height: '90px',
                                borderRadius: '50%',
                                background: avatarUrl ? `url(${avatarUrl}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2.5rem',
                                fontWeight: '700',
                                color: '#fff',
                                flexShrink: 0,
                                position: 'relative',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                border: '3px solid rgba(255,255,255,0.1)'
                            }}
                            onClick={() => fileInputRef.current?.click()}
                            title="Clique para alterar a foto"
                        >
                            {!avatarUrl && (name?.[0]?.toUpperCase() || 'U')}

                            {/* Overlay Hover */}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: loadingProfile ? 1 : 0,
                                transition: 'opacity 0.2s',
                                '&:hover': { opacity: 1 } // Simulando efeito via estilo (melhor com classes se precisasse ser puro CSS, mas reage ao loading)
                            }}>
                                {loadingProfile ? (
                                    <span style={{ fontSize: '0.8rem' }}>...</span>
                                ) : (
                                    <Camera size={24} color="#fff" />
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-main)' }}>Sua Foto</h4>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Clique na imagem para fazer upload. <br />JPG, PNG ou GIF. Max 2MB.
                            </p>
                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                ref={fileInputRef}
                                onChange={handleAvatarUpload}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <GlassInput
                            label="Nome de Exibição"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Como você quer ser chamado"
                            icon="fa-solid fa-user"
                        />
                        <GlassInput
                            label="E-mail Interno (Usuário)"
                            value={user?.email || ''}
                            icon="fa-solid fa-envelope"
                            readOnly
                        />
                        <GlassInput
                            label="Nível de Acesso (Cargo)"
                            value={user?.permissao || ''}
                            icon="fa-solid fa-shield-halved"
                            readOnly
                        />
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="primary" onClick={handleSaveProfile} disabled={loadingProfile || !name}>
                            {loadingProfile ? 'Salvando...' : 'Salvar Perfil'}
                        </Button>
                    </div>
                </GlassCard>

                {/* 2. SEÇÃO SEGURANÇA */}
                <GlassCard style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Lock size={18} color="var(--primary-light)" />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }}>
                            Segurança & Senha
                        </h3>
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        Lembre-se de utilizar uma senha forte contendo números, letras maiúsculas e caracteres especiais.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <GlassInput
                            label="Nova Senha"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo de 6 caracteres"
                            icon="fa-solid fa-lock"
                        />

                        <GlassInput
                            label="Confirmar Nova Senha"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repita a senha sugerida"
                            icon="fa-solid fa-check"
                        />
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="primary"
                            style={{ background: 'var(--primary-color)' }}
                            onClick={handleUpdatePassword}
                            disabled={loadingPassword || !newPassword}
                        >
                            {loadingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                        </Button>
                    </div>
                </GlassCard>

            </div>
        </div>
    );
};

export default MyProfile;
