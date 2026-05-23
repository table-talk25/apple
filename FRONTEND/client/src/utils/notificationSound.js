// utils/notificationSound.js — DEBUG VERSION
// Rimuovere i console.log una volta risolto il problema iOS.

let _audioCtx = null;

/**
 * Chiama questa funzione SINCRONA dentro un handler touchstart o click.
 * Crea l'AudioContext dentro l'evento utente (obbligatorio su iOS WebKit).
 */
export const unlockAudioContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  console.log('[Audio] unlockAudioContext chiamato. Ctx disponibile:', !!Ctx);
  if (!Ctx) return;

  if (!_audioCtx) {
    try {
      _audioCtx = new Ctx();
      console.log('[Audio] AudioContext CREATO. State:', _audioCtx.state);
    } catch (e) {
      console.error('[Audio] Errore creazione AudioContext:', e);
    }
    return;
  }

  console.log('[Audio] AudioContext esistente. State:', _audioCtx.state);

  if (_audioCtx.state === 'closed') {
    try {
      _audioCtx = new Ctx();
      console.log('[Audio] AudioContext ricreato (era closed). State:', _audioCtx.state);
    } catch (e) {
      console.error('[Audio] Errore ricreazione AudioContext:', e);
    }
    return;
  }

  if (_audioCtx.state === 'suspended' || _audioCtx.state === 'interrupted') {
    try {
      const resumePromise = _audioCtx.resume();
      if (resumePromise && typeof resumePromise.then === 'function') {
        resumePromise
          .then(() => console.log('[Audio] resume() completato. State:', _audioCtx?.state))
          .catch(e => console.error('[Audio] resume() fallito:', e));
      }
      console.log('[Audio] resume() chiamato sincrono. State subito dopo:', _audioCtx.state);
    } catch (e) {
      console.error('[Audio] Errore resume():', e);
    }
  }
};

/**
 * Suona il beep. Funziona solo se unlockAudioContext() è già stato chiamato.
 */
export const playNotificationSound = () => {
  console.log('[Audio] playNotificationSound. State:', _audioCtx?.state ?? 'no context');
  try {
    if (!_audioCtx || _audioCtx.state !== 'running') {
      console.warn('[Audio] Non suono: state è', _audioCtx?.state ?? 'null');
      return;
    }

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

    playTone(1046, now,        0.18, 0.4);
    playTone(784,  now + 0.15, 0.28, 0.25);
    console.log('[Audio] Toni avviati.');
  } catch (e) {
    console.error('[Audio] Errore playNotificationSound:', e);
  }
};

// Retrocompatibilità con App.js
export const initNotificationSound = () => {};
