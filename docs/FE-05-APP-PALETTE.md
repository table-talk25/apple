# FE-05: Palette Convivialita a livello applicazione

## Approccio
A differenza di FE-02/FE-04 (opt-in per pagina tramite `composes`), questo intervento promuove i token `--tt-*` a `:root` in `styles/common/index.css` e rimappa le variabili legacy, allineando tutto il resto dell'app in un colpo solo.

## Modifiche
- Token `--tt-*` definiti in `:root` (stessi valori di `palette.module.css`, che resta per compatibilita).
- Variabili legacy rimappate: `--primary-color` e `--primary-dark` da corallo a terracotta; `--secondary-color` da turchese a verde profondo; sfondi/testi/bordi allineati.
- 52 file CSS migrati da colori hardcoded ai token: auth (login, register, forgot/reset password, verify email), chat (lista, pagina, drawer, messaggi, ricevute), mappa, notifiche, modali comuni (report, blocca, cambio password, cancellazione account), componenti meals (card, filtri, form, editor inline), sezioni profilo, sidebar, layout, admin, pagine legali, NotFound, Toast, Spinner.
- Colori inline nei JS aggiornati (bordo avatar host nel dettaglio pasto, gradiente di VerifyEmail).
- I `var(--primary-color)` rimasti nei moduli risolvono ora a terracotta.

## Invariati di proposito
- VideoCallPage: UI dark intenzionale (stile chiamata video), rossi hangup/destructive.
- Rossi di errore/azione distruttiva (#e53e3e, #ef4444).
- Overlay scuri sulle immagini.

## Verifica
- Build di produzione locale: OK (warning lint pre-esistenti).
- CI `frontend-build` e `backend-tests` sulla PR verso main.

## Da verificare dopo il merge
- Giro visivo completo: auth, chat, mappa, notifiche, modali, admin.
- Contrasto su stati hover/disabled e componenti con tinte color-mix.
