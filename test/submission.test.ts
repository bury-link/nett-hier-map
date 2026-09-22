import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSubmission } from '../src/lib/submission.js';

test('requires either valid manual coordinates or embedded photo coordinates', () => {
  assert.deepEqual(validateSubmission({ latitude: '48.77585', longitude: '9.18293' }, null), {
    latitude: 48.77585,
    longitude: 9.18293,
  });
  assert.deepEqual(validateSubmission({}, { latitude: 48.123456, longitude: 9.987654 }), {
    latitude: 48.12346,
    longitude: 9.98765,
  });
  assert.throws(() => validateSubmission({}, null), /location/i);
});
