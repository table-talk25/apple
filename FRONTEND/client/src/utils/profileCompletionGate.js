/**
 * Stessa idea di Profile/index.js `isProfileComplete`: se il backend non ha ancora
 * aggiornato `profileCompleted` ma l’utente ha già compilato i campi minimi, non
 * forzare il redirect verso il profilo (evita loop e blocchi con cache stale).
 */
export function meetsMinimumProfileFields(user) {
  if (!user) return false;
  return Boolean(
    user.nickname &&
    String(user.nickname).trim().length >= 3 &&
    user.bio &&
    String(user.bio).trim().length >= 10 &&
    Array.isArray(user.interests) &&
    user.interests.length >= 1
  );
}

/**
 * True → PrivateRoute deve mandare l’utente a completare il profilo.
 * - `profileCompleted === true` → mai redirect.
 * - `profileCompleted` assente (undefined) → non redirect (evita falsi positivi da
 *   oggetti utente parziali in memoria prima di /auth/me); il backend può comunque 403.
 * - `profileCompleted === false` → redirect solo se mancano anche i campi minimi.
 */
export function shouldForceProfileCompletionRedirect(user) {
  if (!user) return false;
  if (user.profileCompleted === true) return false;
  if (user.profileCompleted !== false) return false;
  if (meetsMinimumProfileFields(user)) return false;
  return true;
}