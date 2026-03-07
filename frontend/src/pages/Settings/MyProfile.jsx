import React, { useState, useRef } from 'react';
import { User, Lock, Camera, ShieldAlert } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard/GlassCard';
import { GlassInput } from '../../components/ui/GlassInput/GlassInput';
import { Button } from '../../components/ui/Button/Button';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { supabase } from '../../services/supabase';
import { useDialog } from '../../contexts/DialogContext';
import styles from './MyProfile.module.css';

/**
 * Aba: Meu Perfil (Nova UX Premium)
 */
const MyProfile = () => {
    const { user } = useAuth();
    const { showAlert } = useDialog();

    // Estado do Perfil
    const [name, setName] = useState(user?.nome || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Estado da Senha
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loadingPassword, setLoadingPassword] = useState(false);

    // Ref para upload oculto
    const fileInputRef = useRef(null);

    // Upload de Avatar
    const handleAvatarUpload = async (e) => {
        try {
            if (!e.target.files || e.target.files.length === 0) return;
            const file = e.target.files[0];

            if (file.size > 2 * 1024 * 1024) {
                showAlert({ title: 'Arquivo muito grande', message: 'Tamanho máximo permitido: 2MB.', variant: 'danger' });
                return;
            }

            setLoadingProfile(true);
            const fileExt = file.name.split('.').pop();
            const filePath = `avatar-${user.id}-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

            setAvatarUrl(publicUrl);
            await api.put('/auth/profile', { avatar_url: publicUrl });

            const storedUser = JSON.parse(localStorage.getItem('user'));
            if (storedUser) {
                storedUser.avatar_url = publicUrl;
                localStorage.setItem('user', JSON.stringify(storedUser));
            }

            showAlert({ title: 'Foto Atualizada', message: 'Sua foto de capa foi alterada com estilo.', variant: 'success' });
        } catch (error) {
            console.error(error);
            showAlert({ title: 'Erro de Upload', message: error.message || 'Falha ao processar.', variant: 'danger' });
        } finally {
            setLoadingProfile(false);
            e.target.value = null; // reset input
        }
    };

    // Salvar Perfil
    const handleSaveProfile = async () => {
        try {
            setLoadingProfile(true);
            await api.put('/auth/profile', { nome: name });

            const storedUser = JSON.parse(localStorage.getItem('user'));
            if (storedUser) {
                storedUser.nome = name;
                localStorage.setItem('user', JSON.stringify(storedUser));
            }

            showAlert({ title: 'Perfil Salvo', message: 'Nome de exibição atualizado no sistema.', variant: 'success' });
        } catch (error) {
            console.error(error);
            showAlert({ title: 'Erro ao Salvar', message: error.response?.data?.detail || 'Falha ao atualizar.', variant: 'danger' });
        } finally {
            setLoadingProfile(false);
        }
    };

    // Alterar Senha
    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert({ title: 'Atenção', message: 'Preença todas as senhas para prosseguir.', variant: 'warning' });
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert({ title: 'Atenção', message: 'Sua nova senha e confirmação não batem.', variant: 'warning' });
            return;
        }

        if (newPassword.length < 6) {
            showAlert({ title: 'Atenção', message: 'Mínimo de 6 caracteres na nova senha.', variant: 'warning' });
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
            showAlert({ title: 'Senha Atualizada', message: 'Segurança da conta reforçada com sucesso.', variant: 'success' });

        } catch (error) {
            console.error(error);
            showAlert({ title: 'Erro', message: error.response?.data?.detail || 'Algo deu errado.', variant: 'danger' });
        } finally {
            setLoadingPassword(false);
        }
    };

    return (
        <div className={styles.profileContainer}>

            {/* Capa e Avatar Embutido */}
            <div className={styles.coverBanner}></div>

            <div className={styles.avatarSection}>
                <div
                    className={styles.avatarWrapper}
                    onClick={() => fileInputRef.current?.click()}
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
                            <span style={{ color: '#fff', fontSize: '0.8rem' }}>Up...</span>
                        ) : (
                            <Camera size={32} color="#fff" />
                        )}
                    </div>
                </div>

                <div className={styles.userInfoHeader}>
                    <h2 className={styles.userNameLabel}>{name || 'Usuário'}</h2>
                    <span className={styles.userRoleBadge}>
                        <ShieldAlert size={14} />
                        {user?.permissao || 'Colaborador'}
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

            {/* Containers Empilhados de Configurações */}
            <div className={styles.formSections}>

                {/* BLOCO 1: Informações Pessoais */}
                <GlassCard style={{ padding: '32px' }}>
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
                                placeholder="Nome completo ou apelido"
                                icon="fa-solid fa-user-tag"
                            />
                            <GlassInput
                                label="Email Corporativo"
                                value={user?.email || ''}
                                icon="fa-regular fa-envelope"
                                readOnly
                            />
                        </div>

                        <div className={styles.actionFooter}>
                            <Button variant="primary" onClick={handleSaveProfile} disabled={loadingProfile || !name}>
                                {loadingProfile ? 'Registrando...' : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </div>
                </GlassCard>

                {/* BLOCO 2: Segurança */}
                <GlassCard style={{ padding: '32px' }}>
                    <div className={styles.sectionBlock}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.sectionHeaderIcon} style={{ color: 'var(--success)' }}>
                                <Lock size={20} />
                            </div>
                            <div>
                                <h3>Credenciais de Acesso</h3>
                                <p>Você pode alterar sua senha a qualquer momento.</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', maxWidth: '600px' }}>
                            <GlassInput
                                label="Senha Atual"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Digite para autorizar a troca"
                                icon="fa-solid fa-key"
                            />
                            <div className={styles.inputGrid}>
                                <GlassInput
                                    label="Nova Senha"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="No mínimo 6 caracteres"
                                    icon="fa-solid fa-shield"
                                />
                                <GlassInput
                                    label="Confirmar Senha"
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
                                {loadingPassword ? 'Validando...' : 'Mudar Minha Senha'}
                            </Button>
                        </div>
                    </div>
                </GlassCard>
            </div>

        </div>
    );
};

export default MyProfile;
