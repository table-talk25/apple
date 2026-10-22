const startBackend = require('../bootstrap/startBackend');

describe('backend startup sequence', () => {
  it('waits for MongoDB before initializing services and listening', async () => {
    let resolveDatabase;
    const databaseReady = new Promise((resolve) => { resolveDatabase = resolve; });
    const connectDatabase = jest.fn(() => databaseReady);
    const initializeServices = jest.fn().mockResolvedValue(undefined);
    const listen = jest.fn().mockResolvedValue(undefined);

    const starting = startBackend({ connectDatabase, initializeServices, listen });
    expect(connectDatabase).toHaveBeenCalledTimes(1);
    expect(initializeServices).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();

    resolveDatabase();
    await starting;
    expect(initializeServices).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledTimes(1);
    expect(initializeServices.mock.invocationCallOrder[0]).toBeLessThan(listen.mock.invocationCallOrder[0]);
  });

  it('does not initialize services or listen if MongoDB fails', async () => {
    const error = new Error('database unavailable');
    const connectDatabase = jest.fn().mockRejectedValue(error);
    const initializeServices = jest.fn();
    const listen = jest.fn();

    await expect(startBackend({ connectDatabase, initializeServices, listen })).rejects.toBe(error);
    expect(initializeServices).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });

  it('waits for service initialization before listening', async () => {
    let resolveServices;
    const servicesReady = new Promise((resolve) => { resolveServices = resolve; });
    const connectDatabase = jest.fn().mockResolvedValue(undefined);
    const initializeServices = jest.fn(() => servicesReady);
    const listen = jest.fn().mockResolvedValue(undefined);

    const starting = startBackend({ connectDatabase, initializeServices, listen });
    await Promise.resolve();
    expect(initializeServices).toHaveBeenCalledTimes(1);
    expect(listen).not.toHaveBeenCalled();
    resolveServices();
    await starting;
    expect(listen).toHaveBeenCalledTimes(1);
  });

  it('does not listen if service initialization fails', async () => {
    const error = new Error('service unavailable');
    const connectDatabase = jest.fn().mockResolvedValue(undefined);
    const initializeServices = jest.fn().mockRejectedValue(error);
    const listen = jest.fn();

    await expect(startBackend({ connectDatabase, initializeServices, listen })).rejects.toBe(error);
    expect(listen).not.toHaveBeenCalled();
  });

  it('propagates HTTP listen failures', async () => {
    const error = new Error('port unavailable');
    await expect(startBackend({
      connectDatabase: jest.fn().mockResolvedValue(undefined),
      initializeServices: jest.fn().mockResolvedValue(undefined),
      listen: jest.fn().mockRejectedValue(error),
    })).rejects.toBe(error);
  });
});
