import { Board, isTubeComplete } from './engine';
import { solve } from './solver';

/** Small deterministic RNG so level N is always the same puzzle for every player. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MAX_COLORS = 12;

export type LevelConfig = { colors: number; capacity: number; empty: number };

/** Difficulty curve: start easy so new players win fast (helps D1 retention). */
export function configFor(level: number): LevelConfig {
  if (level <= 2) return { colors: 3, capacity: 4, empty: 2 };
  if (level <= 5) return { colors: 4, capacity: 4, empty: 2 };
  if (level <= 10) return { colors: 5, capacity: 4, empty: 2 };
  const colors = Math.min(MAX_COLORS, 5 + Math.floor((level - 10) / 8) + 1);
  return { colors, capacity: 4, empty: 2 };
}

function shuffle<T>(arr: T[], rnd: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Builds level `level`. Shuffles balls randomly, then keeps only boards the solver
 * can finish and that are not already partly solved. Deterministic per level.
 */
export function generateLevel(level: number): Board {
  const { colors, capacity, empty } = configFor(level);
  const rnd = mulberry32(level * 7919 + 17);

  for (let attempt = 0; attempt < 200; attempt++) {
    const balls: number[] = [];
    for (let c = 0; c < colors; c++) for (let i = 0; i < capacity; i++) balls.push(c);
    shuffle(balls, rnd);

    const tubes: number[][] = [];
    for (let t = 0; t < colors; t++) tubes.push(balls.slice(t * capacity, (t + 1) * capacity));
    for (let e = 0; e < empty; e++) tubes.push([]);
    const board: Board = { tubes, capacity };

    // Reject boards where any tube is already a single color (too easy).
    const tooEasy = tubes.some(
      (t) => t.length && (isTubeComplete(t, capacity) || new Set(t).size === 1),
    );
    if (tooEasy) continue;
    if (solve(board)) return board;
  }
  throw new Error(`Could not generate level ${level}`);
}
