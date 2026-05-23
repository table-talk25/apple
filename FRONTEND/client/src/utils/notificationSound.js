// utils/notificationSound.js
// AudioContext singleton riutilizzato — evita la sospensione autoplay del browser.

let _audioCtx = null;

const getAudioContext = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!_audioCtx) {
    _audioCtx = new AudioContextClass();
  }
  return _audioCtx;
};

export const playNotificationSound = async () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

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

    playTone(1046, now, 0.18, 0.4);         // Do6 — nota alta
    playTone(784,  now + 0.15, 0.28, 0.25); // Sol5 — nota media
  } catch (e) {
    // Silenzioso se il browser blocca
  }
};
