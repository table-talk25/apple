import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import imageCompression from 'browser-image-compression';
import styles from './ImageUploader.module.css';

const ImageUploader = ({ 
  onImageSelect, 
  maxSizeMB = 5,
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  aspectRatio = 1,
  minWidth = 200,
  minHeight = 200,
  maxWidth = 2000,
  maxHeight = 2000,
  enableCompression = true,
  compressionQuality = 0.8,
  maxWidthCompression = 1280,
  maxHeightCompression = 1280,
  className = '',
  children 
}) => {
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Funzione per comprimere l'immagine
  const compressImage = async (file) => {
    if (!enableCompression) return file;

    try {
      console.log('🖼️ [ImageUploader] Compressione immagine in corso...');
      console.log('🖼️ [ImageUploader] Dimensione originale:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      const options = {
        maxSizeMB: maxSizeMB,
        maxWidthOrHeight: Math.max(maxWidthCompression, maxHeightCompression),
        useWebWorker: true,
        quality: compressionQuality,
        fileType: file.type
      };

      const compressedFile = await imageCompression(file, options);
      
      console.log('✅ [ImageUploader] Compressione completata!');
      console.log('✅ [ImageUploader] Dimensione compressa:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('📊 [ImageUploader] Riduzione:', ((1 - compressedFile.size / file.size) * 100).toFixed(1) + '%');

      return compressedFile;
    } catch (error) {
      console.warn('⚠️ [ImageUploader] Errore durante la compressione, uso il file originale:', error);
      return file;
    }
  };

  const validateImage = (file) => {
    // Verifica dimensione file
    const maxSize = maxSizeMB * 1024 * 1024; // Converti in bytes
    if (file.size > maxSize) {
      throw new Error(`L'immagine deve essere più piccola di ${maxSizeMB}MB`);
    }

    // Verifica tipo file
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato immagine non supportato. Usa JPG, PNG, GIF o WebP');
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Verifica dimensioni
        if (img.width < minWidth || img.height < minHeight) {
          reject(new Error(`L'immagine deve essere almeno ${minWidth}x${minHeight}px`));
        }
        if (img.width > maxWidth || img.height > maxHeight) {
          reject(new Error(`L'immagine non può essere più grande di ${maxWidth}x${maxHeight}px`));
        }

        // Verifica aspect ratio
        const currentRatio = img.width / img.height;
        const ratioError = Math.abs(currentRatio - aspectRatio);
        if (ratioError > 0.1) { // Tolleranza del 10%
          reject(new Error(`L'immagine deve avere un rapporto di ${aspectRatio}:1`));
        }

        resolve(img);
      };
      img.onerror = () => reject(new Error('Errore durante il caricamento dell\'immagine'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    try {
      // Mostra indicatore di caricamento
      console.log('🔄 [ImageUploader] Elaborazione immagine in corso...');
      
      // Comprimi l'immagine se abilitato
      const processedFile = await compressImage(file);
      
      // Valida l'immagine (usa il file processato)
      await validateImage(processedFile);

      // Crea preview dal file processato
      const previewUrl = URL.createObjectURL(processedFile);
      setPreview(previewUrl);

      // Notifica il componente padre con il file processato
      onImageSelect(processedFile);
      
      console.log('✅ [ImageUploader] Immagine elaborata e pronta per l\'upload');
    } catch (err) {
      setError(err.message);
      console.error('❌ [ImageUploader] Errore durante l\'elaborazione:', err);
      // Resetta l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`image-uploader ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={allowedTypes.join(',')}
        style={{ display: 'none' }}
      />
      
      <div 
        className={styles.imageUploaderContent}
        onClick={handleClick}
        role="button"
        tabIndex={0}
      >
        {preview ? (
          <img 
            src={preview} 
            alt="Preview" 
            className={styles.imagePreview}
          />
        ) : (
          children || (
            <div className={styles.uploadPlaceholder}>
              <i className={styles.fasFaCamera}></i>
              <p>Clicca per caricare un'immagine</p>
            </div>
          )
        )}
      </div>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.uploadRequirements}>
        <p>Requisiti:</p>
        <ul>
          <li>Dimensione massima: {maxSizeMB}MB</li>
          <li>Formati supportati: {allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}</li>
          <li>Dimensioni minime: {minWidth}x{minHeight}px</li>
          <li>Dimensioni massime: {maxWidth}x{maxHeight}px</li>
          <li>Rapporto: {aspectRatio}:1</li>
          {enableCompression && (
            <>
              <li>Compressione automatica: Attiva</li>
              <li>Qualità compressione: {Math.round(compressionQuality * 100)}%</li>
              <li>Ridimensionamento max: {maxWidthCompression}x{maxHeightCompression}px</li>
            </>
          )}
        </ul>
        <p style={{ marginTop: '8px', fontStyle: 'italic' }}>
          Per un risultato migliore, usa un'immagine quadrata.
          {enableCompression && ' Le immagini verranno compresse automaticamente per ottimizzare l\'upload.'}
        </p>
      </div>
    </div>
  );
};

ImageUploader.propTypes = {
  onImageSelect: PropTypes.func.isRequired,
  maxSizeMB: PropTypes.number,
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  aspectRatio: PropTypes.number,
  minWidth: PropTypes.number,
  minHeight: PropTypes.number,
  maxWidth: PropTypes.number,
  maxHeight: PropTypes.number,
  enableCompression: PropTypes.bool,
  compressionQuality: PropTypes.number,
  maxWidthCompression: PropTypes.number,
  maxHeightCompression: PropTypes.number,
  className: PropTypes.string,
  children: PropTypes.node
};

export default ImageUploader; 