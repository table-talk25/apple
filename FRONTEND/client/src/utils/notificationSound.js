// utils/notificationSound.js
//
// Su Chrome/Safari mobile l'AudioContext è sempre 'suspended' finché non si fa
// ctx.resume() in modo SINCRONO dentro un evento utente (touchstart/click).
// Qualsiasi await prima del resume() lo invalida su mobile.
//
// Strategia:
//   1. unlockAudioContext() va chiamato SINCRONO dentro un handler touchstart/click
//   2. playNotificationSound() suona se il context è già 'running'

let _audioCtx = null;

const getAudioContext = () => {
  if (_audioCtx) return _audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  _audioCtx = new Ctx();
  return _audioCtx;
};

/**
 * Chiama questa funzione in modo SINCRONO dentro un handler touchstart o click.
 * Crea l'AudioContext (se non esiste) e chiama resume() sincrono.
 * Dopo questa chiamata il context sarà 'running' e i suoni funzioneranno.
 */
export const unlockAudioContext = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    // .resume() è sincrono qui — non usare await
    ctx.resume();
  }
};

/**
 * Suona il beep di notifica.
 * Funziona solo se unlockAudioContext() è già stato chiamato in precedenza.
 */
export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

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

// Kept for backward compatibility (chiamato in App.js)
export const initNotificationSound = () => {
  getAudioContext();
};
