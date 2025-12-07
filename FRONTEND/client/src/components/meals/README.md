# Componenti di Editing Inline per i Pasti

Questi componenti permettono di modificare i campi dei pasti direttamente nella pagina, senza dover aprire un form completo.

## Componenti Disponibili

### 1. InlineEditTitle
Modifica inline del titolo del pasto.

**Props:**
- `title`: Il titolo attuale
- `onSave`: Funzione chiamata quando si salva il nuovo titolo
- `isEditing`: Stato di editing (true/false)
- `onEditClick`: Funzione chiamata quando si clicca per modificare
- `onCancel`: Funzione chiamata quando si annulla la modifica
- `size`: Tag HTML per il titolo (default: "h2")

**Esempio:**
```jsx
<InlineEditTitle
  title={meal.title}
  onSave={handleTitleSave}
  isEditing={editingField === 'title'}
  onEditClick={() => setEditingField('title')}
  onCancel={() => setEditingField(null)}
/>
```

### 2. InlineEditDescription
Modifica inline della descrizione del pasto.

**Props:**
- `description`: La descrizione attuale
- `onSave`: Funzione chiamata quando si salva la nuova descrizione
- `isEditing`: Stato di editing (true/false)
- `onEditClick`: Funzione chiamata quando si clicca per modificare
- `onCancel`: Funzione chiamata quando si annulla la modifica

**Esempio:**
```jsx
<InlineEditDescription
  description={meal.description}
  onSave={handleDescriptionSave}
  isEditing={editingField === 'description'}
  onEditClick={() => setEditingField('description')}
  onCancel={() => setEditingField(null)}
/>
```

### 3. InlineEditDate
Modifica inline della data e ora del pasto.

**Props:**
- `date`: La data attuale (stringa ISO)
- `onSave`: Funzione chiamata quando si salva la nuova data
- `isEditing`: Stato di editing (true/false)
- `onEditClick`: Funzione chiamata quando si clicca per modificare
- `onCancel`: Funzione chiamata quando si annulla la modifica

**Esempio:**
```jsx
<InlineEditDate
  date={meal.date}
  onSave={handleDateSave}
  isEditing={editingField === 'date'}
  onEditClick={() => setEditingField('date')}
  onCancel={() => setEditingField(null)}
/>
```

### 4. InlineEditCoverImage
Modifica inline dell'immagine di copertina del pasto.

**Props:**
- `coverImage`: Il nome dell'immagine attuale
- `onSave`: Funzione chiamata quando si salva la nuova immagine
- `isEditing`: Stato di editing (true/false)
- `onEditClick`: Funzione chiamata quando si clicca per modificare
- `onCancel`: Funzione chiamata quando si annulla la modifica
- `getImageUrl`: Funzione per ottenere l'URL dell'immagine

**Esempio:**
```jsx
<InlineEditCoverImage
  coverImage={meal.coverImage}
  onSave={handleCoverImageSave}
  isEditing={editingField === 'coverImage'}
  onEditClick={() => setEditingField('coverImage')}
  onCancel={() => setEditingField(null)}
  getImageUrl={getMealCoverImageUrl}
/>
```

### 5. MealInlineEditor (Wrapper)
Componente wrapper che gestisce tutti i campi editabili e lo stato di editing.

**Props:**
- `meal`: L'oggetto pasto completo
- `onMealUpdate`: Funzione chiamata quando il pasto viene aggiornato
- `isHost`: Se l'utente è l'ospite del pasto (può modificare)
- `className`: Classe CSS aggiuntiva

**Esempio:**
```jsx
<MealInlineEditor
  meal={meal}
  onMealUpdate={setMeal}
  isHost={isHost}
  className={styles.mealInlineEditor}
/>
```

## Utilizzo nella MealDetailPage

```jsx
import MealInlineEditor from '../../../components/meals/MealInlineEditor';

const MealDetailPage = () => {
  const [meal, setMeal] = useState(null);
  const { user } = useAuth();
  
  // Determina se l'utente è l'ospite
  const isHost = user?._id === meal?.host?._id;
  
  return (
    <div>
      {/* Altri contenuti... */}
      
      <MealInlineEditor
        meal={meal}
        onMealUpdate={setMeal}
        isHost={isHost}
        className={styles.mealInlineEditor}
      />
      
      {/* Altri contenuti... */}
    </div>
  );
};
```

## Funzionalità

- **Editing Inline**: I campi vengono modificati direttamente nella pagina
- **Validazione**: Controlli sui valori inseriti
- **Feedback Visivo**: Toast di successo/errore
- **Responsive**: Design adattivo per dispositivi mobili
- **Accessibilità**: Supporto per tastiera e screen reader
- **Stato di Caricamento**: Indicatori visivi durante il salvataggio

## Tastiera

- **Enter**: Salva le modifiche (titolo, data)
- **Ctrl+Enter**: Salva la descrizione
- **Escape**: Annulla le modifiche

## Note

- Solo gli ospiti dei pasti possono modificare i campi
- Le modifiche vengono salvate immediatamente
- L'immagine di copertina richiede un reload della pagina per aggiornare il nome del file
- Tutti i componenti supportano la localizzazione (i18n)
