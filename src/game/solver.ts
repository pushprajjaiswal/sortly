import { Board, Move, applyMove, canMove, isSolved, topRunLength } from './engine';

// Tube order does not matter for solvability, so sort tubes to share memo entries.
const keyOf = (b: Board) =>
  b.tubes
    .map((t) => t.join(','))
    .sort()
    .join('|');

function usefulMoves(b: Board): Move[] {
  const toFilled: Move[] = [];
  const toEmpty: Move[] = [];
  let emptyUsed = false; // all empty tubes are equivalent; try only one
  for (let from = 0; from < b.tubes.length; from++) {
    const src = b.tubes[from];
    if (src.length === 0) continue;
    const run = topRunLength(src);
    for (let to = 0; to < b.tubes.length; to++) {
      if (!canMove(b, from, to)) continue;
      const dst = b.tubes[to];
      if (dst.length === 0) {
        // Moving a tube that is already a single color into an empty tube changes nothing.
        if (run === src.length) continue;
        if (emptyUsed) continue;
        toEmpty.push({ from, to });
      } else {
        toFilled.push({ from, to });
      }
    }
    if (toEmpty.length) emptyUsed = true;
  }
  // Dedupe empty-target moves: allow one per source tube.
  const seen = new Set<number>();
  const empties = toEmpty.filter((m) => (seen.has(m.from) ? false : (seen.add(m.from), true)));
  return [...toFilled, ...empties];
}

/**
 * Depth-first search for a solution. Returns the move list, or null if none was
 * found within `maxNodes` (treat null as "unsolvable or too hard").
 */
export function solve(start: Board, maxNodes = 150_000): Move[] | null {
  const visited = new Set<string>();
  const path: Move[] = [];
  let nodes = 0;

  const dfs = (b: Board): boolean => {
    if (isSolved(b)) return true;
    if (++nodes > maxNodes || path.length > 400) return false; // depth cap keeps the JS stack safe on phones
    const k = keyOf(b);
    if (visited.has(k)) return false;
    visited.add(k);
    for (const m of usefulMoves(b)) {
      const { board } = applyMove(b, m.from, m.to);
      path.push(m);
      if (dfs(board)) return true;
      path.pop();
    }
    return false;
  };

  return dfs(start) ? path.slice() : null;
}

/** First move of a solution from the current position, or null if stuck. */
export function hint(b: Board): Move | null {
  const s = solve(b, 60_000);
  return s && s.length ? s[0] : null;
}
