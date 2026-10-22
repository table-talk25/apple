async function startBackend({ connectDatabase, initializeServices, listen }) {
  await connectDatabase();
  await initializeServices();
  await listen();
}

module.exports = startBackend;
