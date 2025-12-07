import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaCheck, FaTimes, FaCamera, FaImage } from 'react-icons/fa';
import { Button, Form } from 'react-bootstrap';
import imageCompression from 'browser-image-compression';
import styles from './InlineEditCoverImage.module.css';

const InlineEditCoverImage = ({ 
  coverImage, 
  onSave, 
  isEditing = false, 
  onEditClick, 
  onCancel,
  className = '',
  getImageUrl,
  enableCompression = true,
  compressionQuality = 0.8,
  maxWidthCompression = 1280,
  maxHeightCompression = 1280
}) => {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Funzione per comprimere l'immagine
  const compressImage = async (file) => {
    if (!enableCompression) return file;

    try {
      console.log('🖼️ [InlineEditCoverImage] Compressione immagine in corso...');
      console.log('🖼️ [InlineEditCoverImage] Dimensione originale:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      const options = {
        maxSizeMB: 5, // Dimensione massima 5MB
        maxWidthOrHeight: Math.max(maxWidthCompression, maxHeightCompression),
        useWebWorker: true,
        quality: compressionQuality,
        fileType: file.type
      };

      const compressedFile = await imageCompression(file, options);
      
      console.log('✅ [InlineEditCoverImage] Compressione completata!');
      console.log('✅ [InlineEditCoverImage] Dimensione compressa:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('📊 [InlineEditCoverImage] Riduzione:', ((1 - compressedFile.size / file.size) * 100).toFixed(1) + '%');

      return compressedFile;
    } catch (error) {
      console.warn('⚠️ [InlineEditCoverImage] Errore durante la compressione, uso il file originale:', error);
      return file;
    }
  };

  const handleEdit = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onEditClick();
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    onCancel();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        console.log('🔄 [InlineEditCoverImage] Elaborazione immagine in corso...');
        
        // Comprimi l'immagine se abilitato
        const compressedFile = await compressImage(file);
        
        // Imposta il file compresso
        setSelectedFile(compressedFile);
        
        // Crea un preview dell'immagine compressa
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target.result);
        };
        reader.readAsDataURL(compressedFile);
        
        console.log('✅ [InlineEditCoverImage] Immagine elaborata e pronta per l\'upload');
      } catch (error) {
        console.error('❌ [InlineEditCoverImage] Errore durante l\'elaborazione:', error);
        // In caso di errore, usa il file originale
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedFile) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(selectedFile);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Errore nel salvataggio dell\'immagine:', error);
      // Mantieni il file selezionato in caso di errore
    } finally {
      setIsSaving(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const getCurrentImageUrl = () => {
    if (previewUrl) return previewUrl;
    if (coverImage) return getImageUrl ? getImageUrl(coverImage) : coverImage;
    return null;
  };

  if (isEditing) {
    return (
      <div className={`${styles.inlineEditContainer} ${className}`}>
        <div className={styles.imagePreviewContainer}>
          <div className={styles.imagePreview}>
            {getCurrentImageUrl() ? (
              <img
                src={getCurrentImageUrl()}
                alt={t('meals.edit.coverImagePreview')}
                className={styles.previewImage}
              />
            ) : (
              <div className={styles.noImagePlaceholder}>
                <FaImage className={styles.noImageIcon} />
                <span>{t('meals.edit.noImageSelected')}</span>
              </div>
            )}
          </div>
          
          <div className={styles.imageControls}>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={triggerFileSelect}
              className={styles.selectImageButton}
            >
              <FaCamera /> {t('meals.edit.selectImage')}
            </Button>
            
            <Form.Control
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={styles.hiddenFileInput}
            />
            
            {selectedFile && (
              <div className={styles.fileInfo}>
                <small>{selectedFile.name}</small>
                <small>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</small>
                {enableCompression && (
                  <small style={{ color: '#28a745', fontWeight: 'bold' }}>
                    ✓ Compressa
                  </small>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.editButtons}>
          <Button
            variant="success"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !selectedFile}
            className={styles.saveButton}
          >
            <FaCheck />
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
            className={styles.cancelButton}
          >
            <FaTimes />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.coverImageContainer} ${className}`}>
      <div className={styles.imageWrapper}>
        {coverImage ? (
          <img
            src={getImageUrl ? getImageUrl(coverImage) : coverImage}
            alt={t('meals.detail.coverImageAlt')}
            className={styles.coverImage}
          />
        ) : (
          <div className={styles.noImagePlaceholder}>
            <FaImage className={styles.noImageIcon} />
            <span>{t('meals.detail.noCoverImage')}</span>
          </div>
        )}
        
        <Button
          variant="link"
          size="sm"
          onClick={handleEdit}
          className={styles.editButton}
          title={t('meals.edit.changeCoverImage')}
        >
          <FaEdit />
        </Button>
      </div>
    </div>
  );
};

export default InlineEditCoverImage;
