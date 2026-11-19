import dayjs from 'dayjs';
import 'dayjs/locale/it';
import 'dayjs/locale/en';

export const extractCity = (location) => {
  if (!location) return '';
  if (typeof location === 'string') {
    const trimmed = location.trim();
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed)) return '';
    return trimmed.split(',')[0].trim();
  }
  if (typeof location === 'object') {
    if (location.city) return String(location.city).trim();
    if (location.address) return String(location.address).split(',')[0].trim();
  }
  return '';
};

export const formatMealWhen = (dateValue, langCode = 'it') => {
  if (!dateValue) return '';
  const locale = (langCode || 'it').toLowerCase().startsWith('en') ? 'en' : 'it';
  const parsed = dayjs(dateValue).locale(locale);
  if (!parsed.isValid()) return '';
  return parsed.format('DD MMM · HH:mm');
};

export const getUserId = (user) => {
  if (!user) return null;
  if (typeof user === 'string') return user;
  return user._id || user.id || null;
};

export const getMealHostId = (meal) => {
  if (!meal || !meal.host) return null;
  return typeof meal.host === 'object' ? meal.host._id || meal.host.id : meal.host;
};

export const isUserHost = (meal, user) => {
  const uid = getUserId(user);
  const hostId = getMealHostId(meal);
  return Boolean(uid && hostId && String(uid) === String(hostId));
};

export const isUserParticipant = (meal, user) => {
  const uid = getUserId(user);
  if (!uid || !meal || !Array.isArray(meal.participants)) return false;
  return meal.participants.some((p) => {
    const pid = typeof p === 'object' ? p?._id || p?.id : p;
    return pid && String(pid) === String(uid);
  });
};

export const getMealRoleState = (meal, user) => {
  if (!meal) return 'available';
  if (isUserHost(meal, user)) return 'organizer';
  if (isUserParticipant(meal, user)) return 'joined';
  const count = Array.isArray(meal.participants) ? meal.participants.length : 0;
  const maxP = Number(meal.maxParticipants) || 0;
  if (maxP > 0 && count >= maxP) return 'full';
  return 'available';
};

export const applyOptimisticJoin = (meal, user) => {
  if (!meal || !user) return meal;
  const uid = getUserId(user);
  if (!uid) return meal;
  const existing = Array.isArray(meal.participants) ? meal.participants : [];
  if (isUserParticipant(meal, user)) return meal;
  const entry = {
    _id: uid,
    id: uid,
    nickname: user.nickname || user.name || '',
    name: user.name || user.nickname || '',
    profileImage: user.profileImage || '',
  };
  return {
    ...meal,
    participants: [...existing, entry],
  };
};

export const applyOptimisticLeave = (meal, user) => {
  if (!meal || !user) return meal;
  const uid = getUserId(user);
  if (!uid) return meal;
  const existing = Array.isArray(meal.participants) ? meal.participants : [];
  return {
    ...meal,
    participants: existing.filter((p) => {
      const pid = typeof p === 'object' ? p?._id || p?.id : p;
      return !pid || String(pid) !== String(uid);
    }),
  };
};
