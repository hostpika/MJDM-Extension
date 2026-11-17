export class OriginRateLimiter {
  private origins: Map<string, number[]> = new Map();
  private maxPerMinute: number;

  constructor(maxPerMinute = 20) {
    this.maxPerMinute = maxPerMinute;
  }

  public allow(origin: string, now = Date.now()): boolean {
    const windowStart = now - 60_000;
    const timestamps = (this.origins.get(origin) || []).filter((t) => t > windowStart);

    if (timestamps.length >= this.maxPerMinute) {
      return false; // Rate limit exceeded (fail-open)
    }

    timestamps.push(now);
    this.origins.set(origin, timestamps);
    return true;
  }

  public reset(): void {
    this.origins.clear();
  }
}

export const globalOriginLimiter = new OriginRateLimiter(20);
