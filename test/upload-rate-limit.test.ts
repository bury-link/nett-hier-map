import assert from 'node:assert/strict';
import test from 'node:test';
import { createUploadRateLimiter } from '../src/lib/upload-rate-limit.js';

test('allows only the configured number of uploads per IP during the window', () => {
  let now = 1_000;
  const limiter = createUploadRateLimiter({ limit: 2, windowMs: 60_000, now: () => now });

  assert.deepEqual(limiter.check('203.0.113.5'), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.check('203.0.113.5'), { allowed: true, retryAfterSeconds: 0 });
  assert.deepEqual(limiter.check('203.0.113.5'), { allowed: false, retryAfterSeconds: 60 });

  now += 60_001;
  assert.deepEqual(limiter.check('203.0.113.5'), { allowed: true, retryAfterSeconds: 0 });
});
