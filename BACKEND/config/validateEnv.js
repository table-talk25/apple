/** Reject placeholder credentials in production without logging their values. */
function validateEnvironmentVariables() {
  const isProduction = process.env.NODE_ENV === 'production';
  const patterns = [
    /^test-/i, /^test_/i, /test$/i,
    /^fake-/i, /^fake_/i, /fake$/i,
    /^dummy-/i, /^dummy_/i, /dummy$/i,
    /^example-/i, /^example_/i, /example$/i,
  ];
  const names = [
    'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_API_KEY',
    'TWILIO_API_SECRET', 'SENDGRID_API_KEY',
  ];
  const invalid = names.filter((name) => {
    const value = process.env[name];
    return value && patterns.some((pattern) => pattern.test(value));
  });

  for (const name of invalid) {
    console.error(`Configurazione non valida: ${name} contiene un valore di test.`);
  }

  if (isProduction && invalid.length > 0) {
    console.error('Avvio bloccato: sostituire i valori di test nella configurazione.');
    process.exit(1);
    return;
  }

  if (!isProduction && invalid.length > 0) {
    console.warn('Valori di test consentiti fuori produzione; i servizi correlati potrebbero non funzionare.');
  }

  if (isProduction) {
    console.log('Controllo dei valori di test completato; credenziali non verificate con i provider.');
    for (const name of names) {
      if (process.env[name]) console.log(`${name}: configurata (valore omesso)`);
    }
  }
}

module.exports = { validateEnvironmentVariables };
