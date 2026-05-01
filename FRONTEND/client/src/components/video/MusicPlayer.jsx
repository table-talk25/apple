import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { parseMusicUrl, SUPPORTED_PROVIDERS } from '../../utils/parseMusicUrl';
import { toast } from 'react-toastify';

/**
 * Mini-player musicale per la videochiamata.
 *
 * Props:
 *  - isHost (bool)        : abilita "Condividi con tutti" (broadcast via socket)
 *  - sharedUrl (string?)  : se non null, l'host ha condiviso questo URL → tutti lo vedono
 *  - onShare (fn(url))    : callback chiamato quando l'host preme "Condividi"
 *  - onStop (fn())        : callback chiamato quando l'host preme "Stop a tutti"
 */
const MusicPlayer = ({ isHost = false, sharedUrl = null, onShare, onStop }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [localUrl, setLocalUrl] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  // Se l'host condivide, l'URL condiviso ha precedenza su quello locale
  const activeUrl = sharedUrl || localUrl;
  const parsed = useMemo(() => activeUrl ? parseMusicUrl(activeUrl) : null, [activeUrl]);

  // Quando l'host smette di condividere (sharedUrl torna null), gli altri
  // tornano allo stato vuoto (o al loro localUrl se l'avevano impostato prima)
  useEffect(() => {
    if (sharedUrl) {
      setInputUrl(sharedUrl);
    }
  }, [sharedUrl]);

  const handleSetLocal = useCallback(() => {
    const candidate = inputUrl.trim();
    if (!candidate) {
      setLocalUrl(null);
      return;
    }
    const p = parseMusicUrl(candidate);
    if (!p) {
      toast.error(`Link non riconosciuto. Supportati: ${SUPPORTED_PROVIDERS.join(', ')}.`);
      return;
    }
    setLocalUrl(candidate);
  }, [inputUrl]);

  const handleShareWithRoom = useCallback(() => {
    const candidate = inputUrl.trim();
    const p = parseMusicUrl(candidate);
    if (!p) {
      toast.error(`Link non riconosciuto. Supportati: ${SUPPORTED_PROVIDERS.join(', ')}.`);
      return;
    }
    if (typeof onShare === 'function') onShare(candidate);
  }, [inputUrl, onShare]);

  const handleStopShared = useCallback(() => {
    if (typeof onStop === 'function') onStop();
    setLocalUrl(null);
    setInputUrl('');
  }, [onStop]);

  // Se sono partecipante e l'host ha condiviso, voglio mostrare il player
  // anche se non ho impostato nulla io.
  const showPlayer = !!parsed;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed', bottom: 88, right: 16,
          background: '#FF6B35', color: '#fff', border: 'none',
          borderRadius: 24, padding: '8px 14px',
          fontSize: 13, fontWeight: 600, zIndex: 50,
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
        }}
      >
        🎵 Mostra musica
      </button>
    );
  }

  return (
    <div style={{
      background: 'rgba(20,20,20,0.92)',
      color: '#fff',
      borderRadius: 12,
      padding: 12,
      margin: '12px 0',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
        <strong style={{ fontSize: 13 }}>
          🎵 Musica di sottofondo
          {sharedUrl && <span style={{ marginLeft: 8, opacity: 0.7, fontWeight: 400 }}>· condivisa dall'host</span>}
        </strong>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: 16, cursor: 'pointer' }}
          aria-label="Nascondi player"
          title="Nascondi"
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          type="url"
          placeholder="Incolla link Spotify / YouTube / SoundCloud / Apple Music"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSetLocal(); }}
          style={{
            flex: '1 1 220px', minWidth: 0,
            padding: '6px 10px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff', fontSize: 13,
          }}
        />
        <button
          type="button"
          onClick={handleSetLocal}
          style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#FF6B35', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Ascolta solo io
        </button>
        {isHost && (
          <button
            type="button"
            onClick={handleShareWithRoom}
            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#1DB954', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            title="Manda lo stesso link a tutti i partecipanti (ognuno controlla la riproduzione sul suo)"
          >
            Condividi a tutti
          </button>
        )}
        {isHost && sharedUrl && (
          <button
            type="button"
            onClick={handleStopShared}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 13 }}
          >
            Stop condivisione
          </button>
        )}
      </div>

      {showPlayer && parsed && (
        <iframe
          key={parsed.embedUrl}
          title={parsed.label}
          src={parsed.embedUrl}
          width="100%"
          height={parsed.provider === 'spotify' ? 152 : (parsed.provider === 'youtube' ? 200 : 166)}
          frameBorder="0"
          allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
          style={{ borderRadius: 8, display: 'block' }}
        />
      )}

      {!showPlayer && (
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          Incolla un link da Spotify, YouTube, SoundCloud o Apple Music.
          {isHost && ' Premi "Condividi a tutti" per inviare lo stesso link agli altri partecipanti.'}
        </div>
      )}
    </div>
  );
};

export default MusicPlayer;
