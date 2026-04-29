/**
 * Config Capacitor per comandi eseguiti con cwd = `FRONTEND/client`
 * (`npx cap sync`, ecc.). Eredita plugin e appId da `../../capacitor.config.ts`
 * ma forza `webDir: 'build'` (percorso corretto rispetto a questa cartella).
 *
 * Firebase Analytics / Crashlytics (Capacitor): slot plugin per le dipendenze
 * native; setup effettivo in Android/iOS (Google Services, Gradle Crashlytics).
 */
import type { CapacitorConfig } from '@capacitor/cli';
import rootConfig from '../../capacitor.config';

const base = rootConfig as CapacitorConfig;

const config: CapacitorConfig = {
  ...base,
  webDir: 'build',
  plugins: {
    ...(base.plugins || {}),
    FirebaseCrashlytics: {},
    FirebaseAnalytics: {},
  },
};

export default config;
