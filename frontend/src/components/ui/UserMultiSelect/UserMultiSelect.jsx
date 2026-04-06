import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User } from 'lucide-react';

const UserMultiSelect = ({ availableUsers, selectedUserIds, onChange, label, helperText }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const toggleUser = (rawUserId) => {
        const userId = String(rawUserId);
        const safeSelectedIds = selectedUserIds.map(id => String(id));
        const newSelection = safeSelectedIds.includes(userId)
            ? safeSelectedIds.filter(id => id !== userId)
            : [...safeSelectedIds, userId];
        // Retornamos IDs como inteiros se possível para o banco de dados
        onChange(newSelection.map(id => isNaN(parseInt(id)) ? id : parseInt(id)));
    };

    const filteredUsers = availableUsers.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const safeSelectedIds = selectedUserIds.map(id => String(id));
    const selectedUsers = availableUsers.filter(user => safeSelectedIds.includes(String(user.id)));

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="user-multiselect-container" ref={dropdownRef} style={{ width: '100%', position: 'relative' }}>
            {label && (
                <label style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: 'var(--text-muted)',
                    marginBottom: '8px'
                }}>
                    {label}
                </label>
            )}

            <div
                className="multiselect-input-wrapper"
                onClick={() => setIsDropdownOpen(true)}
                style={{
                    minHeight: '44px',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    cursor: 'text',
                    transition: 'all 0.2s ease',
                    borderColor: isDropdownOpen ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.1)'
                }}
            >
                {selectedUsers.map(user => (
                    <div key={user.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '100px',
                        fontSize: '0.8rem',
                        color: '#fff'
                    }}>
                        <span>{user.name}</span>
                        <X
                            size={12}
                            style={{ cursor: 'pointer', opacity: 0.6 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleUser(user.id);
                            }}
                        />
                    </div>
                ))}

                <input
                    type="text"
                    placeholder={selectedUserIds.length === 0 ? "Pesquisar funcionários..." : ""}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                    }}
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#fff',
                        fontSize: '0.9rem',
                        minWidth: '120px'
                    }}
                />
            </div>

            {isDropdownOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 5px)',
                    left: 0,
                    right: 0,
                    background: 'rgba(20, 20, 35, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    maxHeight: '250px',
                    overflowY: 'auto'
                }}>
                    <div style={{ padding: '8px' }}>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => toggleUser(user.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        background: safeSelectedIds.includes(String(user.id)) ? 'rgba(255,255,255,0.05)' : 'transparent',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = safeSelectedIds.includes(String(user.id)) ? 'rgba(255,255,255,0.05)' : 'transparent'}
                                >
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--primary-light)'
                                    }}>
                                        <User size={18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>{user.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.role}</div>
                                    </div>
                                    {safeSelectedIds.includes(String(user.id)) && (
                                        <X size={14} color="var(--primary-light)" />
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Nenhum funcionário encontrado.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {helperText && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                    {helperText}
                </p>
            )}
        </div>
    );
};

export default UserMultiSelect;
