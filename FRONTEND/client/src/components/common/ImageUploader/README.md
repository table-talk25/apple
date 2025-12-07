# ImageUploader con Compressione Automatica

Il componente `ImageUploader` ora include la compressione automatica delle immagini per ottimizzare l'upload e migliorare l'esperienza utente, specialmente su dispositivi mobili.

## 🚀 Caratteristiche Principali

### **Compressione Automatica**
- **Ridimensionamento intelligente**: Riduce le dimensioni mantenendo la qualità
- **Compressione della qualità**: Ottimizza la dimensione del file
- **Web Worker**: Compressione asincrona senza bloccare l'UI
- **Fallback sicuro**: Se la compressione fallisce, usa il file originale

### **Configurazione Flessibile**
- **Abilitazione/Disabilitazione**: Controllo completo sulla compressione
- **Qualità personalizzabile**: Da 0.1 (10%) a 1.0 (100%)
- **Dimensioni massime**: Limiti configurabili per larghezza e altezza
- **Formati supportati**: JPEG, PNG, GIF, WebP

## 📋 Props Disponibili

### **Compressione**
```jsx
enableCompression={true}           // Abilita/disabilita la compressione
compressionQuality={0.8}           // Qualità della compressione (0.1-1.0)
maxWidthCompression={1280}         // Larghezza massima dopo compressione
maxHeightCompression={1280}        // Altezza massima dopo compressione
```

### **Validazione**
```jsx
maxSizeMB={5}                      // Dimensione massima del file
allowedTypes={['image/jpeg', 'image/png']}  // Tipi di file supportati
aspectRatio={1}                    // Rapporto larghezza/altezza richiesto
minWidth={200}                     // Larghezza minima
minHeight={200}                    // Altezza minima
maxWidth={2000}                    // Larghezza massima
maxHeight={2000}                   // Altezza massima
```

### **Generali**
```jsx
onImageSelect={(file) => {}}       // Callback quando un'immagine viene selezionata
className="custom-class"           // Classe CSS personalizzata
children={<div>Custom UI</div>}    // UI personalizzata
```

## 💡 Esempi di Utilizzo

### **Compressione Standard (Raccomandato)**
```jsx
<ImageUploader
  onImageSelect={handleImageSelect}
  enableCompression={true}
  compressionQuality={0.8}
  maxWidthCompression={1280}
  maxHeightCompression={1280}
  maxSizeMB={5}
/>
```

### **Compressione Alta Qualità**
```jsx
<ImageUploader
  onImageSelect={handleImageSelect}
  enableCompression={true}
  compressionQuality={0.9}
  maxWidthCompression={1920}
  maxHeightCompression={1920}
  maxSizeMB={10}
/>
```

### **Compressione Disabilitata**
```jsx
<ImageUploader
  onImageSelect={handleImageSelect}
  enableCompression={false}
  maxSizeMB={10}
/>
```

### **Compressione Personalizzata per Social Media**
```jsx
<ImageUploader
  onImageSelect={handleImageSelect}
  enableCompression={true}
  compressionQuality={0.7}
  maxWidthCompression={1080}
  maxHeightCompression={1080}
  aspectRatio={1}
  maxSizeMB={2}
/>
```

## 🔧 Configurazione Ottimale

### **Per Foto di Profilo (Avatar)**
```jsx
compressionQuality={0.8}
maxWidthCompression={400}
maxHeightCompression={400}
maxSizeMB={1}
```

### **Per Immagini di Copertina**
```jsx
compressionQuality={0.8}
maxWidthCompression={1280}
maxHeightCompression={720}
maxSizeMB={3}
```

### **Per Gallerie di Immagini**
```jsx
compressionQuality={0.7}
maxWidthCompression={800}
maxHeightCompression={600}
maxSizeMB={2}
```

## 📊 Performance e Risultati

### **Riduzioni Tipiche**
- **Foto smartphone (5-10 MB)**: 70-90% di riduzione
- **Immagini HD (2-5 MB)**: 50-80% di riduzione
- **Screenshot (1-2 MB)**: 30-60% di riduzione

### **Tempi di Elaborazione**
- **Immagini piccole (< 1MB)**: < 100ms
- **Immagini medie (1-5MB)**: 100-500ms
- **Immagini grandi (> 5MB)**: 500ms - 2s

## 🐛 Debug e Logging

Il componente fornisce log dettagliati nella console:

```javascript
🖼️ [ImageUploader] Compressione immagine in corso...
🖼️ [ImageUploader] Dimensione originale: 8.45 MB
✅ [ImageUploader] Compressione completata!
✅ [ImageUploader] Dimensione compressa: 1.23 MB
📊 [ImageUploader] Riduzione: 85.4%
```

## ⚠️ Considerazioni Importanti

### **Compatibilità Browser**
- **Chrome/Edge**: Supporto completo
- **Firefox**: Supporto completo
- **Safari**: Supporto completo (iOS 14+)
- **Internet Explorer**: Non supportato

### **Limiti Tecnici**
- **File troppo grandi**: Potrebbero causare timeout
- **Memoria**: Consumo di memoria durante la compressione
- **Web Worker**: Richiede HTTPS in produzione

### **Fallback**
Se la compressione fallisce per qualsiasi motivo:
1. Viene mostrato un warning nella console
2. Il file originale viene utilizzato
3. L'upload procede normalmente

## 🧪 Testing

Utilizza il componente `ImageCompressionTest` per testare la funzionalità:

```jsx
import ImageCompressionTest from './ImageCompressionTest';

// Nel tuo componente di test
<ImageCompressionTest />
```

## 🔄 Aggiornamenti Futuri

- [ ] Supporto per più algoritmi di compressione
- [ ] Compressione progressiva con barra di avanzamento
- [ ] Supporto per batch di immagini
- [ ] Compressione lato server come fallback
- [ ] Metadati EXIF preservati durante la compressione

## 📚 Risorse Aggiuntive

- [Documentazione browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)
- [Guida alla compressione delle immagini](https://web.dev/compress-images/)
- [Best practices per l'upload di immagini](https://developers.google.com/web/fundamentals/design-and-ux/responsive/images)
