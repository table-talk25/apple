/**
 * Valida che variabili sensibili non contengano valori di test in produzione.
 */
function validateEnvironmentVariables() {
  const isProduction = process.env.NODE_ENV === 'production';
  const testValuePatterns = [
    /^test-/i,
    /^test_/i,
    /test$/i,
    /^fake-/i,
    /^fake_/i,
    /fake$/i,
    /^dummy-/i,
    /^dummy_/i,
    /dummy$/i,
    /^example-/i,
    /^example_/i,
    /example$/i,
  ];

  const criticalVars = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_API_KEY: process.env.TWILIO_API_KEY,
    TWILIO_API_SECRET: process.env.TWILIO_API_SECRET,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  };

  const errors = [];

  for (const [varName, varValue] of Object.entries(criticalVars)) {
    if (varValue) {
      const isTestValue = testValuePatterns.some((pattern) => pattern.test(varValue));

      if (isTestValue) {
        const errorMsg = `❌ ERRORE CRITICO: ${varName} contiene un valore di test: "${varValue}"`;
        errors.push(errorMsg);
        console.error(errorMsg);

        if (isProduction) {
          console.error("🚨 PRODUZIONE: Non è possibile avviare il server con valori di test!");
          console.error(`💡 Soluzione: Imposta ${varName} con una chiave API reale su Render Dashboard`);
        } else {
          console.warn(
            `⚠️  SVILUPPO: ${varName} contiene un valore di test. Funzionalità correlate non funzioneranno.`
          );
        }
      }
    }
  }

  if (isProduction && errors.length > 0) {
    console.error('\n🚨 ============================================');
    console.error('🚨 ERRORE: VALORI DI TEST RILEVATI IN PRODUZIONE');
    console.error('🚨 ============================================');
    errors.forEach((err) => console.error(err));
    console.error('\n💡 AZIONE RICHIESTA:');
    console.error('   1. Vai su Render Dashboard → Environment');
    console.error('   2. Rimuovi o aggiorna le variabili con valori di test');
    console.error('   3. Imposta le chiavi API reali per:');
    errors.forEach((err) => {
      const varName = err.match(/^❌ ERRORE CRITICO: (\w+)/)?.[1];
      if (varName) console.error(`      - ${varName}`);
    });
    console.error("\n❌ Il server non si avvierà fino a quando non correggi queste variabili.\n");
    process.exit(1);
  }

  if (!isProduction && errors.length > 0) {
    console.warn('\n⚠️  ============================================');
    console.warn('⚠️  AVVISO: VALORI DI TEST RILEVATI IN SVILUPPO');
    console.warn('⚠️  ============================================');
    errors.forEach((err) => console.warn(err));
    console.warn(
      '\n💡 Nota: In sviluppo è permesso, ma le funzionalità correlate non funzioneranno.\n'
    );
  }

  if (isProduction) {
    console.log("✅ Validazione variabili d'ambiente completata");
    for (const [varName, varValue] of Object.entries(criticalVars)) {
      if (varValue && !testValuePatterns.some((p) => p.test(varValue))) {
        const masked =
          varValue.length > 8
            ? `${varValue.substring(0, 4)}...${varValue.substring(varValue.length - 4)}`
            : '***';
        console.log(`   ✓ ${varName}: ${masked} (valida)`);
      }
    }
  }
}

module.exports = { validateEnvironmentVariables };
