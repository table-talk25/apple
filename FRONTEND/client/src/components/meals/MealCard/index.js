// File: src/components/meals/MealCard/index.js (Versione Fix: Share, Immagini e Traduzioni)

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaUsers, FaLanguage, FaClock, FaShareAlt } from 'react-icons/fa'; 
import { toast } from 'react-toastify'; // Importiamo toast per feedback
import { 
  formatDate, 
  getMealCoverImageUrl, 
  getMealTypeColor, 
  getHostAvatarUrl,
  getMealModeIcon,
  getMealTypeIcon,
  getMealModeColor
} from '../../../constants/mealConstants';
import { useAuth } from '../../../contexts/AuthContext';
import { useMealTranslations } from '../../../hooks/useMealTranslations';
import EditMealButton from '../EditMealButton';
import LeaveMealButton from '../LeaveMealButton';
import styles from './MealCard.module.css';

const MealCard = ({ meal, onLeaveSuccess, compact = false }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getMealTypeText, getMealModeText } = useMealTranslations();

  if (!meal || !meal.host) {
    return null; // Evita crash se i dati sono corrotti
  }

  const isHost = user && user.id === meal.host._id;
  const isParticipant = user && meal.participants && meal.participants.some(p => p._id === user.id);

  // FIX IMMAGINE: Assicuriamoci che l'URL sia pulito
  const imageUrl = getMealCoverImageUrl(meal.imageUrl);
  
  const hostAvatarUrl = getHostAvatarUrl(meal.host?.profileImage);

  // FIX SCRITTA UNDEFINED: Se meal.type non c'è, usiamo 'generic' o nascondiamo
  const mealType = meal.type || 'dinner'; // Fallback per evitare errore traduzione

  const truncatedDescription = meal.description && meal.description.length > 80
    ? meal.description.substring(0, 80) + '...'
    : meal.description;

  const mealEndTime = new Date(new Date(meal.date).getTime() + (meal.duration || 0) * 60000);
  const isPast = meal.status === 'completed' || meal.status === 'cancelled' || new Date() > mealEndTime;

  // FUNZIONE CONDIVIDI (Nativa del telefono)
  const handleShare = async (e) => {
    e.preventDefault(); // Evita che si apra il link della card
    e.stopPropagation();

    const shareData = {
      title: `TableTalk: ${meal.title}`,
      text: `Unisciti al mio tavolo per ${meal.title}! 🍽️`,
      url: `${window.location.origin}/meals/${meal._id}` // Link diretto al pasto
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback per PC: Copia negli appunti
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copiato negli appunti! Incollalo in chat.');
      }
    } catch (err) {
      console.error('Errore condivisione:', err);
    }
  };

  return (
    <div className={styles.card}>
      <Link to={`/meals/${meal._id}`} className={styles.cardLink}>
        <div className={compact ? styles.cardImageWrapperCompact : styles.cardImageWrapper}>
          <img src={imageUrl} alt={meal.title} className={styles.cardImage} />
          
          {/* Badge Tipo Pasto (Cena, Pranzo, etc.) */}
          <div className={styles.cardImageType} style={{ backgroundColor: getMealTypeColor(mealType) }}>
            {getMealTypeText(mealType)}
          </div>

          {/* Badge Modalità (Fisico/Virtuale) */}
          <div 
            className={styles.mealModeBadge} 
            style={{ backgroundColor: getMealModeColor(meal.mealType) }}
          >
            <span className={styles.mealModeIcon}>{getMealModeIcon(meal.mealType)}</span>
            <span className={styles.mealModeText}>{getMealModeText(meal.mealType)}</span>
          </div>
        </div>

        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{meal.title}</h3>
          
          <div className={styles.cardDetailRow}>
            <div className={styles.cardDetail}>
                <FaLanguage className={styles.iconFixed} />
                <span>{meal.language || 'Italiano'}</span>
            </div>
            
            {/* Se è fisico, mostra location */}
            {meal.mealType === 'physical' && meal.location && (
                <div className={styles.cardDetail}>
                <span>📍</span>
                <span className={styles.locationText}>
                    {typeof meal.location === 'string'
                    ? meal.location.split(',')[0] // Prendi solo la città per brevità
                    : (meal.location?.address?.split(',')[0] || 'Posizione')}
                </span>
                </div>
            )}
          </div>
          
          {/* Host Info */}
          <div className={styles.hostContainer} onClick={(e) => e.stopPropagation()}>
             <Link to={`/public-profile/${meal.host._id || meal.host.id}`} className={styles.hostLink}>
                <img src={hostAvatarUrl} alt={meal.host.nickname} className={styles.hostAvatar} />
                <span className={styles.hostName}>{t('meals.card.organizedBy')} <strong>{meal.host.nickname}</strong></span>
             </Link>
          </div>
          
          <div className={styles.cardDetail}>
            <FaCalendarAlt className={styles.iconFixed} />
            <span>{formatDate(meal.date)}</span>
            {!compact && meal.duration && (
                <>
                <span className={styles.divider}>•</span>
                <FaClock className={styles.iconFixed} />
                <span>{meal.duration} min</span>
                </>
            )}
          </div>

          <p className={styles.cardDescription}>{truncatedDescription}</p>
        </div>
      </Link>
      
      <div className={styles.cardActions}>
        <div className={styles.participantsBadge}>
            <FaUsers />
            <span>{meal.participants?.length || 0} / {meal.maxParticipants}</span>
        </div>

        <div className={styles.actionButtons}>
            {/* TASTO CONDIVIDI NUOVO */}
            <button 
                className={`${styles.actionButton} ${styles.shareButton}`} 
                onClick={handleShare}
                title="Condividi o Invita amici"
            >
                <FaShareAlt /> {compact ? '' : 'Invita'}
            </button>

            {!compact && isHost && !isPast && <EditMealButton mealId={meal._id} />}
            {isParticipant && !isHost && !isPast && <LeaveMealButton mealId={meal._id} onSuccess={onLeaveSuccess} />}
        </div>
      </div>
    </div>
  );
};

export default MealCard;