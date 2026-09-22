export type UploadRateLimitOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

export type UploadRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function createUploadRateLimiter({ limit, windowMs, now = Date.now }: UploadRateLimitOptions) {
  const attempts = new Map<string, number[]>();

  return {
    check(key: string): UploadRateLimitResult {
      const current = now();
      const cutoff = current - windowMs;
      const recent = (attempts.get(key) ?? []).filter((time) => time > cutoff);
      if (recent.length >= limit) {
        attempts.set(key, recent);
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - current) / 1000)) };
      }
      recent.push(current);
      attempts.set(key, recent);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
