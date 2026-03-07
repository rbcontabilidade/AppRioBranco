import React from 'react';
import Modal from '../../../components/ui/Modal/Modal';

export const SettingsModal = ({ isOpen, onClose, title, children }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="md"
        >
            {children}
        </Modal>
    );
};
