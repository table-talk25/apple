// SEC-08: lista bianca dei campi di un pasto accettati dal client, con validazione dei tipi.
// Tutto il resto (status, imageUrl, participantsCount, participants, host, chatId,
// twilioRoomSid, ratings, notifications, reminderSent, videoCallStatus, ...) è impostato
// solo dal server e viene ignorato se presente nel body.

const { sanitizeString } = require('../services/sanitizationService');

// Campi inviati da MealForm / MealDetailPage / editor inline del frontend.
const MEAL_CLIENT_FIELDS = [
  'title', 'description', 'date', 'duration', 'maxParticipants', 'language',
  'topics', 'location', 'mealType', 'type', 'isPublic', 'estimatedCost',
];

const TOPICS_MAX_ITEMS = 10;
const TOPIC_MAX_LENGTH = 50;
const ADDRESS_MAX_LENGTH = 200;

const isPlainString = (value) => typeof value === 'string';

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}

function parseTopics(raw, errors) {
  // multer restituisce una stringa se il campo compare una sola volta
  const list = Array.isArray(raw) ? raw : (isPlainString(raw) ? [raw] : null);
  if (!list) {
    errors.push('topics deve essere un elenco di testi');
    return undefined;
  }
  if (list.length > TOPICS_MAX_ITEMS) {
    errors.push(`topics: massimo ${TOPICS_MAX_ITEMS} argomenti`);
    return undefined;
  }
  const topics = [];
  for (const item of list) {
    if (!isPlainString(item)) {
      errors.push('topics deve contenere solo testi');
      return undefined;
    }
    const clean = sanitizeString(item).trim();
    if (clean.length > TOPIC_MAX_LENGTH) {
      errors.push(`topics: ogni argomento al massimo ${TOPIC_MAX_LENGTH} caratteri`);
      return undefined;
    }
    if (clean) topics.push(clean);
  }
  return topics;
}

function parseLocation(raw, errors) {
  let value = raw;
  if (isPlainString(raw)) {
    try {
      value = JSON.parse(raw);
    } catch (_) {
      value = { address: raw };
    }
    if (value === null || typeof value !== 'object') value = { address: String(raw) };
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    errors.push('location non valida');
    return undefined;
  }
  const rawAddress = value.address !== undefined && value.address !== '' ? value.address : (value.formattedAddress || '');
  if (!isPlainString(rawAddress)) {
    errors.push('location.address deve essere un testo');
    return undefined;
  }
  const address = sanitizeString(rawAddress).trim();
  if (address.length > ADDRESS_MAX_LENGTH) {
    errors.push(`location.address: massimo ${ADDRESS_MAX_LENGTH} caratteri`);
    return undefined;
  }
  const location = { address };
  if (value.coordinates !== undefined && value.coordinates !== null) {
    const c = value.coordinates;
    if (!Array.isArray(c) || c.length !== 2 || !c.every((n) => typeof n === 'number' && Number.isFinite(n))
        || c[0] < -180 || c[0] > 180 || c[1] < -90 || c[1] > 90) {
      errors.push('location.coordinates deve essere [longitudine, latitudine] valide');
      return undefined;
    }
    location.coordinates = c;
  }
  return location;
}

/**
 * Estrae e valida dal body i soli campi consentiti.
 * @param {object} body
 * @returns {{ data: object, errors: string[] }}
 */
function parseMealInput(body) {
  const src = body && typeof body === 'object' ? body : {};
  const data = {};
  const errors = [];

  for (const field of ['title', 'description', 'language']) {
    if (src[field] === undefined) continue;
    if (!isPlainString(src[field])) { errors.push(`${field} deve essere un testo`); continue; }
    data[field] = sanitizeString(src[field]).trim();
  }
  for (const field of ['mealType', 'type']) {
    if (src[field] === undefined) continue;
    if (!isPlainString(src[field])) { errors.push(`${field} deve essere un testo`); continue; }
    data[field] = src[field].trim(); // i valori ammessi sono controllati dallo schema (enum)
  }

  if (src.date !== undefined) {
    const d = src.date instanceof Date ? src.date : (isPlainString(src.date) || typeof src.date === 'number' ? new Date(src.date) : null);
    if (!d || Number.isNaN(d.getTime())) errors.push('date non valida');
    else data.date = d;
  }

  for (const field of ['duration', 'maxParticipants']) {
    if (src[field] === undefined) continue;
    const n = toNumber(src[field]);
    if (!Number.isInteger(n)) errors.push(`${field} deve essere un numero intero`);
    else data[field] = n;
  }

  if (src.estimatedCost !== undefined && src.estimatedCost !== '' && src.estimatedCost !== null) {
    const n = toNumber(src.estimatedCost);
    if (!Number.isFinite(n) || n < 0) errors.push('estimatedCost deve essere un numero non negativo');
    else data.estimatedCost = n;
  }

  if (src.isPublic !== undefined) {
    if (typeof src.isPublic === 'boolean') data.isPublic = src.isPublic;
    else if (src.isPublic === 'true' || src.isPublic === 'false') data.isPublic = src.isPublic === 'true';
    else errors.push('isPublic deve essere true o false');
  }

  const rawTopics = src.topics !== undefined ? src.topics : src['topics[]'];
  if (rawTopics !== undefined) {
    const topics = parseTopics(rawTopics, errors);
    if (topics !== undefined) data.topics = topics;
  }

  if (src.location !== undefined && src.location !== null && src.location !== '') {
    const location = parseLocation(src.location, errors);
    if (location !== undefined) data.location = location;
  }

  return { data, errors };
}

/** Difesa in profondità: copia solo i campi consentiti da un oggetto già validato. */
function pickAllowedMealFields(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const field of MEAL_CLIENT_FIELDS) {
    if (obj[field] !== undefined) out[field] = obj[field];
  }
  return out;
}

module.exports = { MEAL_CLIENT_FIELDS, parseMealInput, pickAllowedMealFields, TOPICS_MAX_ITEMS, TOPIC_MAX_LENGTH };
