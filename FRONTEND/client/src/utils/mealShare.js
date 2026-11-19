import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { extractCity, formatMealWhen } from './mealFormat';

const FALLBACK_PUBLIC_ORIGIN = 'https://table2talk.app';

const isLocalOrPrivateOrigin = (origin = '') => {
  if (!origin || !/^https?:\/\//i.test(origin)) return true;
  return /:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(origin);
};

export const getPublicOrigin = () => {
  const envOrigin = process.env.REACT_APP_PUBLIC_URL;
  if (envOrigin && !isLocalOrPrivateOrigin(envOrigin)) {
    return envOrigin.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    if (!isLocalOrPrivateOrigin(window.location.origin)) {
      return window.location.origin.replace(/\/$/, '');
    }
  }
  return FALLBACK_PUBLIC_ORIGIN;
};

export const getMealPublicUrl = (mealId) => {
  const origin = getPublicOrigin();
  return `${origin}/#/meals/${mealId}`;
};

export const buildMealShareData = (meal, langCode = 'it') => {
  const id = meal?._id || meal?.id || '';
  const title = meal?.title || 'table2Talk';
  const link = getMealPublicUrl(id);
  const when = formatMealWhen(meal?.date, langCode) || '';
  const isPhysical =
    meal?.mealType === 'physical' ||
    meal?.mealType === 'fisico' ||
    meal?.format === 'fisico';
  const city = extractCity(meal?.location);
  const where = isPhysical ? (city ? `${city} (dal vivo)` : 'dal vivo') : 'in video';

  const whenWhere = when ? `${when} · ${where}` : where;
  const msg = `🍽️ Ti invito al mio tavolo "${title}" su table2Talk! ${whenWhere}. Prenota il tuo posto: ${link}`;
  const invito = when
    ? `🍽️ Ti invito al mio tavolo "${title}" su table2Talk! ${when}.`
    : `🍽️ Ti invito al mio tavolo "${title}" su table2Talk!`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(invito)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Ti invito a un table2Talk: ${title}`)}&body=${encodeURIComponent(msg)}`;

  return {
    title,
    link,
    when,
    where,
    msg,
    invito,
    whatsappUrl,
    telegramUrl,
    emailUrl,
  };
};

export const openExternalShareUrl = async (url) => {
  if (!url) return;
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const copyToClipboardWithFallback = async (text) => {
  if (!text) return false;
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // Fall through to execCommand fallback
    }
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (_) {
      ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
  }
  return false;
};
