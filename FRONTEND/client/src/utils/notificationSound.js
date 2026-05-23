// utils/notificationSound.js

let _audioCtx = null;

/**
 * Chiama questa funzione SINCRONA dentro un handler touchstart o click.
 * Crea (o riattiva) l'AudioContext dentro l'evento utente — obbligatorio
 * su iOS WebKit e Chrome mobile per sbloccare l'audio.
 */
export const unlockAudioContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;

  if (!_audioCtx) {
    try { _audioCtx = new Ctx(); } catch (_) {}
    return;
  }

  if (_audioCtx.state === 'closed') {
    try { _audioCtx = new Ctx(); } catch (_) {}
    return;
  }

  if (_audioCtx.state === 'suspended' || _audioCtx.state === 'interrupted') {
    try { _audioCtx.resume().catch(() => {}); } catch (_) {}
  }
};

/**
 * Suona il bing di notifica.
 * Su iOS/Chrome mobile: se il contesto è suspended tenta il resume()
 * prima di suonare — recupera il contesto senza richiedere un nuovo
 * gesto utente (funziona se l'utente ha già interagito con la pagina).
 */
export const playNotificationSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    // Crea il contesto al primo utilizzo se non esiste ancora
    if (!_audioCtx || _audioCtx.state === 'closed') {
      try { _audioCtx = new Ctx(); } catch (_) { return; }
    }

    const fire = () => {
      try {
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
      } catch (_) {}
    };

    if (_audioCtx.state === 'running') {
      fire();
    } else if (_audioCtx.state === 'suspended' || _audioCtx.state === 'interrupted') {
      // Tenta il resume — se riesce, suona subito
      _audioCtx.resume().then(fire).catch(() => {});
    }
    // Se state === 'closed' non possiamo fare nulla senza gesto utente
  } catch (_) {}
};

// Retrocompatibilità con App.js
export const initNotificationSound = () => {};
