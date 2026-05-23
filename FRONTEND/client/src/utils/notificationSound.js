// utils/notificationSound.js
//
// iOS WebKit (usato da tutti i browser su iPhone, incluso Chrome) richiede che
// l'AudioContext venga CREATO e RESUMATO dentro lo stesso evento utente sincrono.
// Non basta resume() — se il context esiste già ma è suspended, iOS lo ignora.
//
// Strategia iOS-safe:
//   1. unlockAudioContext() crea un contesto NUOVO se quello esistente è suspended,
//      oppure fa resume() sincrono su quello esistente se è già in interrupted.
//   2. Viene chiamato onTouchStart su input e bottone invia.
//   3. playNotificationSound() suona solo se state === 'running'.

let _audioCtx = null;

/**
 * Chiama questa funzione SINCRONA dentro un handler touchstart o click.
 * Su iOS crea un AudioContext fresco se necessario, su Android/desktop fa resume().
 * Dopo questa chiamata il suono funzionerà per tutta la sessione.
 */
export const unlockAudioContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;

  // Se non esiste ancora, crealo ora (dentro l'evento utente — iOS-safe)
  if (!_audioCtx) {
    _audioCtx = new Ctx();
    return; // appena creato è già 'running' su iOS
  }

  // Se esiste ma è suspended o interrupted, prova resume sincrono
  if (_audioCtx.state === 'suspended' || _audioCtx.state === 'interrupted') {
    _audioCtx.resume(); // sincrono, senza await
  }

  // Se lo stato è 'closed' (raro), ricrealo
  if (_audioCtx.state === 'closed') {
    _audioCtx = new Ctx();
  }
};

/**
 * Suona il beep di notifica.
 * Funziona solo dopo che unlockAudioContext() è stato chiamato almeno una volta.
 */
export const playNotificationSound = () => {
  try {
    if (!_audioCtx || _audioCtx.state !== 'running') return;

    const ctx = _audioCtx;
    const now = ctx.currentTime;

    const playTone = (frequency, startTime, duration, gainValue) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    playTone(1046, now,        0.18, 0.4);  // Do6
    playTone(784,  now + 0.15, 0.28, 0.25); // Sol5
  } catch (_) {}
};

// Retrocompatibilità con App.js
export const initNotificationSound = () => {};
