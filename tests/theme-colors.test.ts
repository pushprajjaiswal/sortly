import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES } from '../src/theme/themes';

function hexToLab(hex: string): [number, number, number] {
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  const [r, g, b] = linear;
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const pivot = (value: number) => {
    const delta = 6 / 29;
    return value > delta ** 3 ? value ** (1 / 3) : value / (3 * delta ** 2) + 4 / 29;
  };
  const [fx, fy, fz] = [pivot(x), pivot(y), pivot(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

test('all ball colors in each theme have CIELAB ΔE76 of at least 30', () => {
  for (const theme of THEMES) {
    const labs = theme.balls.map(hexToLab);
    const backgroundLab = hexToLab(theme.background);
    for (let i = 0; i < labs.length; i++) {
      const [l, a, b] = labs[i];
      const [backgroundL, backgroundA, backgroundB] = backgroundLab;
      const deltaE = Math.hypot(l - backgroundL, a - backgroundA, b - backgroundB);
      assert.ok(deltaE >= 30, `${theme.id} ball ${theme.balls[i]} has ΔE76 ${deltaE} from background ${theme.background}`);
    }
    for (let i = 0; i < labs.length; i++) {
      for (let j = 0; j < i; j++) {
        const [l1, a1, b1] = labs[i];
        const [l2, a2, b2] = labs[j];
        const deltaE = Math.hypot(l1 - l2, a1 - a2, b1 - b2);
        assert.ok(deltaE >= 30, `${theme.id} colors ${theme.balls[j]} and ${theme.balls[i]} have ΔE76 ${deltaE}`);
      }
    }
  }
});
