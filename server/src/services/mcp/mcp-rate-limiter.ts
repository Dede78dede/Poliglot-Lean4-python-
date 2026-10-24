export interface RateLimitCheckResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly limit: number;
  readonly windowMs: number;
  readonly retryAfterMs?: number;
  readonly reason?: 'RATE_LIMITED';
}

/**
 * Token bucket rate limiter for MCP external search tools.
 * Spec: 3 requests per 30 seconds for external mathematical search services (LeanSearch, Loogle, Leandex).
 */
export class McpRateLimiter {
  private readonly timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 3, windowMs = 30000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  public checkLimit(now = Date.now()): RateLimitCheckResult {
    // Purge timestamps older than the sliding window
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0]! <= cutoff) {
      this.timestamps.shift();
    }

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0]!;
      const retryAfterMs = Math.max(0, oldest + this.windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        limit: this.maxRequests,
        windowMs: this.windowMs,
        retryAfterMs,
        reason: 'RATE_LIMITED',
      };
    }

    this.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - this.timestamps.length,
      limit: this.maxRequests,
      windowMs: this.windowMs,
    };
  }

  public reset(): void {
    this.timestamps.length = 0;
  }

  public getStatus(now = Date.now()): { readonly remaining: number; readonly currentInWindow: number } {
    const cutoff = now - this.windowMs;
    const active = this.timestamps.filter((t) => t > cutoff);
    return {
      remaining: Math.max(0, this.maxRequests - active.length),
      currentInWindow: active.length,
    };
  }
}

export const mcpExternalSearchRateLimiter = new McpRateLimiter(3, 30000);
