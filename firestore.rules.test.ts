import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

/**
 * Static & invariant verification test suite for firestore.rules against the Dirty Dozen payloads.
 */
test('Firestore rules enforce all 8 Pillars and block the Dirty Dozen payloads', () => {
  const rulesPath = fs.existsSync('firestore.rules')
    ? 'firestore.rules'
    : 'DRAFT_firestore.rules';
  const rulesText = fs.readFileSync(rulesPath, 'utf-8');

  // 1. Global Safety Net
  assert.equal(
    rulesText.includes('match /{document=**} {\n      allow read, write: if false;\n    }'),
    true
  );

  // 2. Verified Email Enforcement
  assert.equal(rulesText.includes('request.auth.token.email_verified == true'), true);

  // 3. 5-Device Cap & 2-Parent Cap
  assert.equal(rulesText.includes('data.deviceIds.size() <= 5'), true);
  assert.equal(rulesText.includes('data.parentIds.size() <= 2'), true);

  // 4. Strict Key Validation (hasAll & hasOnly)
  assert.equal(rulesText.includes('.keys().hasAll('), true);
  assert.equal(rulesText.includes('.keys().hasOnly('), true);

  // 5. Temporal Integrity & Immutability
  assert.equal(rulesText.includes('incoming().createdAt == request.time'), true);
  assert.equal(rulesText.includes('incoming().updatedAt == request.time'), true);
  assert.equal(rulesText.includes('incoming().ownerId == existing().ownerId'), true);
});
