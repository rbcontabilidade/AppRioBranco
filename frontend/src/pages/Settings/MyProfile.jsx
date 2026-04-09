import React, { useState, useRef, useEffect } from 'react';
import { User, Lock, Camera, ShieldAlert, Loader2 } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput/GlassInput';
import { Button } from '../../components/ui/Button/Button';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';
import { useDialog } from '../../contexts/DialogContext';
import styles from './MyProfile.module.css';

/**
 * Aba: Meu Perfil (Nova UX Premium)
 */
const MyProfile = () => {
    const { profile, refreshProfile } = useAuth();
    const { showAlert } = useDialog();

    // Estado do Perfil
    const [name, setName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Estado da Senha
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);

    // Ref para upload oculto
    const fileInputRef = useRef(null);

    // Sincroniza estados com o perfil logado
    useEffect(() => {
        if (profile) {
            setName(profile.nome || '');
            setAvatarUrl(profile.avatar_url || null);
        }
    }, [profile]);

    // Upload de Avatar
    const handleAvatarUpload = async (e) => {
        try {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];

            if (file.size > 2 * 1024 * 1024) {
                showAlert({ 
                    title: 'Arquivo muito grande', 
                    message: 'Tamanho máximo permitido: 2MB.', 
                    variant: 'danger' 
                });
                return;
            }

            setLoadingProfile(true);
            const fileExt = file.name.split('.').pop();
            const filePath = `avatars/${profile.id}/${Date.now()}.${fileExt}`;

            // 1. Upload para o bucket
            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;

            // 2. Coleta URL pública
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

            // 3. Persiste no banco de dados via API Python
            await api.put('/auth/profile', { avatar_url: publicUrl });
            
            // 4. Sincroniza UI global
            await refreshProfile();

            showAlert({ 
                title: 'Foto Atualizada', 
                message: 'Sua foto de perfil foi alterada com sucesso.', 
                variant: 'success' 
            });
        } catch (error) {
            console.error('[AvatarUpload]', error);
            showAlert({ 
                title: 'Erro de Upload', 
                message: error.message || 'Falha ao processar a imagem.', 
                variant: 'danger' 
            });
        } finally {
            setLoadingProfile(false);
            if (e.target) e.target.value = null; // reset input
        }
    };

    // Salvar Nome do Perfil
    const handleSaveProfile = async () => {
        if (!name.trim()) return;
        
        try {
            setLoadingProfile(true);
            await api.put('/auth/profile', { nome: name.trim() });
            
            // Sincroniza UI global
            await refreshProfile();

            showAlert({ 
                title: 'Perfil Salvo', 
                message: 'Seu nome de exibição foi atualizado no sistema.', 
                variant: 'success' 
            });
        } catch (error) {
            console.error('[SaveProfile]', error);
            showAlert({ 
                title: 'Erro ao Salvar', 
                message: error.response?.data?.detail || 'Falha ao atualizar nome.', 
                variant: 'danger' 
            });
        } finally {
            setLoadingProfile(false);
        }
    };

    // Alterar Senha
    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert({ title: 'Atenção', message: 'Preença todos os campos de senha.', variant: 'warning' });
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert({ title: 'Atenção', message: 'A nova senha e a confirmação não coincidem.', variant: 'warning' });
            return;
        }

        if (newPassword.length < 6) {
            showAlert({ title: 'Atenção', message: 'A nova senha deve ter no mínimo 6 caracteres.', variant: 'warning' });
            return;
        }

        try {
            setLoadingPassword(true);
            await api.post('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword
            });

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            showAlert({ 
                title: 'Senha Atualizada', 
                message: 'Sua segurança foi reforçada. Use a nova senha no próximo acesso.', 
                variant: 'success' 
            });

        } catch (error) {
            console.error('[ChangePassword]', error);
            const detail = error.response?.data?.detail || 'Não foi possível alterar a senha.';
            showAlert({ title: 'Erro na Troca', message: detail, variant: 'danger' });
        } finally {
            setLoadingPassword(false);
        }
    };

    return (
        <div className={styles.profileContainer}>

            {/* Banner de Capa (Estético) */}
            <div className={styles.coverBanner}></div>

            {/* Seção do Avatar e Badge */}
            <div className={styles.avatarSection}>
                <div
                    className={styles.avatarWrapper}
                    onClick={() => !loadingProfile && fileInputRef.current?.click()}
                    title="Mudar Foto de Perfil"
                >
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Meu Avatar" className={styles.avatarImage} />
                    ) : (
                        <div className={styles.avatarImage}>
                            {name?.[0]?.toUpperCase() || 'U'}
                        </div>
                    )}

                    <div className={`${styles.avatarOverlay} ${loadingProfile ? styles.loading : ''}`}>
                        {loadingProfile ? (
                            <Loader2 className={styles.spinIcon} size={28} color="#fff" />
                        ) : (
                            <Camera size={28} color="#fff" />
                        )}
                    </div>
                </div>

                <div className={styles.userInfoHeader}>
                    <h2 className={styles.userNameLabel}>{name || 'Usuário'}</h2>
                    <span className={styles.userRoleBadge}>
                        <ShieldAlert size={14} />
                        {profile?.permissao || 'Colaborador'}
                    </span>
                </div>
            </div>

            <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleAvatarUpload}
            />

            {/* Formulários de Configuração */}
            <div className={styles.formSections}>

                {/* Bloco: Dados Pessoais */}
                <GlassCard className={styles.cardPadding}>
                    <div className={styles.sectionBlock}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionHeaderIcon}>
                                <User size={20} />
                            </div>
                            <div>
                                <h3>Meus Dados</h3>
                                <p>Gerencie como as pessoas visualizam você na plataforma.</p>
                            </div>
                        </div>

                        <div className={styles.inputGrid}>
                            <GlassInput
                                label="Nome de Exibição"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Seu nome completo"
                                icon="fa-solid fa-user-tag"
                            />
                            <GlassInput
                                label="Email Corporativo"
                                value={profile?.email || 'vazio@riobranco.com'}
                                icon="fa-regular fa-envelope"
                                readOnly
                                disabled
                            />
                        </div>

                        <div className={styles.actionFooter}>
                            <Button 
                                variant="primary" 
                                onClick={handleSaveProfile} 
                                disabled={loadingProfile || !name || name === profile?.nome}
                            >
                                {loadingProfile ? 'Salvando...' : 'Atualizar Informações'}
                            </Button>
                        </div>
                    </div>
                </GlassCard>

                {/* Bloco: Segurança (Troca de Senha) */}
                <GlassCard className={styles.cardPadding}>
                    <div className={styles.sectionBlock}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionHeaderIcon} style={{ color: 'var(--success)' }}>
                                <Lock size={20} />
                            </div>
                            <div>
                                <h3>Segurança da Conta</h3>
                                <p>Mantenha sua senha atualizada para proteger seus dados.</p>
                            </div>
                        </div>

                        <div className={styles.passwordFormWrapper}>
                            <GlassInput
                                label="Senha Atual"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="••••••••"
                                icon="fa-solid fa-key"
                            />
                            <div className={styles.inputGrid}>
                                <GlassInput
                                    label="Nova Senha"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="No mínimo 6 dígitos"
                                    icon="fa-solid fa-shield-halved"
                                />
                                <GlassInput
                                    label="Confirmar Nova Senha"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repita a nova senha"
                                    icon="fa-solid fa-check-double"
                                />
                            </div>
                        </div>

                        <div className={styles.actionFooter}>
                            <Button
                                variant="primary"
                                style={{ background: 'var(--success)' }}
                                onClick={handleUpdatePassword}
                                disabled={loadingPassword || !newPassword || !currentPassword || !confirmPassword}
                            >
                                {loadingPassword ? 'Processando...' : 'Alterar Senha de Acesso'}
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};

export default MyProfile;
