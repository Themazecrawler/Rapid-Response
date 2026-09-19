import { incrementCounter } from '../observability';

interface Entry {
  value: unknown;
  expiresAt: number;
}

export class TtlCache {
  private readonly entries = new Map<string, Entry>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private generation = 0;

  constructor(
    private readonly maxEntries = 100,
    private readonly now: () => number = Date.now
  ) {}

  async getOrLoad<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    if (process.env.ENABLE_CACHE === 'false') return loader();

    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > this.now()) {
      incrementCounter('rapid_response_cache_requests_total', 'Cache lookups.', { result: 'hit' });
      return cached.value as T;
    }

    const pending = this.inFlight.get(key);
    if (pending) return pending as Promise<T>;

    incrementCounter('rapid_response_cache_requests_total', 'Cache lookups.', { result: 'miss' });
    const startedGeneration = this.generation;
    const load = loader()
      .then((value) => {
        if (startedGeneration === this.generation) this.store(key, value, ttlMs);
        return value;
      })
      .finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, load);
    return load;
  }

  invalidate(prefix = ''): void {
    this.generation += 1;
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
    for (const key of [...this.inFlight.keys()]) {
      if (key.startsWith(prefix)) this.inFlight.delete(key);
    }
  }

  private store(key: string, value: unknown, ttlMs: number): void {
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
  }
}

export const appCache = new TtlCache();

export const cacheTtlMs = (name: string, fallbackSeconds: number): number => {
  const configured = Number(process.env[name]);
  return (Number.isFinite(configured) && configured > 0 ? configured : fallbackSeconds) * 1000;
};
