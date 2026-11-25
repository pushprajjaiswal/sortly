import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCoins } from '../src/utils/formatCoins';

test('formats coin balances at compact display thresholds', () => {
  assert.equal(formatCoins(9_999), '9999');
  assert.equal(formatCoins(10_000), '10k');
  assert.equal(formatCoins(10_500), '10.5k');
  assert.equal(formatCoins(1_200_000), '1.2M');
});
