// utils/notificationSound.js
// Gestione AudioContext con sblocco su mobile (autoplay policy).
//
// Su Safari/Chrome mobile l'AudioContext parte come 'suspended' e può essere
// ripreso SOLO dentro un evento utente diretto (tap/click/keydown).
// La strategia: al primo tap/click ovunque nella pagina, facciamo resume() —
// da quel momento i suoni successivi funzionano anche senza interazione diretta.

let _audioCtx = null;
let _unlocked = false;

const getAudioContext = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!_audioCtx) {
    _audioCtx = new AudioContextClass();
    _tryUnlock();
  }
  return _audioCtx;
};

// Tenta resume() subito se siamo già dentro un evento utente,
// altrimenti registra un listener una-tantum su touchstart + click.
const _tryUnlock = () => {
  if (!_audioCtx || _unlocked) return;

  const unlock = async () => {
    if (!_audioCtx || _unlocked) return;
    try {
      if (_audioCtx.state === 'suspended') {
        await _audioCtx.resume();
      }
      _unlocked = true;
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('touchend',   unlock, true);
      document.removeEventListener('click',      unlock, true);
      document.removeEventListener('keydown',    unlock, true);
    } catch (_) {}
  };

  // Prova subito (funziona se siamo già dentro un evento)
  unlock();

  // Fallback: aspetta il primo gesto utente
  document.addEventListener('touchstart', unlock, { capture: true, once: true });
  document.addEventListener('touchend',   unlock, { capture: true, once: true });
  document.addEventListener('click',      unlock, { capture: true, once: true });
  document.addEventListener('keydown',    unlock, { capture: true, once: true });
};

export const playNotificationSound = async () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Se ancora suspended (nessuna interazione avvenuta), non possiamo fare nulla
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) { return; }
    }
    if (ctx.state !== 'running') return;

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
  } catch (_) {
    // Silenzioso se il browser blocca
  }
};

// Inizializza subito il contesto e registra i listener —
// così al primo tap dell'utente (anche non correlato al suono) sbloccheremo.
export const initNotificationSound = () => {
  getAudioContext();
};
