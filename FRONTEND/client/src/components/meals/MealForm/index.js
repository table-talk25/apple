// File: /src/components/meals/MealForm.js (Versione Corretta e Aggiornata)

import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { mealTypeOptions } from '../../../constants/mealConstants';
import styles from './MealForm.module.css'; 
// import dayjs from 'dayjs'; // Rimosso: non utilizzato
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import TopicInput from '../TopicInput';
import OpenStreetMapComponent from '../../maps/OpenStreetMapComponent';
// import PlacesAutocompleteInput from '../../Map/PlacesAutocompleteInput'; // Rimosso: manteniamo solo OpenStreetMap
import { sanitizeMealData, containsDangerousContent } from '../../../services/sanitizationService';

        // Opzioni per la durata del TableTalk®
const languageOptions = ['Italiano', 'English', 'Español', 'Français', 'Deutsch', '中文', 'العربية'];

const MealForm = ({ initialData, onSubmit, onCancel, isLoading, isSubmitting, submitButtonText }) => {
  const { t } = useTranslation();
  
  // Opzioni di durata tradotte
  const durationOptions = [
    { value: 30, label: t('meals.form.durationOptions.30min') },
    { value: 60, label: t('meals.form.durationOptions.1hour') },
    { value: 90, label: t('meals.form.durationOptions.1hour30') },
    { value: 120, label: t('meals.form.durationOptions.2hours') },
    { value: 150, label: t('meals.form.durationOptions.2hours30') },
    { value: 180, label: t('meals.form.durationOptions.3hours') },
  ];

  // Definiamo uno stato di default pulito
  const getInitialState = () => {
    // 🔒 VALIDAZIONE DATA: Suggerisci una data valida di default
    const now = new Date();
    const suggestedDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 ora da ora
    
    // Formatta per input datetime-local
    const year = suggestedDate.getFullYear();
    const month = String(suggestedDate.getMonth() + 1).padStart(2, '0');
    const day = String(suggestedDate.getDate()).padStart(2, '0');
    const hours = String(suggestedDate.getHours()).padStart(2, '0');
    const minutes = String(suggestedDate.getMinutes()).padStart(2, '0');
    
    return {
      title: '',
      description: '',
      mealType: 'virtual', // Aggiungi questo! Iniziamo con 'virtual' come default
      type: 'lunch',
      date: `${year}-${month}-${day}T${hours}:${minutes}`, // 🔒 Data valida di default
      duration: 60,
      maxParticipants: 2,
      language: 'English',
      topics: [],
      location: null, // Assicurati che location sia null all'inizio
      isPublic: true, // Di default i TableTalk® sono pubblici
      estimatedCost: '', // Nuovo campo
    };
  };

  const [formData, setFormData] = useState(getInitialState());
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState('');
  const [errors, setErrors] = useState({});
  
  // ✅ AGGIUNGI: State per location
  const [selectedLocation, setSelectedLocation] = useState(null);

  // ✅ AGGIUNGI: Gestisci initialData quando viene passato
  useEffect(() => {
    if (initialData) {
      const sanitizedData = { ...getInitialState(), ...initialData };
      
      // Assicurati che location sia sempre null o un oggetto con address (stringa)
      if (sanitizedData.location) {
        if (typeof sanitizedData.location === 'object' && sanitizedData.location.address) {
          // Location valida, assicurati che address sia una stringa
          sanitizedData.location = {
            ...sanitizedData.location,
            address: typeof sanitizedData.location.address === 'string' 
              ? sanitizedData.location.address 
              : ''
          };
        } else {
          // Location non valida, resetta a null
          sanitizedData.location = null;
        }
      } else {
        sanitizedData.location = null;
      }
      
      setFormData(sanitizedData);
    }
  }, [initialData]);

  // ✅ AGGIUNGI: Sincronizza selectedLocation con formData.location
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

  // 🔒 VALIDAZIONE DATA: Calcola la data minima valida per l'input
  const getMinValidDateTime = () => {
    const now = new Date();
    // Tolleranza di 5 minuti per sincronizzazione dispositivi
    const toleranceMs = 5 * 60 * 1000;
    const minValidDate = new Date(now.getTime() - toleranceMs);
    
    // Formatta per input datetime-local (YYYY-MM-DDTHH:mm)
    const year = minValidDate.getFullYear();
    const month = String(minValidDate.getMonth() + 1).padStart(2, '0');
    const day = String(minValidDate.getDate()).padStart(2, '0');
    const hours = String(minValidDate.getHours()).padStart(2, '0');
    const minutes = String(minValidDate.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Funzione di validazione
  const validateField = (name, value) => {
    switch (name) {
      case 'title':
        if (!value.trim()) return t('meals.form.titleRequired');
        if (value.trim().length < 5) return t('meals.form.titleMinLength');
        if (value.trim().length > 50) return t('meals.form.titleMaxLength');
        
        // 🛡️ PROTEZIONE XSS: Controlla contenuto pericoloso
        if (containsDangerousContent(value)) {
          return 'Il titolo contiene contenuto non permesso (HTML/JavaScript)';
        }
        break;
      case 'description':
        if (!value.trim()) return t('meals.form.descriptionRequired');
        if (value.trim().length < 10) return t('meals.form.descriptionMinLength');
        if (value.trim().length > 1000) return t('meals.form.descriptionMaxLength');
        
        // 🛡️ PROTEZIONE XSS: Controlla contenuto pericoloso
        if (containsDangerousContent(value)) {
          return 'La descrizione contiene contenuto non permesso (HTML/JavaScript)';
        }
        break;
      case 'date':
        if (!value) return t('meals.form.dateRequired');
        
        // 🔒 VALIDAZIONE DATA: Impedisce selezione date passate
        const selectedDate = new Date(value);
        const now = new Date();
        
        // Tolleranza di 5 minuti per sincronizzazione dispositivi
        const toleranceMs = 5 * 60 * 1000; // 5 minuti
        const minValidDate = new Date(now.getTime() - toleranceMs);
        
        if (selectedDate < minValidDate) {
          return t('meals.form.datePast') || 'La data deve essere nel futuro';
        }
        
        // Validazione aggiuntiva: non permettere date troppo lontane nel futuro (es. > 1 anno)
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
        // Opzionale: niente errore se vuoto
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
    
    // 🔒 VALIDAZIONE DATA SPECIALE: Controllo immediato per date non valide
    if (name === 'date' && value) {
      const selectedDate = new Date(value);
      const now = new Date();
      const toleranceMs = 5 * 60 * 1000; // 5 minuti
      const minValidDate = new Date(now.getTime() - toleranceMs);
      
      // Se la data selezionata è nel passato, resetta il campo
      if (selectedDate < minValidDate) {
        console.warn('⚠️ [MealForm] Data nel passato selezionata, reset campo');
        setFormData(prev => ({ ...prev, date: '' }));
        setErrors(prev => ({
          ...prev,
          date: t('meals.form.datePast') || 'La data deve essere nel futuro'
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validazione in tempo reale
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleTopicsChange = (newTopics) => {
    setFormData(prev => ({ ...prev, topics: newTopics }));
    
    // Validazione per i topics
    const error = validateField('topics', newTopics);
    setErrors(prev => ({
      ...prev,
      topics: error
    }));
  };

  // ✅ AGGIUNGI: Funzione per geocodificare un indirizzo (testo -> coordinate)
  const geocodeAddress = async (address) => {
    if (!address || address.trim().length < 3) {
      return null;
    }

    try {
      // Usa Nominatim API (OpenStreetMap) per geocodificare con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout di 10 secondi
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TableTalk App' // Richiesto da Nominatim
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn('Geocodifica: risposta non OK', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          address: result.display_name || address
        };
      }
      
      return null;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Geocodifica: timeout della richiesta');
      } else {
        console.warn('Errore geocodifica indirizzo:', error.message);
      }
      return null;
    }
  };

  // ✅ AGGIUNGI: Handler per selezione location dalla mappa
  const handleLocationSelect = async (location) => {
    // Se non c'è un indirizzo, prova a fare reverse geocoding
    let address = location.address;
    
    if (!address && location.lat && location.lng) {
      try {
        // Reverse geocoding: coordinate -> indirizzo con timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout di 10 secondi
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'TableTalk App'
            },
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            address = data.display_name;
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.warn('Errore reverse geocoding:', error.message);
        }
      }
    }

    const finalAddress = address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    
    setSelectedLocation({
      ...location,
      address: finalAddress
    });
    
    setFormData(prev => ({
      ...prev,
      location: {
        address: finalAddress,
        coordinates: [location.lng, location.lat] // MongoDB usa [lng, lat]
      }
    }));
    
    // Rimuovi errori di location se presenti
    setErrors(prev => ({
      ...prev,
      location: null
    }));
  };

  // ✅ AGGIUNGI: Handler per quando l'utente digita l'indirizzo manualmente
  const handleAddressChange = async (e) => {
    const address = e.target.value;
    
    // Aggiorna il campo indirizzo nel formData
    setFormData(prev => ({
      ...prev,
      location: prev.location ? {
        ...prev.location,
        address: address
      } : {
        address: address,
        coordinates: null
      }
    }));

    // Se l'indirizzo è vuoto, resetta la location
    if (!address || address.trim().length === 0) {
      setSelectedLocation(null);
      setFormData(prev => ({
        ...prev,
        location: null
      }));
      return;
    }
  };

  // ✅ AGGIUNGI: Handler per quando l'utente finisce di digitare l'indirizzo (blur o Enter)
  const handleAddressBlur = async (e) => {
    const address = e.target.value.trim();
    
    if (!address || address.length < 3) {
      return;
    }

    // Mostra un indicatore di caricamento
    setErrors(prev => ({
      ...prev,
      location: 'Ricerca indirizzo...'
    }));

    // Geocodifica l'indirizzo
    const location = await geocodeAddress(address);
    
    if (location) {
      // Aggiorna la mappa con la posizione trovata
      setSelectedLocation(location);
      setFormData(prev => ({
        ...prev,
        location: {
          address: location.address,
          coordinates: [location.lng, location.lat]
        }
      }));
      
      // Rimuovi errori
      setErrors(prev => ({
        ...prev,
        location: null
      }));
    } else {
      // Indirizzo non trovato
      setErrors(prev => ({
        ...prev,
        location: 'Indirizzo non trovato. Prova a selezionarlo dalla mappa.'
      }));
    }
  };

  // ✅ Funzione per processare un file immagine (usata sia per web che mobile)
  const processImageFile = async (file, fileName = 'image.jpg') => {
    console.log('📁 [MealForm] processImageFile iniziato, file:', file.name, 'size:', file.size, 'type:', file.type);
    
    // Verifica che sia un'immagine
    if (!file || !file.type || !file.type.startsWith('image/')) {
      const errorMsg = 'Seleziona solo file immagine';
      console.error('📁 [MealForm]', errorMsg);
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    // Verifica dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = 'Il file è troppo grande. Massimo 10MB.';
      console.error('📁 [MealForm]', errorMsg);
      alert(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      console.log('📁 [MealForm] Creazione preview...');
      // Crea preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        console.log('📁 [MealForm] Preview creata');
      };
      reader.onerror = (error) => {
        console.error('📁 [MealForm] Errore FileReader:', error);
        throw new Error('Errore lettura file immagine');
      };
      reader.readAsDataURL(file);

      console.log('📁 [MealForm] Compressione se necessario...');
      // Comprimi se necessario
      let processedFile = file;
      if (file.size > 4 * 1024 * 1024) {
        console.log('📁 [MealForm] File grande, comprimendo...');
        try {
          const blob = await compressImageBlob(file, { maxWidth: 1600, quality: 0.7 });
          processedFile = new File([blob], fileName, { type: 'image/jpeg' });
          console.log('📁 [MealForm] Compressione completata, nuova size:', processedFile.size);
        } catch (compressError) {
          console.warn('📁 [MealForm] Errore compressione, uso file originale:', compressError);
          // Se la compressione fallisce, usa il file originale
          processedFile = file;
        }
      }

      setImageFile(processedFile);
      console.log('📁 [MealForm] File impostato nello state');
      
      // Genera base64 come fallback
      try {
        const base64 = await blobToBase64(processedFile);
        if (typeof base64 === 'string') {
          setImageBase64(base64);
          console.log('📁 [MealForm] Base64 generato');
        }
      } catch (base64Error) {
        console.warn('📁 [MealForm] Errore generazione base64 (non critico):', base64Error);
      }

      console.log('📁 [MealForm] File processato con successo:', processedFile.name, processedFile.size);
    } catch (error) {
      console.error("📁 [MealForm] Errore elaborazione file:", error);
      throw error; // Rilancia l'errore per gestirlo nel chiamante
    }
  };

  // ✅ Funzione per selezionare foto usando Capacitor Camera (mobile)
  const handleCameraSelect = async (source = CameraSource.Photos) => {
    try {
      console.log('📷 [MealForm] Inizio selezione foto, source:', source);
      
      // Richiedi permessi esplicitamente
      const permissionStatus = await Camera.checkPermissions();
      console.log('📷 [MealForm] Stato permessi:', permissionStatus);
      
      // Determina quali permessi servono in base alla sorgente
      const neededPermission = source === CameraSource.Camera ? 'camera' : 'photos';
      
      if (permissionStatus[neededPermission] === 'denied' || permissionStatus[neededPermission] === 'prompt') {
        console.log('📷 [MealForm] Richiesta permessi per:', neededPermission);
        // Richiedi permessi se non concessi
        const requestResult = await Camera.requestPermissions({
          permissions: [neededPermission]
        });
        console.log('📷 [MealForm] Risultato richiesta permessi:', requestResult);
        
        if (requestResult[neededPermission] === 'denied') {
          alert(`I permessi per ${source === CameraSource.Camera ? 'la fotocamera' : 'la libreria foto'} sono necessari per caricare le immagini. Abilitali nelle impostazioni del dispositivo.`);
          return;
        }
      }

      console.log('📷 [MealForm] Apertura fotocamera/libreria...');
      // Apri la fotocamera o la libreria foto
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source,
        width: 1600,
        height: 1600
      });

      console.log('📷 [MealForm] Foto selezionata:', image ? 'OK' : 'NULL');

      if (!image || !image.dataUrl) {
        console.warn('📷 [MealForm] Nessuna immagine ricevuta');
        alert('Nessuna immagine selezionata.');
        return;
      }

      console.log('📷 [MealForm] Conversione dataUrl in File...');
      // Converti dataUrl in File
      try {
        const response = await fetch(image.dataUrl);
        if (!response.ok) {
          throw new Error(`Errore fetch dataUrl: ${response.status}`);
        }
        
        const blob = await response.blob();
        if (!blob || blob.size === 0) {
          throw new Error('Blob vuoto o non valido');
        }
        
        console.log('📷 [MealForm] Blob creato, size:', blob.size);
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        console.log('📷 [MealForm] File creato, processando...');
        await processImageFile(file, file.name);
        console.log('📷 [MealForm] Foto processata con successo!');
      } catch (conversionError) {
        console.error('📷 [MealForm] Errore conversione:', conversionError);
        throw new Error(`Errore conversione immagine: ${conversionError.message}`);
      }
    } catch (error) {
      console.error('📷 [MealForm] Errore completo selezione foto:', error);
      console.error('📷 [MealForm] Stack:', error.stack);
      
      // Messaggio di errore più dettagliato per debug
      const errorMessage = error.message || 'Errore sconosciuto';
      alert(`Errore durante la selezione della foto: ${errorMessage}\n\nControlla la console per dettagli.`);
    }
  };

  // 📁 Gestione upload file dal computer (per browser web)
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    await processImageFile(file);
  };

  // Comprimi immagine usando canvas
  const compressImageBlob = async (blob, { maxWidth = 1600, quality = 0.7 } = {}) => {
    try {
      const imageBitmap = await createImageBitmap(blob);
      const scale = Math.min(1, maxWidth / imageBitmap.width);
      const targetWidth = Math.round(imageBitmap.width * scale);
      const targetHeight = Math.round(imageBitmap.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (e) {
      // in caso di fallimento, restituisci l'originale
      return blob;
    }
  };

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    } catch (e) { reject(e); }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 🔒 VALIDAZIONE DATA FINALE: Controllo aggiuntivo prima del submit
    if (formData.date) {
      const selectedDate = new Date(formData.date);
      const now = new Date();
      const toleranceMs = 5 * 60 * 1000; // 5 minuti
      const minValidDate = new Date(now.getTime() - toleranceMs);
      
      if (selectedDate < minValidDate) {
        console.warn('⚠️ [MealForm] Submit bloccato: data nel passato rilevata');
        setErrors(prev => ({
          ...prev,
          date: t('meals.form.datePast') || 'La data deve essere nel futuro'
        }));
        return; // Blocca il submit
      }
    }
    
    // Validazione completa prima del submit
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; // Non procedere se ci sono errori
    }

    // 🛡️ PROTEZIONE XSS: Sanitizza tutti i dati prima dell'invio
    const sanitizedData = sanitizeMealData(formData);
    
    // Log per debugging (solo in development)
    if (process.env.NODE_ENV === 'development') {
      const hasChanges = JSON.stringify(sanitizedData) !== JSON.stringify(formData);
      if (hasChanges) {
        console.log('🛡️ [MealForm] Dati sanitizzati prima dell\'invio:', {
          original: formData,
          sanitized: sanitizedData
        });
      }
    }

    const formDataToSend = new FormData();
    const dataToProcess = { ...sanitizedData };

    if (dataToProcess.date) {
      dataToProcess.date = new Date(dataToProcess.date).toISOString();
    }

    for (const key in dataToProcess) {
      if (key === 'topics' && Array.isArray(dataToProcess[key])) {
        dataToProcess[key].forEach(topic => formDataToSend.append('topics', topic));
      } else if (key === 'location' && dataToProcess[key]) {
        // Per i TableTalk® fisici, aggiungi la location
        formDataToSend.append('location', JSON.stringify(dataToProcess[key]));
      } else if (key !== 'location' || formData.mealType === 'physical') {
        // Aggiungi tutti i campi tranne location se è virtuale
        formDataToSend.append(key, dataToProcess[key]);
      }
    }
    
    if (imageFile) {
      formDataToSend.append('image', imageFile);
      if (imageBase64) {
        formDataToSend.append('imageBase64', imageBase64);
      }
      if (imagePreview) {
        formDataToSend.append('imageLocalUri', imagePreview);
      }
    }
    
    onSubmit(formDataToSend);
  };

  return (
    <Form onSubmit={handleSubmit} className={styles.form}>
              {/* Sezione Tipo di TableTalk® con pulsanti personalizzati */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{t('meals.form.typeLabel')}</label>
        <div className={styles.typeSelector}>
          <button
            type="button" // Importante per non inviare il form
            className={`${styles.typeButton} ${formData.mealType === 'virtual' ? styles.active : ''}`}
            onClick={() => setFormData({ ...formData, mealType: 'virtual', location: null })} // Resetta la location se si sceglie virtuale
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
          {formData.mealType === 'virtual' 
            ? t('meals.form.virtualInfo')
            : t('meals.form.physicalInfo')
          }
        </div>
      </div>

              {/* Sezione Visibilità - solo per TableTalk® fisici */}
      {formData.mealType === 'physical' && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('meals.form.visibilityLabel')}</label>
          <div className={styles.visibilitySelector}>
            <button
              type="button"
              className={`${styles.visibilityButton} ${formData.isPublic ? styles.active : ''}`}
              onClick={() => setFormData({ ...formData, isPublic: true })}
            >
              <span className={styles.visibilityIcon}>🌍</span>
              <span className={styles.visibilityText}>{t('meals.form.publicVisibility')}</span>
              <small className={styles.visibilityDescription}>{t('meals.form.publicDescription')}</small>
            </button>
            <button
              type="button"
              className={`${styles.visibilityButton} ${!formData.isPublic ? styles.active : ''}`}
              onClick={() => setFormData({ ...formData, isPublic: false })}
            >
              <span className={styles.visibilityIcon}>🔒</span>
              <span className={styles.visibilityText}>{t('meals.form.privateVisibility')}</span>
              <small className={styles.visibilityDescription}>{t('meals.form.privateDescription')}</small>
            </button>
          </div>
          <div className={styles.visibilityInfo}>
            {formData.isPublic 
                          ? t('meals.form.publicInfo')
            : t('meals.form.privateInfo')
            }
          </div>
        </div>
      )}

      <Form.Group className="mb-3">
        <Form.Label className={styles.formLabel}>{t('meals.form.titleLabel')}</Form.Label>
        <Form.Control 
          className={`${styles.formControl} ${errors.title ? 'is-invalid' : ''}`}
          type="text" 
          name="title" 
          value={formData.title} 
          onChange={handleChange}
          onBlur={handleBlur}
          required 
        />
        {errors.title && <div className="invalid-feedback">{errors.title}</div>}
      </Form.Group>
      
      <Form.Group className="mb-3">
        <Form.Label className={styles.formLabel}>{t('meals.form.descriptionLabel')}</Form.Label>
        <Form.Control 
          className={`${styles.formControl} ${errors.description ? 'is-invalid' : ''}`}
          as="textarea" 
          rows={3} 
          name="description" 
          value={formData.description} 
          onChange={handleChange}
          onBlur={handleBlur}
          required 
        />
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
                <Form.Control 
                  className={`${styles.formControl} ${errors.maxParticipants ? 'is-invalid' : ''}`}
                  type="number" 
                  name="maxParticipants" 
                  value={formData.maxParticipants} 
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required 
                  min="2" 
                  max="10" 
                />
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

      {/* Prezzo Stimato - Solo per pasti fisici */}
      {formData.mealType === 'physical' && (
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label className={styles.formLabel}>{t('meals.form.priceLabel') || 'Prezzo Stimato (€)'}</Form.Label>
              <div className="input-group">
                <span className="input-group-text">€</span>
                <Form.Control
                  className={styles.formControl}
                  type="number"
                  name="estimatedCost"
                  value={formData.estimatedCost}
                  onChange={handleChange}
                  placeholder="Es. 25"
                  min="0"
                />
              </div>
              <Form.Text className="text-muted">
                Costo medio a persona (solo indicativo)
              </Form.Text>
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
                    min={getMinValidDateTime()} // 🔒 Impedisce selezione date passate
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required 
                  />
                  <button
                    type="button"
                    className={styles.dateHelperButton}
                    onClick={() => {
                      // 🔒 SUGGERIMENTO DATA: Imposta una data valida di default
                      const now = new Date();
                      const suggestedDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 ora da ora
                      
                      const year = suggestedDate.getFullYear();
                      const month = String(suggestedDate.getMonth() + 1).padStart(2, '0');
                      const day = String(suggestedDate.getDate()).padStart(2, '0');
                      const hours = String(suggestedDate.getHours()).padStart(2, '0');
                      const minutes = String(suggestedDate.getMinutes()).padStart(2, '0');
                      
                      const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
                      setFormData(prev => ({ ...prev, date: formattedDate }));
                      
                      // Pulisci eventuali errori
                      setErrors(prev => ({ ...prev, date: '' }));
                    }}
                    title="Suggerisci data valida (1 ora da ora)"
                  >
                    🕐
                  </button>
                </div>
                {errors.date && <div className="invalid-feedback">{errors.date}</div>}
                <Form.Text className="text-muted">
                  📅 Seleziona una data e ora nel futuro
                </Form.Text>
            </Form.Group>
        </Col>
        <Col xs={12} md={6}>
            {/* Campo per la posizione - visibile solo per TableTalk® fisici */}
            {formData.mealType === 'physical' && (
              <Form.Group>
                <Form.Label className={styles.formLabel}>{t('meals.form.addressLabel')}</Form.Label>
                <Form.Control 
                  className={`${styles.formControl} ${errors.location && errors.location !== 'Ricerca indirizzo...' ? 'is-invalid' : ''}`}
                  type="text" 
                  name="address" 
                  value={
                    formData.location && 
                    typeof formData.location === 'object' && 
                    formData.location.address && 
                    typeof formData.location.address === 'string'
                      ? formData.location.address 
                      : ''
                  } 
                  onChange={handleAddressChange}
                  onBlur={handleAddressBlur}
                  onKeyDown={(e) => {
                    // Quando l'utente preme Enter, geocodifica l'indirizzo
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddressBlur(e);
                    }
                  }}
                  placeholder={t('meals.form.addressPlaceholder')}
                />
                {errors.location && (
                  <div className={errors.location === 'Ricerca indirizzo...' ? 'text-info' : 'invalid-feedback'}>
                    {errors.location}
                  </div>
                )}
                <Form.Text className="text-muted">
                  📍 Inserisci l'indirizzo manualmente o selezionalo dalla mappa sottostante
                </Form.Text>
              </Form.Group>
            )}
        </Col>
      </Row>

              {/* ✅ SEZIONE MAPPA CON OPENSTREETMAP */}
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
                  : [45.4642, 9.1900] // Milano di default
            }
          />
          {/* Eventuale visualizzazione indirizzo selezionato */}
          {selectedLocation && (
            <div className="selected-location-info" style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              ✅ <strong>Posizione selezionata:</strong><br />
              <span style={{ fontSize: '14px', color: '#666' }}>
                {selectedLocation.address || 
                 `Lat: ${selectedLocation.lat.toFixed(4)}, Lng: ${selectedLocation.lng.toFixed(4)}`}
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
        {imagePreview && <img src={imagePreview} alt={t('meals.form.coverImageAlt')} className={styles.imagePreview} />}
        
        {/* 📱 Su mobile (Capacitor), mostra pulsanti per fotocamera/libreria */}
        {Capacitor.isNativePlatform() ? (
          <div className="mt-2">
            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant="outline-primary"
                onClick={() => handleCameraSelect(CameraSource.Camera)}
                style={{ fontSize: '0.9em' }}
              >
                📷 Fotocamera
              </Button>
              <Button
                variant="outline-primary"
                onClick={() => handleCameraSelect(CameraSource.Photos)}
                style={{ fontSize: '0.9em' }}
              >
                🖼️ Libreria Foto
              </Button>
            </div>
            <Form.Text className="text-muted d-block mt-2">
              Seleziona una foto dalla fotocamera o dalla libreria (max 10MB)
            </Form.Text>
          </div>
        ) : (
          /* 📁 Su web, usa input file standard */
          <>
            <Form.Control
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="mt-2"
              style={{ fontSize: '0.9em' }}
            />
            <Form.Text className="text-muted">
              Seleziona un'immagine dal tuo dispositivo (max 10MB)
            </Form.Text>
          </>
        )}
        
        {/* 🔄 Indicatore stato immagine */}
        {imageFile && (
          <div className="mt-2 p-2 bg-light rounded" style={{ fontSize: '0.9em' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📷 Immagine selezionata</span>
              <small className="text-muted">
                {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
              </small>
            </div>
            <small className="text-muted d-block mt-1">
              L'immagine verrà caricata insieme al pasto
            </small>
          </div>
        )}
      </Form.Group>
      
      <div className={styles.stickyActions}>
        <Button 
          variant="primary" 
          type="submit" 
          className={styles.submitButton} 
          disabled={isLoading || isSubmitting}
        >
          {isLoading || isSubmitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" />
              <span> {isSubmitting ? t('meals.form.saving') : t('meals.form.loading')}</span>
            </>
          ) : (
            submitButtonText || t('forms.save')
          )}
        </Button>
      </div>
    </Form>
  );
};

export default MealForm;