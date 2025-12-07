import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import mealService from '../../../services/mealService';
import InlineEditTitle from '../InlineEditTitle';
import InlineEditDescription from '../InlineEditDescription';
import InlineEditDate from '../InlineEditDate';
import InlineEditCoverImage from '../InlineEditCoverImage';
import { getMealCoverImageUrl } from '../../../constants/mealConstants';
import { MEAL_COVER } from '../../../config/imageCompressionConfig';
import styles from './MealInlineEditor.module.css';

const MealInlineEditor = ({ 
  meal, 
  onMealUpdate, 
  isHost = false,
  className = '' 
}) => {
  const { t } = useTranslation();
  const [editingField, setEditingField] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Gestisce l'inizio dell'editing per un campo specifico
  const handleEditStart = (fieldName) => {
    if (!isHost) return;
    setEditingField(fieldName);
  };

  // Gestisce la cancellazione dell'editing
  const handleEditCancel = () => {
    setEditingField(null);
  };

  // Gestisce il salvataggio del titolo
  const handleTitleSave = async (newTitle) => {
    if (!meal?._id) return;
    
    setIsUpdating(true);
    try {
      await mealService.updateMeal(meal._id, { title: newTitle });
      
      // Aggiorna il pasto localmente
      const updatedMeal = { ...meal, title: newTitle };
      onMealUpdate(updatedMeal);
      
      toast.success(t('meals.edit.titleUpdateSuccess', { defaultValue: 'Titolo aggiornato con successo!' }));
      setEditingField(null);
    } catch (error) {
      console.error('Errore nell\'aggiornamento del titolo:', error);
      toast.error(t('meals.edit.titleUpdateError', { defaultValue: 'Errore nell\'aggiornamento del titolo' }));
    } finally {
      setIsUpdating(false);
    }
  };

  // Gestisce il salvataggio della descrizione
  const handleDescriptionSave = async (newDescription) => {
    if (!meal?._id) return;
    
    setIsUpdating(true);
    try {
      await mealService.updateMeal(meal._id, { description: newDescription });
      
      // Aggiorna il pasto localmente
      const updatedMeal = { ...meal, description: newDescription };
      onMealUpdate(updatedMeal);
      
      toast.success(t('meals.edit.descriptionUpdateSuccess', { defaultValue: 'Descrizione aggiornata con successo!' }));
      setEditingField(null);
    } catch (error) {
      console.error('Errore nell\'aggiornamento della descrizione:', error);
      toast.error(t('meals.edit.descriptionUpdateError', { defaultValue: 'Errore nell\'aggiornamento della descrizione' }));
    } finally {
      setIsUpdating(false);
    }
  };

  // Gestisce il salvataggio della data
  const handleDateSave = async (newDate) => {
    if (!meal?._id) return;
    
    setIsUpdating(true);
    try {
      await mealService.updateMeal(meal._id, { date: newDate });
      
      // Aggiorna il pasto localmente
      const updatedMeal = { ...meal, date: newDate };
      onMealUpdate(updatedMeal);
      
      toast.success(t('meals.edit.dateUpdateSuccess', { defaultValue: 'Data aggiornata con successo!' }));
      setEditingField(null);
    } catch (error) {
      console.error('Errore nell\'aggiornamento della data:', error);
      toast.error(t('meals.edit.dateUpdateError', { defaultValue: 'Errore nell\'aggiornamento della data' }));
    } finally {
      setIsUpdating(false);
    }
  };

  // Gestisce il salvataggio dell'immagine di copertina
  const handleCoverImageSave = async (newImageFile) => {
    if (!meal?._id) return;
    
    setIsUpdating(true);
    try {
      const formData = new FormData();
      formData.append('image', newImageFile);
      
      await mealService.updateMeal(meal._id, formData);
      
      // Aggiorna il pasto localmente (l'immagine verrà aggiornata dal server)
      // Per ora aggiorniamo solo il nome del file per mostrare che è stato cambiato
      const updatedMeal = { 
        ...meal, 
        imageUrl: newImageFile.name // Questo è temporaneo, il server restituirà il nome reale
      };
      onMealUpdate(updatedMeal);
      
      toast.success(t('meals.edit.coverImageUpdateSuccess', { defaultValue: 'Immagine di copertina aggiornata con successo!' }));
      setEditingField(null);
      
      // Ricarica i dettagli del pasto per ottenere il nuovo nome dell'immagine
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Errore nell\'aggiornamento dell\'immagine:', error);
      toast.error(t('meals.edit.coverImageUpdateError', { defaultValue: 'Errore nell\'aggiornamento dell\'immagine' }));
    } finally {
      setIsUpdating(false);
    }
  };

  // Funzione helper per ottenere l'URL dell'immagine
  const getImageUrl = (imageName) => {
    return getMealCoverImageUrl(imageName);
  };

  if (!meal) {
    return null;
  }

  return (
    <div className={`${styles.mealInlineEditor} ${className}`}>
      {/* Titolo inline editabile */}
      <InlineEditTitle
        title={meal.title}
        onSave={handleTitleSave}
        isEditing={editingField === 'title'}
        onEditClick={() => handleEditStart('title')}
        onCancel={handleEditCancel}
        className={styles.titleSection}
        size="h2"
      />

      {/* Immagine di copertina inline editabile */}
      <InlineEditCoverImage
        coverImage={meal.imageUrl}
        onSave={handleCoverImageSave}
        isEditing={editingField === 'coverImage'}
        onEditClick={() => handleEditStart('coverImage')}
        onCancel={handleEditCancel}
        className={styles.coverImageSection}
        getImageUrl={getImageUrl}
        enableCompression={MEAL_COVER.enableCompression}
        compressionQuality={MEAL_COVER.compressionQuality}
        maxWidthCompression={MEAL_COVER.maxWidthCompression}
        maxHeightCompression={MEAL_COVER.maxHeightCompression}
      />

      {/* Data inline editabile */}
      <InlineEditDate
        date={meal.date}
        onSave={handleDateSave}
        isEditing={editingField === 'date'}
        onEditClick={() => handleEditStart('date')}
        onCancel={handleEditCancel}
        className={styles.dateSection}
      />

      {/* Descrizione inline editabile */}
      <InlineEditDescription
        description={meal.description}
        onSave={handleDescriptionSave}
        isEditing={editingField === 'description'}
        onEditClick={() => handleEditStart('description')}
        onCancel={handleEditCancel}
        className={styles.descriptionSection}
      />

      {/* Indicatore di caricamento globale */}
      {isUpdating && (
        <div className={styles.updatingOverlay}>
          <div className={styles.updatingSpinner}>
            <div className={styles.spinner}></div>
            <span>{t('meals.edit.updating', { defaultValue: 'Aggiornamento in corso...' })}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealInlineEditor;
