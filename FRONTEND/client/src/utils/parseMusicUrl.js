/**
 * Riconosce URL di Spotify / YouTube / SoundCloud / Apple Music
 * e ritorna { provider, embedUrl, label } pronto per <iframe src=...>.
 * Restituisce null se il formato non e' riconosciuto.
 */
export function parseMusicUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const url = rawUrl.trim();
  if (!url) return null;

  // --- SPOTIFY URL ---
  let m = url.match(/^https?:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|playlist|album|episode|show|artist)\/([a-zA-Z0-9]+)/i);
  if (m) {
    return {
      provider: 'spotify',
      embedUrl: `https://open.spotify.com/embed/${m[1]}/${m[2]}`,
      label: `Spotify ${m[1]}`,
    };
  }
  // --- SPOTIFY URI (spotify:track:XYZ) ---
  m = url.match(/^spotify:(track|playlist|album|episode|show|artist):([a-zA-Z0-9]+)/i);
  if (m) {
    return {
      provider: 'spotify',
      embedUrl: `https://open.spotify.com/embed/${m[1]}/${m[2]}`,
      label: `Spotify ${m[1]}`,
    };
  }

  // --- YOUTUBE single video ---
  m = url.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/i);
  if (m) {
    const params = new URLSearchParams();
    params.set('autoplay', '1');
    const list = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (list) params.set('list', list[1]);
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${m[1]}?${params.toString()}`,
      label: 'YouTube',
    };
  }
  m = url.match(/^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (m) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${m[1]}?autoplay=1`,
      label: 'YouTube',
    };
  }
  // --- YOUTUBE playlist (no video specifico) ---
  m = url.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/playlist\?(?:.*&)?list=([a-zA-Z0-9_-]+)/i);
  if (m) {
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/videoseries?list=${m[1]}&autoplay=1`,
      label: 'YouTube playlist',
    };
  }

  // --- SOUNDCLOUD ---
  m = url.match(/^https?:\/\/soundcloud\.com\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?/i);
  if (m) {
    return {
      provider: 'soundcloud',
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&visual=false&hide_related=true`,
      label: 'SoundCloud',
    };
  }

  // --- APPLE MUSIC ---
  m = url.match(/^https?:\/\/music\.apple\.com\/(.+)/i);
  if (m) {
    return {
      provider: 'apple-music',
      embedUrl: `https://embed.music.apple.com/${m[1]}`,
      label: 'Apple Music',
    };
  }

  return null;
}

/**
 * Lista dei provider supportati per UI (placeholder, info, ecc.)
 */
export const SUPPORTED_PROVIDERS = ['Spotify', 'YouTube', 'SoundCloud', 'Apple Music'];
