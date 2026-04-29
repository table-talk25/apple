/**
 * Monta tutte le route API sotto /api/*
 */
function registerApiRoutes(app) {
  app.use('/api/auth', require('./auth'));
  app.use('/api/profile', require('./profile'));
  app.use('/api/meals', require('./meal'));
  app.use('/api/chats', require('./chat'));
  app.use('/api/notifications', require('./notifications'));
  app.use('/api/users', require('./users'));
  app.use('/api/invitations', require('./invitations'));
  app.use('/api/join-requests', require('./joinRequests'));
  app.use('/api/reports', require('./reports'));
  app.use('/api/analytics', require('./analytics'));
  app.use('/api/ai', require('./ai'));
  app.use('/api/video', require('./videoCall'));
  app.use('/api/geolocation', require('./geolocation'));
  app.use('/api/notification-preferences', require('./notificationPreferences'));
  app.use('/api/interactive-notifications', require('./interactiveNotifications'));
}

module.exports = registerApiRoutes;
