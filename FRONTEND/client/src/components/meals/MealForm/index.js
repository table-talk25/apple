// File: /src/components/meals/MealForm.js (Versione Corretta e Aggiornata)

import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { mealTypeOptions } from '../../../constants/mealConstants';
import styles from './MealForm.module.css'; 
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import TopicInput from '../TopicInput';
import OpenStreetMapComponent from '../../maps/OpenStreetMapComponent';
import { sanitizeMealData, containsDangerousContent } from '../../../services/sanitizationService';
import mealService from '../../../services/mealService';

const languageOptions = ['Italiano', 'English', 'Español', 'Français', 'Deutsch', '中文', 'العربية'];

const MealForm = ({ initialData, onSubmit, onCancel, isLoading, isSubmitting, submitButtonText }) => {
  const { t } = useTranslation();
  
  const durationOptions = [
    { value: 30, label: t('meals.form.durationOptions.30min') },
    { value: 60, label: t('meals.form.durationOptions.1hour') },
    { value: 90, label: t('meals.form.durationOptions.1hour30') },
    { value: 120, label: t('meals.form.durationOptions.2hours') },
    { value: 150, label: t('meals.form.durationOptions.2hours30') },
    { value: 180, label: t('meals.form.durationOptions.3hours') },
  ];

  const getInitialState = () => {
    const now = new Date();
    const suggestedDate = new Date(now.getTime() + 60 * 60 * 1000);
    
    const year = suggestedDate.getFullYear();
    const month = String(suggestedDate.getMonth() + 1).padStart(2, '0');
    const day = String(suggestedDate.getDate()).padStart(2, '0');
    const hours = String(suggestedDate.getHours()).padStart(2, '0');
    const minutes = String(suggestedDate.getMinutes()).padStart(2, '0');
    
    return {
      title: '',
      description: '',
      mealType: 'virtual',
      type: 'lunch',
      date: `${year}-${month}-${day}T${hours}:${minutes}`,
      duration: 60,
      maxParticipants: 2,
      language: 'English',
      topics: [],
      location: null,
      isPublic: true,
      estimatedCost: '',
    };
  };

  const [formData, setFormData] = useState(getInitialState());
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [errors, setErrors] = useState({});
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (initialData) {
      const sanitizedData = { ...getInitialState(), ...initialData };
      
      if (sanitizedData.location) {
        if (typeof sanitizedData.location === 'object' && sanitizedData.location.address) {
          sanitizedData.location = {
            ...sanitizedData.location,
            address: typeof sanitizedData.location.address === 'string' 
              ? sanitizedData.location.address 
              : ''
          };
        } else {
          sanitizedData.location = null;
        }
      } else {
        sanitizedData.location = null;
      }
      
      setFormData(sanitizedData);

      // ✅ FIX: Pre-carica l'anteprima dell'immagine esistente in modalità edit
      if (initialData.coverImage) {
        const existingUrl = mealService.getFullMealImageUrl(initialData.coverImage);
        if (existingUrl) {
          setImagePreview(existingUrl);
        }
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (formData.location && typeof formData.location === 'object' && formData.location.coordinates) {
      setSelectedLocation({
        lat: formData.location.coordinates[1],
        lng: formData.location.coordinates[0],
        address: formData.location.address || ''
      });
    } else {
      setSelectedLocation(null);
    }
  }, [formData.location]);

  const getMinValidDateTime = () => {
    const now = new Date();
    const toleranceMs = 5 * 60 * 1000;
    const minValidDate = new Date(now.getTime() - toleranceMs);
    
    const year = minValidDate.getFullYear();
    const month = String(minValidDate.getMonth() + 1).padStart(2, '0');
    const day = String(minValidDate.getDate()).padStart(2, '0');
    const hours = String(minValidDate.getHours()).padStart(2, '0');
    const minutes = String(minValidDate.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const validateField = (name, value) => {
    switch (name) {
      case 'title':
        if (!value.trim()) return t('meals.form.titleRequired');
        if (value.trim().length < 5) return t('meals.form.titleMinLength');
        if (value.trim().length > 50) return t('meals.form.titleMaxLength');
        if (containsDangerousContent(value)) {
          return 'Il titolo contiene contenuto non permesso (HTML/JavaScript)';
        }
        break;
      case 'description':
        if (!value.trim()) return t('meals.form.descriptionRequired');
        if (value.trim().length < 10) return t('meals.form.descriptionMinLength');
        if (value.trim().length > 1000) return t('meals.form.descriptionMaxLength');
        if (containsDangerousContent(value)) {
          return 'La descrizione contiene contenuto non permesso (HTML/JavaScript)';
        }
        break;
      case 'date':
        if (!value) return t('meals.form.dateRequired');
        const selectedDate = new Date(value);
        const now = new Date();
        const toleranceMs = 5 * 60 * 1000;
        const minValidDate = new Date(now.getTime() - toleranceMs);
        if (selectedDate < minValidDate) {
          return t('meals.form.datePast') || 'La data deve essere nel futuro';
        }
        const maxFutureDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        if (selectedDate > maxFutureDate) {
          return t('meals.form.dateTooFar') || 'La data non può essere più di un anno nel futuro';
        }
        break;
      case 'maxParticipants':
        if (!value || value < 2) return t('meals.form.maxParticipantsMin');
        if (value > 10) return t('meals.form.maxParticipantsMax');
        break;
      case 'topics':
        return '';
      case 'location':
        if (formData.mealType === 'physical' && !value) return t('meals.form.locationRequired');
        break;
      default:
        return '';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'date' && value) {
      const selectedDate = new Date(value);
      const now = new Date();
      const toleranceMs = 5 * 60 * 1000;
      const minValidDate = new Date(now.getTime() - toleranceMs);
      if (selectedDate < minValidDate) {
        setFormData(prev => ({ ...prev, date: '' }));
        setErrors(prev => ({
          ...prev,
          date: t('meals.form.datePast') || 'La data deve essere nel futuro'
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleTopicsChange = (newTopics) => {
    setFormData(prev => ({ ...prev, topics: newTopics }));
    const error = validateField('topics', newTopics);
    setErrors(prev => ({ ...prev, topics: error }));
  };

  const geocodeAddress = async (address) => {
    if (!address || address.trim().length < 3) return null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        { headers: { 'User-Agent': 'TableTalk App' }, signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        return { lat: parseFloat(result.lat), lng: parseFloat(result.lon), address: result.display_name || address };
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleLocationSelect = async (location) => {
    let address = location.address;
    if (!address && location.lat && location.lng) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&addressdetails=1`,
          { headers: { 'User-Agent': 'TableTalk App' }, signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) address = data.display_name;
        }
      } catch (error) {}
    }
    const finalAddress = address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    setSelectedLocation({ ...location, address: finalAddress });
    setFormData(prev => ({
      ...prev,
      location: { address: finalAddress, coordinates: [location.lng, location.lat] }
    }));
    setErrors(prev => ({ ...prev, location: null }));
  };

  const handleAddressChange = async (e) => {
    const address = e.target.value;
    setFormData(prev => ({
      ...prev,
      location: prev.location ? { ...prev.location, address } : { address, coordinates: null }
    }));
    if (!address || address.trim().length === 0) {
      setSelectedLocation(null);
      setFormData(prev => ({ ...prev, location: null }));
    }
  };

  const handleAddressBlur = async (e) => {
    const address = e.target.value.trim();
    if (!address || address.length < 3) return;
    setErrors(prev => ({ ...prev, location: 'Ricerca indirizzo...' }));
    const location = await geocodeAddress(address);
    if (location) {
      setSelectedLocation(location);
      setFormData(prev => ({
        ...prev,
        location: { address: location.address, coordinates: [location.lng, location.lat] }
      }));
      setErrors(prev => ({ ...prev, location: null }));
    } else {
      setErrors(prev => ({ ...prev, location: 'Indirizzo non trovato. Prova a selezionarlo dalla mappa.' }));
    }
  };

  const processImageFile = async (file, fileName = 'image.jpg') => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      alert('Seleziona solo file immagine');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Il file è troppo grande. Massimo 10MB.');
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);

      let processedFile = file;
      if (file.size > 4 * 1024 * 1024) {
        try {
          const blob = await compressImageBlob(file, { maxWidth: 1600, quality: 0.7 });
          processedFile = new File([blob], fileName, { type: 'image/jpeg' });
        } catch (compressError) {
          processedFile = file;
        }
      }
      setImageFile(processedFile);
      try {
        const base64 = await blobToBase64(processedFile);
        if (typeof base64 === 'string') setImageBase64(base64);
      } catch (base64Error) {}
    } catch (error) {
      console.error('Errore elaborazione file:', error);
      throw error;
    }
  };

  const handleCameraSelect = async (source = CameraSource.Photos) => {
    try {
      const permissionStatus = await Camera.checkPermissions();
      const neededPermission = source === CameraSource.Camera ? 'camera' : 'photos';
      if (permissionStatus[neededPermission] === 'denied' || permissionStatus[neededPermission] === 'prompt') {
        const requestResult = await Camera.requestPermissions({ permissions: [neededPermission] });
        if (requestResult[neededPermission] === 'denied') {
          alert(`Permessi necessari per la ${source === CameraSource.Camera ? 'fotocamera' : 'libreria foto'}.`);
          return;
        }
      }
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
        width: 1600,
        height: 1600
      });
      if (!image || !image.dataUrl) return;
      const response = await fetch(image.dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await processImageFile(file, file.name);
    } catch (error) {
      console.error('Errore selezione foto:', error);
      alert(`Errore durante la selezione della foto: ${error.message}`);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    await processImageFile(file);
  };

  const compressImageBlob = async (blob, { maxWidth = 1600, quality = 0.7 } = {}) => {
    try {
      const imageBitmap = await createImageBitmap(blob);
      const scale = Math.min(1, maxWidth / imageBitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(imageBitmap.width * scale);
      canvas.height = Math.round(imageBitmap.height * scale);
      canvas.getContext('2d').drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      return await (await fetch(dataUrl)).blob();
    } catch (e) {
      return blob;
    }
  };

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const now = new Date();
      const minValidDate = new Date(now.getTime() - 5 * 60 * 1000);
      if (selectedDate < minValidDate) {
        setErrors(prev => ({ ...prev, date: t('meals.form.datePast') || 'La data deve essere nel futuro' }));
        return;
      }
    }
    
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const sanitizedData = sanitizeMealData(formData);
    const formDataToSend = new FormData();
    const dataToProcess = { ...sanitizedData };

    if (dataToProcess.date) {
      dataToProcess.date = new Date(dataToProcess.date).toISOString();
    }

    for (const key in dataToProcess) {
      if (key === 'topics' && Array.isArray(dataToProcess[key])) {
        dataToProcess[key].forEach(topic => formDataToSend.append('topics', topic));
      } else if (key === 'location' && dataToProcess[key]) {
        formDataToSend.append('location', JSON.stringify(dataToProcess[key]));
      } else if (key !== 'location' || formData.mealType === 'physical') {
        formDataToSend.append(key, dataToProcess[key]);
      }
    }
    
    if (imageFile) {
      formDataToSend.append('image', imageFile);
      if (imageBase64) formDataToSend.append('imageBase64', imageBase64);
      if (imagePreview) formDataToSend.append('imageLocalUri', imagePreview);
    }
    
    onSubmit(formDataToSend);
  };

  return (
    <Form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('meals.form.typeLabel')}</label>
        <div className={styles.typeSelector}>
          <button
            type="button"
            className={`${styles.typeButton} ${formData.mealType === 'virtual' ? styles.active : ''}`}
            onClick={() => setFormData({ ...formData, mealType: 'virtual', location: null })}
          >
            <span className={styles.typeIcon}>🎥</span>
            <span className={styles.typeText}>{t('meals.form.virtualType')}</span>
            <small className={styles.typeDescription}>{t('meals.form.virtualDescription')}</small>
          </button>
          <button
            type="button"
            className={`${styles.typeButton} ${formData.mealType === 'physical' ? styles.active : ''}`}
            onClick={() => setFormData({ ...formData, mealType: 'physical', location: formData.location || null })}
          >
            <span className={styles.typeIcon}>📍</span>
            <span className={styles.typeText}>{t('meals.form.physicalType')}</span>
            <small className={styles.typeDescription}>{t('meals.form.physicalDescription')}</small>
          </button>
        </div>
        <div className={styles.typeInfo}>
          {formData.mealType === 'virtual' ? t('meals.form.virtualInfo') : t('meals.form.physicalInfo')}
        </div>
      </div>

      {formData.mealType === 'physical' && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('meals.form.visibilityLabel')}</label>
          <div className={styles.visibilitySelector}>
            <button type="button" className={`${styles.visibilityButton} ${formData.isPublic ? styles.active : ''}`} onClick={() => setFormData({ ...formData, isPublic: true })}>
              <span className={styles.visibilityIcon}>🌍</span>
              <span className={styles.visibilityText}>{t('meals.form.publicVisibility')}</span>
              <small className={styles.visibilityDescription}>{t('meals.form.publicDescription')}</small>
            </button>
            <button type="button" className={`${styles.visibilityButton} ${!formData.isPublic ? styles.active : ''}`} onClick={() => setFormData({ ...formData, isPublic: false })}>
              <span className={styles.visibilityIcon}>🔒</span>
              <span className={styles.visibilityText}>{t('meals.form.privateVisibility')}</span>
              <small className={styles.visibilityDescription}>{t('meals.form.privateDescription')}</small>
            </button>
          </div>
          <div className={styles.visibilityInfo}>
            {formData.isPublic ? t('meals.form.publicInfo') : t('meals.form.privateInfo')}
          </div>
        </div>
      )}

      <Form.Group className="mb-3">
        <Form.Label className={styles.formLabel}>{t('meals.form.titleLabel')}</Form.Label>
        <Form.Control className={`${styles.formControl} ${errors.title ? 'is-invalid' : ''}`} type="text" name="title" value={formData.title} onChange={handleChange} onBlur={handleBlur} required />
        {errors.title && <div className="invalid-feedback">{errors.title}</div>}
      </Form.Group>
      
      <Form.Group className="mb-3">
        <Form.Label className={styles.formLabel}>{t('meals.form.descriptionLabel')}</Form.Label>
        <Form.Control className={`${styles.formControl} ${errors.description ? 'is-invalid' : ''}`} as="textarea" rows={3} name="description" value={formData.description} onChange={handleChange} onBlur={handleBlur} required />
        {errors.description && <div className="invalid-feedback">{errors.description}</div>}
      </Form.Group>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('meals.form.categoryLabel')}</Form.Label>
            <Form.Select className={styles.formSelect} name="type" value={formData.type} onChange={handleChange} required>
              <option value="" disabled>{t('meals.form.selectCategory')}</option>
              {mealTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('meals.form.maxParticipantsLabel')}</Form.Label>
            <Form.Control className={`${styles.formControl} ${errors.maxParticipants ? 'is-invalid' : ''}`} type="number" name="maxParticipants" value={formData.maxParticipants} onChange={handleChange} onBlur={handleBlur} required min="2" max="10" />
            {errors.maxParticipants && <div className="invalid-feedback">{errors.maxParticipants}</div>}
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('meals.form.languageLabel')}</Form.Label>
            <Form.Select className={styles.formSelect} name="language" value={formData.language} onChange={handleChange} required>
              {languageOptions.map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('meals.form.durationLabel')}</Form.Label>
            <Form.Select className={styles.formSelect} name="duration" value={formData.duration} onChange={handleChange} required>
              {durationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {formData.mealType === 'physical' && (
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('meals.form.priceLabel') || 'Prezzo Stimato (€)'}</Form.Label>
              <div className="input-group">
                <span className="input-group-text">€</span>
                <Form.Control className={styles.formControl} type="number" name="estimatedCost" value={formData.estimatedCost} onChange={handleChange} placeholder="Es. 25" min="0" />
              </div>
              <Form.Text className="text-muted">Costo medio a persona (solo indicativo)</Form.Text>
            </Form.Group>
          </Col>
        </Row>
      )}

      <Row className="mb-3">
        <Col xs={12} md={6}>
          <Form.Group>
            <Form.Label className={styles.formLabel}>{t('meals.form.dateLabel')}</Form.Label>
            <div className={styles.dateInputContainer}>
              <Form.Control
                className={`${styles.formControl} ${errors.date ? 'is-invalid' : ''}`}
                type="datetime-local"
                name="date"
                value={formData.date}
                min={getMinValidDateTime()}
                onChange={handleChange}
                onBlur={handleBlur}
                required
              />
              <button
                type="button"
                className={styles.dateHelperButton}
                onClick={() => {
                  const now = new Date();
                  const d = new Date(now.getTime() + 60 * 60 * 1000);
                  const fmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                  setFormData(prev => ({ ...prev, date: fmt }));
                  setErrors(prev => ({ ...prev, date: '' }));
                }}
                title="Suggerisci data valida (1 ora da ora)"
              >
                🕐
              </button>
            </div>
            {errors.date && <div className="invalid-feedback">{errors.date}</div>}
            <Form.Text className="text-muted">📅 Seleziona una data e ora nel futuro</Form.Text>
          </Form.Group>
        </Col>
        <Col xs={12} md={6}>
          {formData.mealType === 'physical' && (
            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('meals.form.addressLabel')}</Form.Label>
              <Form.Control
                className={`${styles.formControl} ${errors.location && errors.location !== 'Ricerca indirizzo...' ? 'is-invalid' : ''}`}
                type="text"
                name="address"
                value={
                  formData.location && typeof formData.location === 'object' && typeof formData.location.address === 'string'
                    ? formData.location.address
                    : ''
                }
                onChange={handleAddressChange}
                onBlur={handleAddressBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddressBlur(e); } }}
                placeholder={t('meals.form.addressPlaceholder')}
              />
              {errors.location && (
                <div className={errors.location === 'Ricerca indirizzo...' ? 'text-info' : 'invalid-feedback'}>
                  {errors.location}
                </div>
              )}
              <Form.Text className="text-muted">📍 Inserisci l'indirizzo manualmente o selezionalo dalla mappa</Form.Text>
            </Form.Group>
          )}
        </Col>
      </Row>

      {formData.mealType === 'physical' && (
        <div className={styles.formGroup}>
          <label>📍 Seleziona posizione del pasto:</label>
          <OpenStreetMapComponent
            selectedLocation={selectedLocation}
            onLocationSelect={handleLocationSelect}
            height="300px"
            center={
              selectedLocation
                ? [selectedLocation.lat, selectedLocation.lng]
                : formData.location && formData.location.coordinates
                  ? [formData.location.coordinates[1], formData.location.coordinates[0]]
                  : [45.4642, 9.1900]
            }
          />
          {selectedLocation && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
              ✅ <strong>Posizione selezionata:</strong><br />
              <span style={{ fontSize: '14px', color: '#666' }}>
                {selectedLocation.address || `Lat: ${selectedLocation.lat.toFixed(4)}, Lng: ${selectedLocation.lng.toFixed(4)}`}
              </span>
            </div>
          )}
        </div>
      )}
      
      <Form.Group className="mb-3">
        <Form.Label className={styles.formLabel}>{t('meals.form.topicsLabel')}</Form.Label>
        <TopicInput topics={formData.topics} setTopics={handleTopicsChange} />
        {errors.topics && <div className="invalid-feedback d-block">{errors.topics}</div>}
        <Form.Text>{t('meals.form.topicsHelp')}</Form.Text>
      </Form.Group>
      
      <Form.Group className="mb-3">
        <Form.Label>{t('meals.form.coverImageLabel')}</Form.Label>

        {/* Anteprima immagine: esistente (edit) o appena selezionata */}
        {imagePreview && (
          <div style={{ marginBottom: '8px' }}>
            <img
              src={imagePreview}
              alt={t('meals.form.coverImageAlt')}
              className={styles.imagePreview}
              style={{ maxHeight: '180px', borderRadius: '8px', objectFit: 'cover' }}
            />
            {!imageFile && initialData?.coverImage && (
              <Form.Text className="text-muted d-block">Immagine attuale — seleziona una nuova per cambiarla</Form.Text>
            )}
          </div>
        )}
        
        {Capacitor.isNativePlatform() ? (
          <div className="mt-2">
            <div className="d-flex gap-2 flex-wrap">
              <Button variant="outline-primary" onClick={() => handleCameraSelect(CameraSource.Camera)} style={{ fontSize: '0.9em' }}>📷 Fotocamera</Button>
              <Button variant="outline-primary" onClick={() => handleCameraSelect(CameraSource.Photos)} style={{ fontSize: '0.9em' }}>🖼️ Libreria Foto</Button>
            </div>
            <Form.Text className="text-muted d-block mt-2">Seleziona una foto dalla fotocamera o dalla libreria (max 10MB)</Form.Text>
          </div>
        ) : (
          <>
            <Form.Control type="file" accept="image/*" onChange={handleFileSelect} className="mt-2" style={{ fontSize: '0.9em' }} />
            <Form.Text className="text-muted">Seleziona un'immagine dal tuo dispositivo (max 10MB)</Form.Text>
          </>
        )}
        
        {imageFile && (
          <div className="mt-2 p-2 bg-light rounded" style={{ fontSize: '0.9em' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📷 Nuova immagine selezionata</span>
              <small className="text-muted">{imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)</small>
            </div>
          </div>
        )}
      </Form.Group>
      
      <div className={styles.stickyActions}>
        <Button variant="primary" type="submit" className={styles.submitButton} disabled={isLoading || isSubmitting}>
          {isLoading || isSubmitting ? (
            <><Spinner as="span" animation="border" size="sm" /><span> {isSubmitting ? t('meals.form.saving') : t('meals.form.loading')}</span></>
          ) : (
            submitButtonText || t('forms.save')
          )}
        </Button>
      </div>
    </Form>
  );
};

export default MealForm;
