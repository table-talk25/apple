# FE-04: Palette Convivialita su Meals e Profilo

## Scope
Le schermate Meals (MealsPage, MealDetail, MealHistory, Create, Edit, Search) e Profilo (Profile, PublicProfile) adottano i token condivisi `--tt-*` componendo la classe `palette` sul contenitore di pagina. Layout, spaziature, componenti e logica restano invariati: cambia solo la mappa colore.

## Modifiche
- Sfondi pagina: grigio chiaro (#f5f7fb/#f8f9fa) -> avorio `--tt-background`; card bianche -> `--tt-surface`.
- Testi: grigi scuri (#333/#2c3e50/#343a40/#2d3748) -> `--tt-text`; grigi medi (#555/#6c757d/#495057) -> `--tt-text-muted`.
- Bordi divisori e input (#e9ecef/#ced4da/#eee/#f0f0f0) -> `--tt-border`.
- Azioni primarie: rosso brand #ff6b6b (CTA, FAB, tab attive, bottone crea) -> terracotta `--tt-primary` con hover `--tt-primary-hover`.
- Focus dei campi form (CreateMeal): coral -> verde `--tt-accent` con alone color-mix.
- MealDetail: icone informative rosse -> verde `--tt-accent`.
- Profile: blu (#0d47a1/#1565c0, banner gradiente azzurro) -> verde `--tt-accent` con tinte color-mix; rimosso text-shadow dal titolo benvenuto (coerente con FE-02).
- PublicProfile: header gradiente viola (#667eea/#764ba2) -> gradiente verde `--tt-accent`; link pasti hover terracotta.

## Invariati di proposito
- Rossi di errore (#ef4444) e overlay scuri su immagini (nero con testo bianco).
- Ombre neutre, strutture, media query, animazioni.

## Verifica
- Build di produzione locale: OK (warning lint pre-esistenti).
- CI `frontend-build` e `backend-tests` sulla PR verso main.

## Da verificare dopo il merge
- Revisione visiva delle 8 schermate (mobile e desktop), stati hover/focus, tab attive in MealHistory.
- Contrasto testo su tinte color-mix.
