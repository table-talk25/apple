// FUN-02: stato dell'account (active | suspended | banned).
// Un documento senza il campo `status` (utenti creati prima di questa modifica) è considerato attivo.

const STATUSES = ['active', 'suspended', 'banned'];

function isStatusActive(user) {
  return !user || !user.status || user.status === 'active';
}

/** @returns {{ message: string, code: string } | null} null se l'account è utilizzabile */
function accountStatusDenial(user) {
  if (isStatusActive(user)) return null;
  if (user.status === 'banned') {
    return { message: 'Il tuo account è stato bannito. Contatta il supporto per maggiori informazioni.', code: 'ACCOUNT_BANNED' };
  }
  return { message: 'Il tuo account è sospeso. Contatta il supporto per maggiori informazioni.', code: 'ACCOUNT_SUSPENDED' };
}

module.exports = { STATUSES, isStatusActive, accountStatusDenial };
