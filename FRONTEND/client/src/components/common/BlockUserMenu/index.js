import React, { useState, useEffect } from 'react';
import { FaEllipsisV, FaBan, FaUserCheck, FaFlag } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { blockUser, unblockUser, isUserBlocked } from '../../../services/apiService';
import Toast from '../Toast';
import ReportModal from '../ReportModal';
import styles from './BlockUserMenu.module.css';

const BlockUserMenu = ({ userId, reportedUser, onBlockChange }) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [toast, setToast] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Controlla lo stato di blocco quando il componente si monta
  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        setIsCheckingStatus(true);
        const response = await isUserBlocked(userId);
        setIsBlocked(response.data.data.isBlocked);
      } catch (error) {
        console.error('Errore nel controllare lo stato di blocco:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    if (userId) {
      checkBlockStatus();
    }
  }, [userId]);

  const handleToggleBlock = async () => {
    try {
      setIsLoading(true);
      
      if (isBlocked) {
        // Sblocca l'utente
        await unblockUser(userId);
        setIsBlocked(false);
        if (onBlockChange) onBlockChange(false);
        setToast({
          message: t('userBlock.unblockSuccess'),
          type: 'success'
        });
      } else {
        // Blocca l'utente
        await blockUser(userId);
        setIsBlocked(true);
        if (onBlockChange) onBlockChange(true);
        setToast({
          message: t('userBlock.blockSuccess'),
          type: 'success'
        });
      }
      
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Errore nel blocco/sblocco utente:', error);
      setToast({
        message: 'Errore durante l\'operazione. Riprova.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleReport = () => {
    setShowReportModal(true);
    setIsMenuOpen(false);
  };

  // Chiudi il menu quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest(`.${styles.menuContainer}`)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  if (isCheckingStatus) {
    return (
      <div className={styles.menuContainer}>
        <button className={styles.kebabButton} disabled>
          <FaEllipsisV />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.menuContainer}>
        <button 
          className={styles.kebabButton}
          onClick={handleMenuToggle}
          disabled={isLoading}
        >
          <FaEllipsisV />
        </button>
        
        {isMenuOpen && (
          <div className={styles.dropdown}>
            <button
              className={`${styles.menuItem} ${isBlocked ? styles.unblockButton : styles.blockButton}`}
              onClick={handleToggleBlock}
              disabled={isLoading}
            >
              {isBlocked ? (
                <>
                  <FaUserCheck />
                  {t('userBlock.unblockUser')}
                </>
              ) : (
                <>
                  <FaBan />
                  {t('userBlock.blockUser')}
                </>
              )}
            </button>
            
            <button
              className={`${styles.menuItem} ${styles.reportButton}`}
              onClick={handleReport}
            >
              <FaFlag />
              Segnala Utente
            </button>
          </div>
        )}
      </div>
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {showReportModal && reportedUser && (
        <ReportModal
          show={showReportModal}
          onHide={() => setShowReportModal(false)}
          reportedUser={reportedUser}
          context="profile"
        />
      )}
    </>
  );
};

export default BlockUserMenu; 