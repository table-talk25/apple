// SEC-04: cancellazione di file su disco solo dentro una cartella base.
const path = require('path');
const fs = require('fs');

const REMOTE_URL_RE = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Restituisce il percorso assoluto di `fileName` dentro `baseDir`, oppure null se:
 * - il nome non è una stringa non vuota o è un URL (non è un file locale);
 * - il nome contiene separatori o sequenze di risalita (basename diverso dal nome);
 * - il percorso risolto esce da `baseDir`.
 */
function resolveInside(baseDir, fileName) {
  if (typeof fileName !== 'string' || fileName.length === 0 || fileName.includes('\0')) return null;
  if (REMOTE_URL_RE.test(fileName)) return null;
  if (/[\\/]/.test(fileName)) return null; // separatori (anche backslash) mai ammessi
  const safeName = path.basename(fileName);
  if (safeName !== fileName || safeName === '.' || safeName === '..') return null;
  const base = path.resolve(baseDir);
  const target = path.resolve(base, safeName);
  if (path.dirname(target) !== base) return null;
  return target;
}

/**
 * Elimina il file solo se resta dentro `baseDir` ed è un file regolare.
 * @returns {boolean} true se è stato eliminato
 */
function safeUnlinkInside(baseDir, fileName, warn = console.warn) {
  const target = resolveInside(baseDir, fileName);
  if (!target) {
    if (typeof fileName === 'string' && !REMOTE_URL_RE.test(fileName)) {
      warn('[SafeFile] Eliminazione rifiutata: nome file non valido o fuori dalla cartella consentita');
    }
    return false;
  }
  try {
    const stat = fs.lstatSync(target);
    if (!stat.isFile()) return false;
    fs.unlinkSync(target);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') warn(`[SafeFile] Eliminazione non riuscita (${error.code || 'errore'})`);
    return false;
  }
}

module.exports = { resolveInside, safeUnlinkInside };
