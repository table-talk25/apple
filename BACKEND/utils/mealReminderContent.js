function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => entities[character]);
}

function buildMealReminder(name, meal, isHost = false) {
  const id = meal._id || meal.id || meal.mealId;
  if (!id) throw new Error('Identificativo pasto mancante');
  const minutes = meal.reminderMinutes == null ? 60 : meal.reminderMinutes;
  if (![10, 60].includes(minutes)) throw new Error('Finestra promemoria non valida');
  const target = new URL(process.env.FRONTEND_URL);
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('URL frontend non valido');
  target.hash = `/meals/${encodeURIComponent(id.toString())}`;
  const when = minutes === 60 ? 'circa 1 ora' : 'circa 10–15 minuti';
  return {
    subject: `${isHost ? '👨‍🍳' : '⏰'} Il tuo TableTalk inizia tra ${when}!`,
    html: `<div style="font-family:sans-serif;padding:20px;color:#333"><h2>Ciao ${escapeHtml(name)}!</h2><p>${isHost ? 'Il tuo evento' : 'Il pasto'} <strong>${escapeHtml(meal.title)}</strong> inizia tra ${when}.</p><p>Indirizzo: ${escapeHtml(meal.location?.address || 'Vedi in app')}</p><a href="${escapeHtml(target.toString())}">Vedi dettagli</a></div>`,
  };
}

module.exports = { buildMealReminder };
