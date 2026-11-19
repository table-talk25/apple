# table2Talk — UI Refresh Spec v1
Riferimento visivo: docs/mockup.html (aprirlo nel browser). Questo file è la fonte di verità.

## 0. Vincoli inderogabili
- NON modificare: BACKEND/, endpoint API, socket, auth, video Twilio, .env.production,
  variabili d'ambiente Coolify, Dockerfile, render.yaml, workflow CI.
- NON cambiare i path delle route esistenti: cambia solo componenti, stili e testi.
- NON aggiungere dipendenze: usa quelle già in FRONTEND/client/package.json
  (react-router, react-bootstrap, framer-motion, lucide-react, i18next, react-leaflet, @capacitor/browser).
- Riusa i token CSS in src/styles/common/index.css (--tt-*). Vietati colori hardcoded nuovi.
- Testi via i18next: aggiungi chiavi IT e EN dove la schermata usa già useTranslation.
- Wrapper Capacitor: rispetta env(safe-area-inset-top/bottom). Nessuna sovrapposizione con
  BackButton, controlli Leaflet o bottom nav.
- Una PR per fase. CI "Frontend build" + "Validate backend" verdi prima del merge.
- Il merge lo approva l'utente: l'agente apre la PR e si ferma.

## 1. Brand
- Prodotto: table2Talk. Wordmark: "table" + "2" in --tt-primary + "Talk".
- Unità evento: t2t (plurale invariato: "i t2t").
- Sostituisci ovunque "TableTalk", "TableTalk®", "Table2Talk" in UI, i18n, <title>,
  meta description, manifest.json, public/index.html.
- Mai ® o ™.
- Tono: caldo, concreto, invitante. Frasi brevi. Zero burocratese.

## 2. Token (già presenti in :root)
--tt-background #FAF7F2 · --tt-surface #FFF · --tt-primary #B54735 · --tt-primary-hover #933829
--tt-accent #245C4A · --tt-text #242824 · --tt-text-muted #5C625C · --tt-border #DDD5CA
--tt-shadow 0 8px 25px rgba(36,40,36,.08) · radius .5rem / 1rem
Font: Poppins (titoli), Inter (testo).

## 3. Componenti condivisi (crearli in src/components/ui/)
- Button: primary | ghost | green | danger | white, variante sm, stato disabled.
- Badge: categoria (tint terracotta) · Video (tint verde) · Dal vivo (neutro).
  Vietati viola/blu/arancio fuori palette.
- Avatar: foto utente; se assente o in errore → iniziali su cerchio colorato. Mai img rotta.
- Cover t2t: foto Firebase a tutta larghezza, object-fit cover, loading="lazy";
  onError o img assente → gradiente caldo + emoji di categoria (Pranzo 🍝 Cena 🍽️ Aperitivo 🍷 Colazione ☕).
- Seats: pallini pieni/liberi + "n/tot".
- Card t2t (image-first): cover 185px (170 mobile) con badge categoria a sinistra e formato a destra,
  titolo, host + verified, meta (data · durata · lingua · città se fisico), max 3 tag + "+n",
  footer con seats e CTA di stato.
- Stati CTA: Partecipa | Completo (disabled) | Partecipi ✓ | Gestisci (se organizzatore).
- Empty state con CTA. Toast per ogni feedback.
- Modali: focus trap, chiusura con Esc e click sullo scrim, aria-modal.

## 4. Navigazione unica (identica su tutte le pagine)
Header sticky: logo→Home | Home · Esplora · Mappa · I miei t2t | ＋Crea | lingua | chat(badge) | notifiche(badge) | avatar→Profilo.
Mobile (<720px): bottom nav fissa Home · Esplora · ＋Crea · Mappa · I miei; Profilo dall'avatar header.
Body padding-bottom = 62px + env(safe-area-inset-bottom). Active state allineato alla route corrente.
Anchor e scroll landing sotto l'altezza dell'header.

## 5. Schermate
### Home (route /)
Hero: live pill "N persone a tavola adesso" con contatore REALE (socket/API);
se il dato non è disponibile, nascondere il pill — mai numeri inventati.
H1 "Condividi un table2Talk. Crea una connessione."
Sub "La community per chi ama condividere storie e sapori. Organizza un tavolo video sui tuoi
argomenti preferiti o unisciti a una conversazione già in programma: in qualsiasi lingua, a qualsiasi ora."
CTA "Registrati gratis" / "Accedi" + link "Guarda i tavoli di oggi ↓".
Step 01 Scopri / 02 Partecipa / 03 Incontra (testi dal mockup).
Sezione "Perché table2Talk?": 3 value card (antidoto alla solitudine / orizzonti / connessioni sicure).
"Tavoli di oggi": 6 card reali + link "Vedi tutti →" verso Esplora.
Banda CTA finale terracotta + trust row (Profili verificati · Chat e video protetti · Solo maggiorenni).

### Esplora
Titolo "Esplora i t2t" · sub "Trova il tuo prossimo tavolo: in video o dal vivo."
Ricerca placeholder "Cerca per titolo, argomento o lingua…" (filtra su titolo, descrizione, tag, lingua, host).
Chips: Tutti · Pranzo · Cena · Aperitivo · Colazione · 💻 Video · 📍 Dal vivo, collegati ai filtri esistenti.
Griglia responsive di Card t2t. Empty: "Nessun t2t trovato. Prova a togliere qualche filtro."

### Dettaglio t2t (modale o route esistente)
Cover grande, titolo, host + verified, descrizione, meta (Quando · Dove · Lingua · Durata),
tag, seats. Azioni per stato:
- ospite: Partecipa + Messaggia
- partecipante: Apri chat + Abbandona
- organizzatore: Invita commensali + Modifica
- completo: Completo (disabled) + Avvisami
Partecipa/Abbandona = aggiornamento ottimistico con rollback su errore API e toast.
Abbandona chiede conferma inline (mai window.confirm).

### Invita commensali (condivisione)
Apre modal con titolo "Invita commensali", sub "Condividi «{titolo}» e riempi il tavolo." e 4 azioni:
- WhatsApp: https://wa.me/?text={enc(msg)}
- Telegram: https://t.me/share/url?url={enc(link)}&text={enc(invito)}
- Email: mailto:?subject={enc("Ti invito a un table2Talk: "+titolo)}&body={enc(msg)}
- Copia link: navigator.clipboard con fallback, toast "🔗 Link copiato negli appunti."
msg = "🍽️ Ti invito al mio tavolo \"{titolo}\" su table2Talk! {quando} · {dove}. Prenota il tuo posto: {link}"
invito = "🍽️ Ti invito al mio tavolo \"{titolo}\" su table2Talk! {quando}."
link = URL pubblico reale del dettaglio t2t (route esistente + origin dell'app), mai localhost.
Su nativo Capacitor aprire i link con @capacitor/browser; su web target="_blank" rel="noopener".
Riusare la logica di invito già presente, non duplicarla.

### Crea
Titolo "Crea un t2t" · sub "Apparecchia il tuo tavolo: bastano un minuto e un'idea."
Segmented Tipo: 💻 Virtuale (Videochiamata) / 📍 In presenza (Dal vivo).
Titolo (obbligatorio) · Descrizione · Categoria · Lingua · Max partecipanti (stepper 2–8) ·
Durata (30/60/90/120) · Data e ora (validazione futuro: "Scegli una data e ora nel futuro.") ·
Argomenti (chip input, Invio o virgola, max 5, contatore n/5, rimozione con ✕) ·
Copertina (dropzone con preview FileReader, solo immagini, max 10MB, errore chiaro).
CTA sticky "Crea il t2t" + "Gratis · modificabile quando vuoi".
Submit riusa l'API esistente; successo → toast "🎉 Il tuo t2t è online! Invita i primi commensali." e redirect a I miei t2t.

### I miei t2t
Titolo "I miei t2t" · sub "I tavoli che organizzi e quelli a cui partecipi."
Tab "Organizzo io (n)" / "Partecipo (n)" con conteggi reali.
Card compatte orizzontali: thumb 96px, titolo, meta, seats, azioni.
Organizzatore: Invita (apre condivisione) · Modifica · Condividi.
Partecipante: Apri chat · Abbandona.
Empty: "Ancora nessun t2t qui. Crea il primo →".

### Profilo
Header card: avatar grande con fallback iniziali, nome, email, barra di completezza reale
("Profilo al X% · aggiungi città e bio per farti trovare") + Modifica.
Informazioni personali: al posto di "Non specificato" mostrare inviti azionabili
("＋ Aggiungi la tua città", "＋ Specifica", "＋ Raccontati in due righe").
Lingue e Interessi come chip + "＋ Aggiungi".
Impostazioni: switch styled per notifiche email e posizione per matching; Cambia password; Privacy Policy.
"Zona account" separata e bordata danger: Esci (ghost) ed Elimina account (danger) con conferma.
Testo: "L'eliminazione è definitiva e rimuove tutti i tuoi dati."

### Mappa
Leaflet esistente. Zoom in bottomleft, search bar in alto dentro container arrotondato,
"Cerca in questa zona" in basso al centro. Nessun overlap con BackButton o bottom nav.
Pin derivati da --tt-primary, popup con titolo e data del t2t.
Rispetta safe-area-inset-top. Fallback testuale se la mappa non carica.

## 6. Toast
join "🎉 Sei dentro! Lo trovi in «I miei t2t»."
leave "Hai abbandonato il tavolo. Il posto è tornato libero."
create "🎉 Il tuo t2t è online! Invita i primi commensali."
notify "🔔 Ti avviseremo se si libera un posto."
copy "🔗 Link copiato negli appunti."

## 7. Accettazione
Per ogni fase: build di produzione senza errori, nessun warning bloccante,
nessun colore fuori palette, nessuna immagine rotta, menu identico su tutte le route,
navigazione completabile su desktop 1440 e mobile 390, nessun overflow orizzontale,
controlli raggiungibili e non coperti, console priva di errori runtime.