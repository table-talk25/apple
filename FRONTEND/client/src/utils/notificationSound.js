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

let _listenersBound = false;

/**
 * Registra lo sblocco automatico dell'AudioContext al primo gesto utente
 * (click, tap o tasto) così il "bling" funziona sempre su desktop e mobile.
 */
export const initNotificationSound = () => {
  if (_listenersBound || typeof window === 'undefined') return;
  _listenersBound = true;
  const unlock = () => {
    unlockAudioContext();
    if (_audioCtx && _audioCtx.state === 'running') {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
    }
  };
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true, passive: true });
  window.addEventListener('touchstart', unlock, { capture: true, passive: true });
};

// Attiva subito l'auto-unlock al caricamento del modulo nel browser
initNotificationSound();

/**
 * Suona un "bling" cristallino e piacevole (stile WhatsApp/Telegram)
 * quando arriva un nuovo messaggio in chat o una notifica.
 */
export const playNotificationSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    if (!_audioCtx || _audioCtx.state === 'closed') {
      try { _audioCtx = new Ctx(); } catch (_) { return; }
    }

    const fire = () => {
      try {
        const ctx = _audioCtx;
        const now = ctx.currentTime;

        const playBellNote = (frequency, startTime, duration, peakGain) => {
          const osc = ctx.createOscillator();
          const overtone = ctx.createOscillator();
          const gainNode = ctx.createGain();
          const overtoneGain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, startTime);

          // Leggera armonica superiore per l'effetto cristallino "bling"
          overtone.type = 'triangle';
          overtone.frequency.setValueAtTime(frequency * 2, startTime);

          gainNode.gain.setValueAtTime(0.0001, startTime);
          gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
          gainNode.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

          overtoneGain.gain.setValueAtTime(0.0001, startTime);
          overtoneGain.gain.linearRampToValueAtTime(peakGain * 0.18, startTime + 0.008);
          overtoneGain.gain.exponentialRampToValueAtTime(0.0004, startTime + duration * 0.65);

          osc.connect(gainNode);
          overtone.connect(overtoneGain);
          gainNode.connect(ctx.destination);
          overtoneGain.connect(ctx.destination);

          osc.start(startTime);
          overtone.start(startTime);
          osc.stop(startTime + duration + 0.02);
          overtone.stop(startTime + duration + 0.02);
        };

        // Doppio rintocco ascendente brillante (A5 → E6)
        playBellNote(880,    now,        0.16, 0.24);
        playBellNote(1318.5, now + 0.09, 0.30, 0.28);
      } catch (_) {}
    };

    if (_audioCtx.state === 'running') {
      fire();
    } else if (_audioCtx.state === 'suspended' || _audioCtx.state === 'interrupted') {
      _audioCtx.resume().then(fire).catch(() => {});
    }
  } catch (_) {}
};
