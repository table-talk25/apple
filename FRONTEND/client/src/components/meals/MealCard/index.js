// File: src/components/meals/MealCard/index.js (Versione Finale e Intelligente)

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaCalendarAlt, FaUsers, FaUserCircle, FaLanguage, FaClock } from 'react-icons/fa'; 
import { 
  formatDate, 
  getMealCoverImageUrl, 
  getMealTypeColor, 
  getHostAvatarUrl,
  getMealModeIcon,
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
    console.error("MealCard ha ricevuto dati incompleti: ", meal);
    return null;
  }

  const isHost = user && user.id === meal.host._id;
  const isParticipant = user && meal.participants && meal.participants.some(p => p._id === user.id);

  const imageUrl = getMealCoverImageUrl(meal.imageUrl);
  const hostAvatarUrl = getHostAvatarUrl(meal.host.profileImage);
  
  // Debug per l'ID dell'host
  console.log('👤 [MealCard] Host ID:', meal.host._id || meal.host.id);
  console.log('👤 [MealCard] Host object:', meal.host);

  const truncatedDescription = meal.description && meal.description.length > 80
    ? meal.description.substring(0, 80) + '...'
    : meal.description;

          // Calcolo se il TableTalk® è terminato
  const mealEndTime = new Date(new Date(meal.date).getTime() + (meal.duration || 0) * 60000);
  const isPast = meal.status === 'completed' || meal.status === 'cancelled' || new Date() > mealEndTime;

  return (
    <div className={styles.card}>
      <Link to={`/meals/${meal._id}`} className={styles.cardLink}>
        <div className={compact ? styles.cardImageWrapperCompact : styles.cardImageWrapper}>
          <img src={imageUrl} alt={meal.title} className={styles.cardImage} />
          <div className={styles.cardImageType} style={{ backgroundColor: getMealTypeColor(meal.type) }}>
            {getMealTypeText(meal.type)}
          </div>
          {/* Badge per il tipo di TableTalk® (virtuale/fisico) */}
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
          
          <div className={styles.cardDetail}>
            <FaLanguage />
            <span>{meal.language}</span>
          </div>
          
          <Link to={`/public-profile/${meal.host._id || meal.host.id}`} className={styles.hostLink}>
            <div className={styles.cardDetail}>
              <img src={hostAvatarUrl} alt={meal.host.nickname} className={styles.hostAvatar} />
              <span>{t('meals.card.organizedBy')} <strong>{meal.host.nickname}</strong></span>
            </div>
          </Link>
          
          <div className={styles.cardDetail}>
            <FaCalendarAlt />
            <span>{formatDate(meal.date)}</span>
          </div>
          {/* Durata e orario di fine */}
          {/* Durata e orario di fine: nascosti nella preview (Meals) */}
          {!compact && (
            <>
              <div className={styles.cardDetail}>
                <FaClock />
                <span>{t('meals.card.duration')}: {meal.duration} {t('meals.card.minutes')}</span>
              </div>
              <div className={styles.cardDetail}>
                <FaClock />
                <span>{t('meals.card.end')}: {formatDate(new Date(new Date(meal.date).getTime() + meal.duration * 60000), 'HH:mm')}</span>
              </div>
            </>
          )}
          
          {/* Mostra la posizione solo per TableTalk® fisici */}
          {meal.mealType === 'physical' && meal.location && (
            <div className={styles.cardDetail}>
              <span className={styles.locationIcon}>📍</span>
              <span className={styles.locationText}>{meal.location}</span>
            </div>
          )}
          
          <p className={styles.cardDescription}>{truncatedDescription}</p>
        </div>
      </Link>
      
        <div className={styles.cardActions}>
        <div className={styles.cardDetail}>
            <FaUsers />
            <span>{meal.participants?.length || 0} / {meal.maxParticipants} {t('meals.card.participants')}</span>
        </div>
        <div className={styles.actionButtons}>
            {/* Rimuovi Modifica nella preview (Meals); resta nel dettaglio */}
            {!compact && isHost && !isPast && <EditMealButton mealId={meal._id} />}
            {isParticipant && !isHost && !isPast && <LeaveMealButton mealId={meal._id} onSuccess={onLeaveSuccess} />}
        </div>
      </div>
    </div>
  );
};

export default MealCard;