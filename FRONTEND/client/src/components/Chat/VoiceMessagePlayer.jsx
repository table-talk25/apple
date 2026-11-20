import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import styles from './VoiceMessagePlayer.module.css';

const BAR_COUNT = 26;

const generateBars = (seedStr) => {
  let hash = 2166136261;
  const s = String(seedStr || 't2t-voice');
  for (let i = 0; i < s.length; i += 1) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bars = [];
  for (let i = 0; i < BAR_COUNT; i += 1) {
    hash = Math.imul(hash ^ (i + 17), 16777619);
    const norm = ((hash >>> 0) % 100) / 100;
    // Forma d'onda naturale (più alta al centro, più bassa ai bordi)
    const envelope = 0.45 + 0.55 * Math.sin((i / (BAR_COUNT - 1)) * Math.PI);
    const h = Math.round((0.22 + norm * 0.78 * envelope) * 100);
    bars.push(Math.max(20, Math.min(100, h)));
  }
  return bars;
};

const formatSec = (sec) => {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const VoiceMessagePlayer = ({ url, duration: initialDuration, own = false }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    Number.isFinite(Number(initialDuration)) && Number(initialDuration) > 0
      ? Number(initialDuration)
      : 0
  );
  const [rate, setRate] = useState(1);

  const bars = useMemo(() => generateBars(url), [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('durationchange', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('durationchange', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [url]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      try {
        audio.playbackRate = rate;
        await audio.play();
      } catch (_) {}
    }
  };

  const cycleRate = (e) => {
    e.stopPropagation();
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const activeBarIndex = Math.floor(progress * BAR_COUNT);

  return (
    <div className={`${styles.player} ${own ? styles.playerOwn : styles.playerOther}`}>
      <audio ref={audioRef} src={url} preload="metadata" style={{ display: 'none' }} />

      <button
        type="button"
        onClick={togglePlay}
        className={`${styles.playBtn} ${own ? styles.playBtnOwn : styles.playBtnOther}`}
        aria-label={playing ? 'Metti in pausa vocale' : 'Riproduci vocale'}
      >
        {playing ? (
          <Pause size={15} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play size={15} fill="currentColor" strokeWidth={0} style={{ marginLeft: 2 }} />
        )}
      </button>

      <div className={styles.waveCol}>
        <div
          className={styles.waveform}
          onClick={handleSeek}
          role="slider"
          aria-label="Avanzamento messaggio vocale"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(currentTime)}
          tabIndex={0}
        >
          {bars.map((heightPct, i) => {
            const filled = playing || currentTime > 0 ? i <= activeBarIndex : false;
            return (
              <span
                key={i}
                className={`${styles.bar} ${
                  filled
                    ? own
                      ? styles.barOwnFilled
                      : styles.barOtherFilled
                    : own
                    ? styles.barOwnEmpty
                    : styles.barOtherEmpty
                }`}
                style={{ height: `${heightPct}%` }}
              />
            );
          })}
        </div>

        <div className={styles.metaRow}>
          <span className={`${styles.time} ${own ? styles.timeOwn : styles.timeOther}`}>
            {playing || currentTime > 0 ? formatSec(currentTime) : formatSec(duration)}
          </span>
          <button
            type="button"
            onClick={cycleRate}
            className={`${styles.rateBtn} ${own ? styles.rateBtnOwn : styles.rateBtnOther}`}
            aria-label="Velocità di riproduzione"
          >
            {rate}x
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessagePlayer;
