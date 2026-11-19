import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { mealTypeOptions } from '../../../constants/mealConstants';
import { useMealTranslations } from '../../../hooks/useMealTranslations';
import TopicInput from '../TopicInput';
import OpenStreetMapComponent from '../../maps/OpenStreetMapComponent';
import {
  sanitizeMealData,
  containsDangerousContent,
} from '../../../services/sanitizationService';
import mealService from '../../../services/mealService';
import { Button } from '../../ui';
import styles from './MealForm.module.css';

const LANGUAGE_OPTIONS = [
  'Italiano',
  'English',
  'Español',
  'Français',
  'Deutsch',
  '中文',
  'العربية',
];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS_STEPPER = 8;

const formatLocalDateTime = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const MealForm = ({
  initialData,
  onSubmit,
  isLoading = false,
  isSubmitting = false,
  submitButtonText = '',
}) => {
  const { t, i18n } = useTranslation();
  const { getMealTypeText } = useMealTranslations();

  const durationOptions = [
    { value: 30, label: t('meals.form.durationOptions.30min', '30 min') },
    { value: 60, label: t('meals.form.durationOptions.1hour', '1 ora') },
    { value: 90, label: t('meals.form.durationOptions.1hour30', '1 ora e ½') },
    { value: 120, label: t('meals.form.durationOptions.2hours', '2 ore') },
    { value: 150, label: t('meals.form.durationOptions.2hours30', '2 ore e ½') },
    { value: 180, label: t('meals.form.durationOptions.3hours', '3 ore') },
  ];

  const getInitialState = () => {
    const suggestedDate = new Date(Date.now() + 60 * 60 * 1000);
    const defaultLang = (i18n.language || 'it').toLowerCase().startsWith('en')
      ? 'English'
      : 'Italiano';

    return {
      title: '',
      description: '',
      mealType: 'virtual',
      type: 'lunch',
      date: formatLocalDateTime(suggestedDate),
      duration: 60,
      maxParticipants: 4,
      language: defaultLang,
      topics: [],
      location: null,
      isPublic: true,
      estimatedCost: '',
    };
  };

  const [formData, setFormData] = useState(getInitialState);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [imageError, setImageError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (!initialData) return;
    const merged = { ...getInitialState(), ...initialData };

    if (merged.location && typeof merged.location === 'object' && merged.location.address) {
      merged.location = {
        ...merged.location,
        address: typeof merged.location.address === 'string' ? merged.location.address : '',
      };
    } else {
      merged.location = null;
    }

    if (merged.date) {
      const d = new Date(merged.date);
      if (!Number.isNaN(d.getTime())) {
        merged.date = formatLocalDateTime(d);
      }
    }

    setFormData(merged);

    const existingImage = initialData.imageUrl || initialData.coverImage;
    if (existingImage) {
      const existingUrl = mealService.getFullMealImageUrl(existingImage);
      if (existingUrl) setImagePreview(existingUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  useEffect(() => {
    if (
      formData.location &&
      typeof formData.location === 'object' &&
      formData.location.coordinates
    ) {
      setSelectedLocation({
        lat: formData.location.coordinates[1],
        lng: formData.location.coordinates[0],
        address: formData.location.address || '',
      });
    } else {
      setSelectedLocation(null);
    }
  }, [formData.location]);

  const getMinValidDateTime = () => formatLocalDateTime(new Date());

  const validateField = (name, value, currentMealType = formData.mealType) => {
    switch (name) {
      case 'title': {
        const str = String(value || '').trim();
        if (!str) return t('create.titleError', 'Dai un titolo al tuo tavolo (almeno 5 caratteri).');
        if (str.length < 5) return t('meals.form.titleMinLength', 'Il titolo deve avere almeno 5 caratteri.');
        if (str.length > 50) return t('meals.form.titleMaxLength', 'Il titolo non può superare i 50 caratteri.');
        if (containsDangerousContent(str)) {
          return 'Il titolo contiene contenuto non permesso (HTML/JavaScript).';
        }
        return '';
      }
      case 'description': {
        const str = String(value || '').trim();
        if (!str) return t('create.descError', 'Aggiungi una breve descrizione (almeno 10 caratteri).');
        if (str.length < 10) return t('meals.form.descriptionMinLength', 'La descrizione deve avere almeno 10 caratteri.');
        if (str.length > 1000) return t('meals.form.descriptionMaxLength', 'La descrizione non può superare i 1000 caratteri.');
        if (containsDangerousContent(str)) {
          return 'La descrizione contiene contenuto non permesso (HTML/JavaScript).';
        }
        return '';
      }
      case 'date': {
        if (!value) return t('create.whenError', 'Scegli una data e ora nel futuro.');
        const selectedDate = new Date(value);
        const now = new Date();
        if (Number.isNaN(selectedDate.getTime()) || selectedDate <= now) {
          return t('create.whenError', 'Scegli una data e ora nel futuro.');
        }
        const maxFutureDate = new Date(
          now.getFullYear() + 1,
          now.getMonth(),
          now.getDate()
        );
        if (selectedDate > maxFutureDate) {
          return t(
            'meals.form.dateTooFar',
            'La data non può essere più di un anno nel futuro.'
          );
        }
        return '';
      }
      case 'maxParticipants': {
        const n = Number(value);
        const upperLimit = initialData ? 10 : MAX_PARTICIPANTS_STEPPER;
        if (!n || n < MIN_PARTICIPANTS) {
          return t('meals.form.maxParticipantsMin', 'Minimo 2 partecipanti.');
        }
        if (n > upperLimit) {
          return t('meals.form.maxParticipantsMax', `Massimo ${upperLimit} partecipanti.`);
        }
        return '';
      }
      case 'location': {
        if (
          currentMealType === 'physical' &&
          (!value || (typeof value === 'object' && !value.address?.trim()))
        ) {
          return t('meals.form.locationRequired', 'La posizione è obbligatoria per un t2t in presenza.');
        }
        return '';
      }
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'duration' ? Number(value) : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    const err = validateField(name, nextValue);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleStepParticipants = (delta) => {
    setFormData((prev) => {
      const current = Number(prev.maxParticipants) || MIN_PARTICIPANTS;
      const next = Math.min(
        MAX_PARTICIPANTS_STEPPER,
        Math.max(MIN_PARTICIPANTS, current + delta)
      );
      setErrors((e) => ({ ...e, maxParticipants: '' }));
      return { ...prev, maxParticipants: next };
    });
  };

  const handleTopicsChange = (newTopics) => {
    setFormData((prev) => ({ ...prev, topics: newTopics }));
  };

  const geocodeAddress = async (address) => {
    if (!address || address.trim().length < 3) return null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        { headers: { 'User-Agent': 'table2Talk App' }, signal: controller.signal }
      );
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          address: result.display_name || address,
        };
      }
      return null;
    } catch (_) {
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
          { headers: { 'User-Agent': 'table2Talk App' }, signal: controller.signal }
        );
        clearTimeout(timeoutId);
        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) address = data.display_name;
        }
      } catch (_) {}
    }
    const finalAddress =
      address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    setSelectedLocation({ ...location, address: finalAddress });
    setFormData((prev) => ({
      ...prev,
      location: { address: finalAddress, coordinates: [location.lng, location.lat] },
    }));
    setErrors((prev) => ({ ...prev, location: '' }));
  };

  const handleAddressChange = (e) => {
    const address = e.target.value;
    if (!address || address.trim().length === 0) {
      setSelectedLocation(null);
      setFormData((prev) => ({ ...prev, location: null }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      location: prev.location
        ? { ...prev.location, address }
        : { address, coordinates: null },
    }));
  };

  const handleAddressBlur = async (e) => {
    const address = e.target.value.trim();
    if (!address || address.length < 3) return;
    setErrors((prev) => ({ ...prev, location: 'Ricerca indirizzo…' }));
    const location = await geocodeAddress(address);
    if (location) {
      setSelectedLocation(location);
      setFormData((prev) => ({
        ...prev,
        location: { address: location.address, coordinates: [location.lng, location.lat] },
      }));
      setErrors((prev) => ({ ...prev, location: '' }));
    } else {
      setErrors((prev) => ({
        ...prev,
        location: 'Indirizzo non trovato. Prova a selezionarlo dalla mappa.',
      }));
    }
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
    } catch (_) {
      return blob;
    }
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const processImageFile = async (file, fileName = 'image.jpg') => {
    setImageError('');
    if (!file || !file.type || !file.type.startsWith('image/')) {
      setImageError(
        t('create.coverInvalidType', 'Seleziona solo file immagine (JPG, PNG, WebP).')
      );
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(t('create.coverTooLarge', 'Immagine troppo grande (massimo 10MB).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);

    let processedFile = file;
    if (file.size > 4 * 1024 * 1024) {
      try {
        const blob = await compressImageBlob(file, { maxWidth: 1600, quality: 0.7 });
        processedFile = new File([blob], file.name || fileName, { type: 'image/jpeg' });
      } catch (_) {
        processedFile = file;
      }
    }
    setImageFile(processedFile);

    try {
      const base64 = await blobToBase64(processedFile);
      if (typeof base64 === 'string') setImageBase64(base64);
    } catch (_) {}
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processImageFile(file, file.name);
    event.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      await processImageFile(file, file.name);
    }
  };

  const handleCameraSelect = async (source = CameraSource.Photos) => {
    setImageError('');
    try {
      const permissionStatus = await Camera.checkPermissions();
      const neededPermission = source === CameraSource.Camera ? 'camera' : 'photos';
      if (
        permissionStatus[neededPermission] === 'denied' ||
        permissionStatus[neededPermission] === 'prompt'
      ) {
        const requestResult = await Camera.requestPermissions({
          permissions: [neededPermission],
        });
        if (requestResult[neededPermission] === 'denied') {
          setImageError(
            `Permessi necessari per la ${source === CameraSource.Camera ? 'fotocamera' : 'libreria foto'}.`
          );
          return;
        }
      }
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
        width: 1600,
        height: 1600,
      });
      if (!image || !image.dataUrl) return;
      const response = await fetch(image.dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await processImageFile(file, file.name);
    } catch (error) {
      console.error('Errore selezione foto:', error);
      setImageError('Errore durante la selezione della foto.');
    }
  };

  const handleRemoveImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    setImageBase64('');
    setImageError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    ['title', 'description', 'date', 'maxParticipants', 'location'].forEach((key) => {
      const err = validateField(key, formData[key], formData.mealType);
      if (err) newErrors[key] = err;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const sanitizedData = sanitizeMealData(formData);
    const formDataToSend = new FormData();

    // Contratto API invariato — stessi nomi dei campi
    const SCALAR_FIELDS = [
      'title',
      'description',
      'mealType',
      'type',
      'language',
      'isPublic',
      'estimatedCost',
      'maxParticipants',
      'duration',
    ];

    for (const key of SCALAR_FIELDS) {
      const value = sanitizedData[key];
      if (value === null || value === undefined) continue;
      formDataToSend.append(key, value);
    }

    if (sanitizedData.date) {
      formDataToSend.append('date', new Date(sanitizedData.date).toISOString());
    }

    if (Array.isArray(sanitizedData.topics)) {
      sanitizedData.topics.forEach((topic) => formDataToSend.append('topics', topic));
    }

    if (
      sanitizedData.mealType === 'physical' &&
      sanitizedData.location &&
      typeof sanitizedData.location === 'object' &&
      sanitizedData.location.address
    ) {
      formDataToSend.append('location', JSON.stringify(sanitizedData.location));
    }

    if (imageFile) {
      formDataToSend.append('image', imageFile);
      if (imageBase64) formDataToSend.append('imageBase64', imageBase64);
      if (imagePreview) formDataToSend.append('imageLocalUri', imagePreview);
    } else {
      const existingImageUrl = initialData?.imageUrl || initialData?.coverImage;
      if (existingImageUrl) {
        formDataToSend.append('existingImageUrl', existingImageUrl);
      }
    }

    onSubmit(formDataToSend);
  };

  const busy = Boolean(isLoading || isSubmitting);

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {/* 1. Segmented Tipo: Virtuale / In presenza */}
      <div className={styles.field}>
        <label className={styles.label}>
          {t('create.typeLabel', 'Tipo di t2t')}
        </label>
        <div className={styles.seg} role="radiogroup" aria-label={t('create.typeLabel', 'Tipo di t2t')}>
          <button
            type="button"
            role="radio"
            aria-checked={formData.mealType === 'virtual'}
            className={`${styles.segBtn} ${formData.mealType === 'virtual' ? styles.segActive : ''}`}
            onClick={() => {
              setFormData((prev) => ({ ...prev, mealType: 'virtual', location: null }));
              setErrors((prev) => ({ ...prev, location: '' }));
            }}
            data-testid="seg-virtual"
          >
            <span className={styles.segTitle}>💻 {t('create.virtualLabel', 'Virtuale')}</span>
            <small className={styles.segSub}>{t('create.virtualSub', 'Videochiamata')}</small>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={formData.mealType === 'physical'}
            className={`${styles.segBtn} ${formData.mealType === 'physical' ? styles.segActive : ''}`}
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                mealType: 'physical',
                location: prev.location || null,
              }))
            }
            data-testid="seg-physical"
          >
            <span className={styles.segTitle}>📍 {t('create.physicalLabel', 'In presenza')}</span>
            <small className={styles.segSub}>{t('create.physicalSub', 'Dal vivo')}</small>
          </button>
        </div>
      </div>

      {/* Visibilità (solo in presenza) */}
      {formData.mealType === 'physical' && (
        <div className={styles.field}>
          <label className={styles.label}>{t('meals.form.visibilityLabel', 'Visibilità')}</label>
          <div className={styles.seg}>
            <button
              type="button"
              className={`${styles.segBtn} ${formData.isPublic ? styles.segActive : ''}`}
              onClick={() => setFormData((prev) => ({ ...prev, isPublic: true }))}
            >
              <span className={styles.segTitle}>🌍 {t('meals.form.publicVisibility', 'Pubblico')}</span>
              <small className={styles.segSub}>{t('meals.form.publicDescription', 'Visibile sulla mappa')}</small>
            </button>
            <button
              type="button"
              className={`${styles.segBtn} ${!formData.isPublic ? styles.segActive : ''}`}
              onClick={() => setFormData((prev) => ({ ...prev, isPublic: false }))}
            >
              <span className={styles.segTitle}>🔒 {t('meals.form.privateVisibility', 'Privato')}</span>
              <small className={styles.segSub}>{t('meals.form.privateDescription', 'Solo su invito')}</small>
            </button>
          </div>
        </div>
      )}

      {/* 2. Titolo */}
      <div className={styles.field}>
        <label htmlFor="mealTitle" className={styles.label}>
          {t('create.titleLabel', 'Titolo')}
        </label>
        <input
          id="mealTitle"
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t('create.titlePlaceholder', 'Es. Aperitivo in spagnolo')}
          className={`${styles.control} ${errors.title ? styles.controlErr : ''}`}
          required
          data-testid="create-title"
        />
        {errors.title && (
          <div className={styles.err} role="alert">
            {errors.title}
          </div>
        )}
      </div>

      {/* 3. Descrizione */}
      <div className={styles.field}>
        <label htmlFor="mealDesc" className={styles.label}>
          {t('create.descLabel', 'Descrizione')}
        </label>
        <textarea
          id="mealDesc"
          name="description"
          rows={3}
          value={formData.description}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={t(
            'create.descPlaceholder',
            'Racconta il mood del tavolo: cosa si mangia, di che si parla.'
          )}
          className={`${styles.control} ${errors.description ? styles.controlErr : ''}`}
          required
          data-testid="create-desc"
        />
        {errors.description && (
          <div className={styles.err} role="alert">
            {errors.description}
          </div>
        )}
      </div>

      {/* 4. Categoria + Lingua */}
      <div className={styles.row2}>
        <div className={styles.field}>
          <label htmlFor="mealCategory" className={styles.label}>
            {t('create.categoryLabel', 'Categoria')}
          </label>
          <select
            id="mealCategory"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className={styles.control}
            data-testid="create-category"
          >
            {mealTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {getMealTypeText(opt.value) || opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="mealLang" className={styles.label}>
            {t('create.languageLabel', 'Lingua')}
          </label>
          <select
            id="mealLang"
            name="language"
            value={formData.language}
            onChange={handleChange}
            className={styles.control}
            data-testid="create-language"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Max partecipanti (stepper 2–8) + Durata */}
      <div className={styles.row2}>
        <div className={styles.field}>
          <label className={styles.label}>
            {t('create.maxParticipantsLabel', 'Max partecipanti')}
          </label>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.stepBtn}
              onClick={() => handleStepParticipants(-1)}
              disabled={Number(formData.maxParticipants) <= MIN_PARTICIPANTS}
              aria-label={t('create.decreaseParticipants', 'Riduci partecipanti')}
              data-testid="stepper-minus"
            >
              −
            </button>
            <span className={styles.stepVal} data-testid="stepper-value">
              {formData.maxParticipants}
            </span>
            <button
              type="button"
              className={styles.stepBtn}
              onClick={() => handleStepParticipants(1)}
              disabled={Number(formData.maxParticipants) >= MAX_PARTICIPANTS_STEPPER}
              aria-label={t('create.increaseParticipants', 'Aumenta partecipanti')}
              data-testid="stepper-plus"
            >
              ＋
            </button>
          </div>
          {errors.maxParticipants && (
            <div className={styles.err} role="alert">
              {errors.maxParticipants}
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="mealDuration" className={styles.label}>
            {t('create.durationLabel', 'Durata')}
          </label>
          <select
            id="mealDuration"
            name="duration"
            value={formData.duration}
            onChange={handleChange}
            className={styles.control}
            data-testid="create-duration"
          >
            {durationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 6. Data e ora (validazione futuro) */}
      <div className={styles.field}>
        <label htmlFor="mealWhen" className={styles.label}>
          {t('create.whenLabel', 'Data e ora')}
        </label>
        <div className={styles.dateRow}>
          <input
            id="mealWhen"
            type="datetime-local"
            name="date"
            value={formData.date}
            min={getMinValidDateTime()}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`${styles.control} ${errors.date ? styles.controlErr : ''}`}
            required
            data-testid="create-when"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = formatLocalDateTime(new Date(Date.now() + 60 * 60 * 1000));
              setFormData((prev) => ({ ...prev, date: next }));
              setErrors((prev) => ({ ...prev, date: '' }));
            }}
          >
            {t('create.whenSuggest', '+1 ora')}
          </Button>
        </div>
        <div className={styles.hint}>
          {t('create.whenHint', 'Scegli un momento nel futuro ⏳')}
        </div>
        {errors.date && (
          <div className={styles.err} role="alert" data-testid="create-when-error">
            {errors.date}
          </div>
        )}
      </div>

      {/* Posizione & Costo stimato (solo In presenza) */}
      {formData.mealType === 'physical' && (
        <>
          <div className={styles.row2}>
            <div className={styles.field}>
              <label htmlFor="mealAddress" className={styles.label}>
                {t('create.locationLabel', 'Posizione')}
              </label>
              <input
                id="mealAddress"
                type="text"
                name="address"
                value={
                  formData.location &&
                  typeof formData.location === 'object' &&
                  typeof formData.location.address === 'string'
                    ? formData.location.address
                    : ''
                }
                onChange={handleAddressChange}
                onBlur={handleAddressBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddressBlur(e);
                  }
                }}
                placeholder={t('meals.form.addressPlaceholder', 'Es. Via Torino 10, Milano')}
                className={`${styles.control} ${errors.location && errors.location !== 'Ricerca indirizzo…' ? styles.controlErr : ''}`}
              />
              <div className={styles.hint}>
                {t('create.locationHint', "Inserisci l'indirizzo o seleziona il punto sulla mappa.")}
              </div>
              {errors.location && (
                <div className={styles.err} role="alert">
                  {errors.location}
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="mealCost" className={styles.label}>
                {t('create.estimatedCostLabel', 'Costo stimato (€)')}
              </label>
              <input
                id="mealCost"
                type="number"
                name="estimatedCost"
                min="0"
                value={formData.estimatedCost}
                onChange={handleChange}
                placeholder="Es. 20"
                className={styles.control}
              />
              <div className={styles.hint}>
                {t('create.estimatedCostHint', 'Costo medio a persona (facoltativo)')}
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.mapFrame}>
              <OpenStreetMapComponent
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
                height="260px"
                center={
                  selectedLocation
                    ? [selectedLocation.lat, selectedLocation.lng]
                    : formData.location?.coordinates
                    ? [formData.location.coordinates[1], formData.location.coordinates[0]]
                    : [45.4642, 9.19]
                }
              />
            </div>
            {selectedLocation && (
              <div className={styles.locationPill}>
                <strong>{t('create.locationSelected', 'Posizione selezionata')}:</strong>{' '}
                <span>{selectedLocation.address}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* 7. Argomenti (chip input max 5 + contatore n/5) */}
      <div className={styles.field}>
        <label className={styles.label}>
          {t('create.topicsLabel', 'Argomenti')}{' '}
          <span className={styles.counter} data-testid="topics-counter">
            ({formData.topics.length}/5)
          </span>
        </label>
        <TopicInput topics={formData.topics} setTopics={handleTopicsChange} />
      </div>

      {/* 8. Copertina (dropzone con preview FileReader, solo immagini, max 10MB) */}
      <div className={styles.field}>
        <label htmlFor="mealCoverInput" className={styles.label}>
          {t('create.coverLabel', 'Immagine di copertina')}
        </label>

        {Capacitor.isNativePlatform() ? (
          <div className={styles.nativeCoverBox}>
            {imagePreview && (
              <img
                src={imagePreview}
                alt={t('meals.form.coverImageAlt', 'Anteprima copertina')}
                className={styles.dzPreview}
              />
            )}
            <div className={styles.nativeBtns}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCameraSelect(CameraSource.Camera)}
              >
                📷 Fotocamera
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCameraSelect(CameraSource.Photos)}
              >
                🖼️ Libreria foto
              </Button>
              {imagePreview && (
                <Button variant="danger" size="sm" onClick={handleRemoveImage}>
                  {t('create.coverRemove', 'Rimuovi immagine')}
                </Button>
              )}
            </div>
            <div className={styles.hint}>JPG/PNG · max 10MB</div>
          </div>
        ) : (
          <label
            htmlFor="mealCoverInput"
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''} ${imageError ? styles.controlErr : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            data-testid="cover-dropzone"
          >
            <span className={styles.dzText}>
              {imageFile
                ? `${t('create.coverReady', '✓ Immagine pronta')} · ${imageFile.name} (${(imageFile.size / 1024 / 1024).toFixed(2)} MB)`
                : imagePreview
                ? t('create.coverExisting', 'Immagine attuale — trascina o clicca per cambiarla')
                : t(
                    'create.coverDropzone',
                    "📷 Trascina o scegli un'immagine · JPG/PNG · max 10MB"
                  )}
            </span>

            {imagePreview && (
              <div className={styles.previewWrap}>
                <img
                  src={imagePreview}
                  alt={t('meals.form.coverImageAlt', 'Anteprima copertina')}
                  className={styles.dzPreview}
                />
                {imageFile && (
                  <button
                    type="button"
                    className={styles.removeCoverBtn}
                    onClick={handleRemoveImage}
                  >
                    {t('create.coverRemove', 'Rimuovi immagine')}
                  </button>
                )}
              </div>
            )}

            <input
              id="mealCoverInput"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className={styles.hiddenInput}
              data-testid="cover-input"
            />
          </label>
        )}

        {imageError && (
          <div className={styles.err} role="alert" data-testid="cover-error">
            {imageError}
          </div>
        )}
      </div>

      {/* 9. CTA sticky */}
      <div className={styles.formCta}>
        <Button
          variant="primary"
          type="submit"
          disabled={busy}
          className={styles.submitBtn}
          data-testid="create-submit"
        >
          {busy
            ? t('create.savingCta', 'Creazione in corso…')
            : submitButtonText || t('create.submitCta', 'Crea il t2t')}
        </Button>
        <span className={styles.ctaHint}>
          {t('create.stickyHint', 'Gratis · modificabile quando vuoi')}
        </span>
      </div>
    </form>
  );
};

export default MealForm;
