export const getProfileCity = (profile) => {
  if (!profile) return '';
  if (typeof profile.location === 'string') {
    const trimmed = profile.location.trim();
    if (trimmed) return trimmed;
  }
  if (profile.location && typeof profile.location === 'object' && profile.location.address) {
    const addr = String(profile.location.address).trim();
    if (addr) return addr;
  }
  if (profile.residence) {
    return String(profile.residence).trim();
  }
  return '';
};

export const getProfileAge = (profile) => {
  if (!profile) return null;
  if (typeof profile.age === 'number' && Number.isFinite(profile.age) && profile.age > 0) {
    return profile.age;
  }
  if (!profile.dateOfBirth) return null;
  const birth = new Date(profile.dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age > 0 ? age : null;
};

export const hasCustomAvatar = (profile) => {
  const img = profile?.profileImage;
  if (!img || typeof img !== 'string') return false;
  const trimmed = img.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  return !trimmed.includes('default-avatar');
};

/**
 * Computes profile completeness percentage and prioritized list of missing fields.
 */
export const computeProfileCompleteness = (profile) => {
  const checks = [
    { key: 'city', done: Boolean(getProfileCity(profile)) },
    { key: 'bio', done: Boolean(profile?.bio && String(profile.bio).trim().length > 0) },
    { key: 'languages', done: Array.isArray(profile?.languages) && profile.languages.length > 0 },
    { key: 'interests', done: Array.isArray(profile?.interests) && profile.interests.length > 0 },
    { key: 'gender', done: Boolean(profile?.gender && String(profile.gender).trim().length > 0) },
    { key: 'avatar', done: hasCustomAvatar(profile) },
    { key: 'age', done: getProfileAge(profile) !== null },
    { key: 'nickname', done: Boolean(profile?.nickname && String(profile.nickname).trim().length >= 3) },
  ];

  const total = checks.length;
  const filled = checks.filter((item) => item.done).length;
  const missingKeys = checks.filter((item) => !item.done).map((item) => item.key);
  const percent = Math.round((filled / total) * 100);

  return {
    percent,
    filled,
    total,
    missingKeys,
  };
};
