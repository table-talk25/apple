const crypto = require('crypto');
const Meal = require('../models/Meal');
const { Event, Delivery } = require('../models/VideoNotification');
const push = require('./pushNotificationService');
const { getMealTiming } = require('../utils/mealLifecycle');

const MAX_ATTEMPTS = 5;
const LEASE_MS = 5 * 60000;
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const INVALID_TOKEN_CODES = new Set(['messaging/invalid-registration-token', 'messaging/registration-token-not-registered']);
const PERMANENT_CODES = new Set([...INVALID_TOKEN_CODES, 'messaging/invalid-argument', 'messaging/invalid-payload', 'messaging/invalid-data-payload-key', 'messaging/payload-size-limit-exceeded', 'messaging/invalid-options', 'messaging/mismatched-credential', 'messaging/authentication-error', 'messaging/third-party-auth-error', 'messaging/invalid-apns-credentials', 'messaging/invalid-package-name']);

async function queueActivationEvent(meal) {
  const { startTime, endTime } = getMealTiming(meal);
  const event = { _id: digest(JSON.stringify([meal._id.toString(), startTime.toISOString()])), meal: meal._id, scheduledAt: startTime, expiresAt: endTime };
  try { await Event.create(event); } catch (error) { if (error.code !== 11000) throw error; }
  return event;
}

async function loadMeal(event) {
  const now = new Date();
  if (new Date(event.expiresAt) <= now) return null;
  return Meal.findOne({
    _id: event.meal, date: event.scheduledAt, mealType: 'virtual',
    status: { $in: ['upcoming', 'ongoing'] }, videoCallStatus: 'active',
    $expr: { $gt: [{ $add: ['$date', { $multiply: [{ $ifNull: ['$duration', 60] }, 60000] }] }, now] },
  }).populate('host participants', 'fcmTokens settings isActive');
}

function targetsFor(meal) {
  const users = new Map();
  for (const user of [meal.host, ...(meal.participants || [])]) {
    if (user?._id) users.set(user._id.toString(), user);
  }
  const targets = [];
  for (const user of users.values()) {
    if (user.isActive === false || user.settings?.notifications?.push !== true || user.settings?.notifications?.pushPreferences?.meals?.mealUpdates === false) continue;
    for (const token of new Set(user.fcmTokens || [])) {
      if (typeof token === 'string' && token.trim()) targets.push({ recipient: user._id, token, tokenHash: digest(token) });
    }
  }
  return targets;
}

async function finish(claim, changes) {
  const result = await Delivery.updateOne({ _id: claim._id, state: 'processing', leaseId: claim.leaseId }, { $set: changes });
  if (result.matchedCount !== 1) throw new Error('Notification lease lost');
}

function retryDate(error, attempts) {
  const now = Date.now();
  const headers = error?.httpResponse?.headers || error?.response?.headers;
  const header = headers?.get ? headers.get('retry-after') : headers?.['retry-after'];
  let providerDelay = 0;
  if (header) {
    const seconds = Number(header);
    providerDelay = Number.isFinite(seconds) ? Math.max(0, seconds * 1000) : Math.max(0, Date.parse(header) - now) || 0;
  }
  return new Date(now + Math.max(60000 * (2 ** (attempts - 1)) + Math.floor(Math.random() * 30000), providerDelay));
}

async function recordFailure(claim, token, error) {
  const code = /^messaging\/[a-z-]+$/.test(error?.code || '') ? error.code : 'app/unknown-error';
  const permanent = PERMANENT_CODES.has(code);
  const state = permanent ? 'permanent' : (claim.attempts >= MAX_ATTEMPTS ? 'exhausted' : 'retry');
  await finish(claim, { state, errorCode: code, nextAttemptAt: retryDate(error, claim.attempts) });
  if (INVALID_TOKEN_CODES.has(code)) {
    const User = require('../models/User');
    await User.updateOne({ _id: claim.recipient }, { $pull: { fcmTokens: token } });
  }
  return state;
}

async function processVideoNotificationEvents() {
  const summary = { success: true, accepted: 0, retry: 0, permanent: 0, exhausted: 0, skipped: 0, failed: 0 };
  try {
    const now = new Date();
    await Delivery.updateMany({ state: { $in: ['pending', 'retry', 'processing'] }, expiresAt: { $lte: now } }, { $set: { state: 'expired' } });
    await Delivery.updateMany({ state: 'processing', attempts: { $gte: MAX_ATTEMPTS }, leaseUntil: { $lte: now } }, { $set: { state: 'exhausted' } });
    const events = await Event.find({ expiresAt: { $gt: now } });
    for (const event of events) {
      try {
        const meal = await loadMeal(event);
        if (!meal) continue;
        for (const target of targetsFor(meal)) {
          try {
            const id = `${event._id}:${target.recipient}:${target.tokenHash}`;
            try {
              await Delivery.updateOne({ _id: id }, { $setOnInsert: { event: event._id, recipient: target.recipient, tokenHash: target.tokenHash, expiresAt: event.expiresAt, state: 'pending', attempts: 0, nextAttemptAt: new Date() } }, { upsert: true });
            } catch (error) { if (error.code !== 11000) throw error; }
            const claimTime = new Date();
            const leaseId = crypto.randomUUID();
            const claim = await Delivery.findOneAndUpdate({
              _id: id, attempts: { $lt: MAX_ATTEMPTS }, expiresAt: { $gt: claimTime },
              $or: [
                { state: { $in: ['pending', 'retry'] }, nextAttemptAt: { $lte: claimTime } },
                { state: 'processing', leaseUntil: { $lte: claimTime } },
              ],
            }, { $set: { state: 'processing', leaseId, leaseUntil: new Date(claimTime.getTime() + LEASE_MS) }, $inc: { attempts: 1 } }, { new: true });
            if (!claim) continue;
            try {
              const currentMeal = await loadMeal(event);
              const current = currentMeal && targetsFor(currentMeal).find((item) => item.recipient.toString() === claim.recipient.toString() && item.tokenHash === claim.tokenHash);
              if (!current) { await finish(claim, { state: 'skipped' }); summary.skipped++; continue; }
              const result = await push.sendPushNotification(
                [current.token], 'La videochiamata sta per iniziare!',
                `Unisciti ora al pasto "${currentMeal.title}".`,
                { mealId: currentMeal._id.toString(), type: 'video_call_available', notificationId: id }, 'meal_update'
              );
              const response = result?.responses?.[0];
              if (response?.success === true) { await finish(claim, { state: 'accepted' }); summary.accepted++; }
              else { const state = await recordFailure(claim, current.token, response?.error); summary[state]++; }
            } catch (error) {
              // A lost response or process interruption can still cause duplicate external delivery on retry.
              const state = await recordFailure(claim, target.token, error); summary[state]++;
            }
          } catch { summary.failed++; console.error('[VideoNotifications] Invio o registrazione esito falliti'); }
        }
      } catch { summary.failed++; console.error('[VideoNotifications] Elaborazione evento fallita'); }
    }
  } catch { summary.failed++; console.error('[VideoNotifications] Recupero eventi fallito'); }
  summary.success = summary.failed === 0 && summary.retry === 0 && summary.permanent === 0 && summary.exhausted === 0;
  return summary;
}

module.exports = { queueActivationEvent, processVideoNotificationEvents };
