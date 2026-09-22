import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSubmissionWithSource } from '../src/lib/submission.js';

test('records manual pins ahead of embedded EXIF GPS and labels embedded GPS correctly', () => {
  assert.deepEqual(validateSubmissionWithSource({ latitude: '48.77585', longitude: '9.18293' }, { latitude: 48.1, longitude: 9.9 }), {
    latitude: 48.77585,
    longitude: 9.18293,
    locationSource: 'manual',
  });
  assert.deepEqual(validateSubmissionWithSource({}, { latitude: 48.123456, longitude: 9.987654 }), {
    latitude: 48.12346,
    longitude: 9.98765,
    locationSource: 'exif',
  });
});
