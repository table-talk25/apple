# FE-03: Navbar in palette Convivialita

## Scope
La Navbar compone la classe `palette` da `FRONTEND/client/src/styles/common/palette.module.css`, quindi i token `--tt-*` sono definiti sull'elemento navbar ovunque venga renderizzato (home, layout privato, guest). Struttura, altezze, safe-area, menu mobile e comportamento JS restano invariati: cambia solo la mappa colore.

## Modifiche
- Link: testo `--tt-text-muted`, hover e link attivo in terracotta `--tt-primary`, sottolineatura terracotta.
- Bottone Login: bordo e testo verde `--tt-accent`, hover a pieno verde. Bottone Registrati: terracotta con hover scuro (sostituiscono il viola #667eea).
- Icona chat: testo muted, hover con tinta verde al 12% (color-mix) e icona verde.
- Menu kebab (desktop e mobile), dropdown e menu mobile: superfici `--tt-surface`/`--tt-background`, bordi `--tt-border`, ombre `--tt-shadow`.
- Avatar profilo: bordo decorativo `--tt-border`, hover verde.
- Stato scrolled: bordo terracotta a 2px.
- Logout mobile: terracotta al posto del coral globale.
- Aggiunti contorni `:focus-visible` con `--tt-focus` su link e azioni principali.

## Invariati di proposito
- Rossi del logout (#e53e3e/#c53030): azione distruttiva.
- Altezza, layout, media query, blur/safe-area, animazioni.
- Footer: non importato da nessuna pagina (codice morto), non toccato in questo task.

## Verifica
- Build di produzione locale: OK (warning lint pre-esistenti).
- CI `frontend-build` e `backend-tests` sulla PR.

## Da verificare dopo il merge
- Revisione visiva navbar desktop e mobile su home e pagine autenticate.
- Contrasto hover/focus su link e bottoni.
