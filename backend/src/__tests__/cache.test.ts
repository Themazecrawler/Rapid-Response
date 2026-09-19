import { TtlCache } from '../services/cache';

describe('TtlCache', () => {
  let now = 1_000;
  const cache = () => new TtlCache(3, () => now);

  beforeEach(() => {
    now = 1_000;
    delete process.env.ENABLE_CACHE;
  });

  it('serves a repeat lookup from memory until the TTL expires', async () => {
    const c = cache();
    const loader = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    expect(await c.getOrLoad('k', 1000, loader)).toBe('first');
    expect(await c.getOrLoad('k', 1000, loader)).toBe('first');
    now += 1001;
    expect(await c.getOrLoad('k', 1000, loader)).toBe('second');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight load between concurrent callers', async () => {
    const c = cache();
    let release: (value: string) => void = () => undefined;
    const loader = jest.fn(() => new Promise<string>((resolve) => (release = resolve)));

    const first = c.getOrLoad('k', 1000, loader);
    const second = c.getOrLoad('k', 1000, loader);
    release('value');

    expect(await Promise.all([first, second])).toEqual(['value', 'value']);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('invalidates by prefix and leaves other keys alone', async () => {
    const c = cache();
    const alerts = jest.fn().mockResolvedValue('a');
    const contacts = jest.fn().mockResolvedValue('c');
    await c.getOrLoad('alerts:stats', 1000, alerts);
    await c.getOrLoad('contacts:all', 1000, contacts);

    c.invalidate('alerts:');
    await c.getOrLoad('alerts:stats', 1000, alerts);
    await c.getOrLoad('contacts:all', 1000, contacts);

    expect(alerts).toHaveBeenCalledTimes(2);
    expect(contacts).toHaveBeenCalledTimes(1);
  });

  it('does not store a value loaded before an invalidation that raced with it', async () => {
    const c = cache();
    let release: (value: string) => void = () => undefined;
    const slow = jest.fn(() => new Promise<string>((resolve) => (release = resolve)));
    const fresh = jest.fn().mockResolvedValue('fresh');

    const stale = c.getOrLoad('alerts:stats', 1000, slow);
    c.invalidate('alerts:');
    release('stale');
    await stale;

    expect(await c.getOrLoad('alerts:stats', 1000, fresh)).toBe('fresh');
    expect(fresh).toHaveBeenCalledTimes(1);
  });

  it('evicts the oldest entry when full', async () => {
    const c = cache();
    for (const key of ['a', 'b', 'c', 'd']) {
      await c.getOrLoad(key, 1000, async () => key);
    }
    const loader = jest.fn().mockResolvedValue('reloaded');
    expect(await c.getOrLoad('a', 1000, loader)).toBe('reloaded');
  });

  it('bypasses the cache when the feature flag is off', async () => {
    process.env.ENABLE_CACHE = 'false';
    const c = cache();
    const loader = jest.fn().mockResolvedValue('v');
    await c.getOrLoad('k', 1000, loader);
    await c.getOrLoad('k', 1000, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed load', async () => {
    const c = cache();
    const loader = jest.fn().mockRejectedValueOnce(new Error('db down')).mockResolvedValue('ok');
    await expect(c.getOrLoad('k', 1000, loader)).rejects.toThrow('db down');
    expect(await c.getOrLoad('k', 1000, loader)).toBe('ok');
  });
});
