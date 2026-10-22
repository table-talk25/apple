const TERMINAL = new Set(['completed', 'cancelled']);
const isTerminal = (status) => TERMINAL.has(status);

function getMealTiming(meal) {
  if (!meal.date) throw new Error('Data pasto mancante');
  const startTime = new Date(meal.date);
  const duration = meal.duration == null ? 60 : meal.duration;
  if (!Number.isFinite(startTime.getTime()) || !Number.isInteger(duration) || duration <= 0) {
    throw new Error('Data o durata pasto non valida');
  }
  return { startTime, endTime: new Date(startTime.getTime() + duration * 60000), duration };
}

function calculateMealStatus(meal, now = new Date()) {
  if (isTerminal(meal.status)) return meal.status;
  if (!['upcoming', 'ongoing'].includes(meal.status)) throw new Error('Stato pasto non valido');
  const current = new Date(now);
  if (!Number.isFinite(current.getTime())) throw new Error('Istante di riferimento non valido');
  const { startTime, endTime } = getMealTiming(meal);
  if (current < startTime) return 'upcoming';
  if (current < endTime) return 'ongoing';
  if (!Array.isArray(meal.participants)) throw new Error('Partecipanti necessari per chiudere il pasto');
  const ids = new Set(meal.participants.filter(Boolean).map((value) => (value._id || value).toString()));
  if (meal.host) ids.add((meal.host._id || meal.host).toString());
  return ids.size <= 1 ? 'cancelled' : 'completed';
}

module.exports = { calculateMealStatus, getMealTiming, isTerminal };
