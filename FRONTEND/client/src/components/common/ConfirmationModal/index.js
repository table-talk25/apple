import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import styles from './ConfirmationModal.module.css'; 

const ConfirmationModal = ({
  show,                // Prop booleana per mostrare/nascondere il modale
  onClose,             // Funzione per chiudere il modale
  onConfirm,           // Funzione da eseguire alla conferma
  title,               // Titolo del modale
  children,            // Contenuto personalizzato (es. un testo o un form)
  confirmText,         // Testo del pulsante di conferma
  cancelText,          // Testo del pulsante di annullamento
  isConfirming = false // Per mostrare uno stato di caricamento sul pulsante di conferma
}) => {
  const { t } = useTranslation();
  
  if (!show) {
    return null; // Se 'show' è false, il componente non renderizza nulla
  }

  return (
    // L'overlay scuro che copre tutta la pagina
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* Il contenitore del modale. Usiamo e.stopPropagation() per evitare che un click qui dentro chiuda il modale. */}
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        {/* Header del modale con titolo e pulsante di chiusura */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalCloseButton} onClick={onClose} aria-label={t('common.close')}>
            <FaTimes />
          </button>
        </div>

        {/* Corpo del modale, dove verrà inserito il contenuto personalizzato */}
        <div className={styles.modalBody}>
          {children}
        </div>

        {/* Footer del modale con i pulsanti di azione */}
        <div className={styles.modalFooter}>
          <button className={styles.modalButtonCancel} onClick={onClose}>
            {cancelText || t('common.cancel')}
          </button>
          <button 
            className={styles.modalButtonConfirm} 
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? <div className={styles.spinnerSmall}></div> : (confirmText || t('common.confirm'))}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;