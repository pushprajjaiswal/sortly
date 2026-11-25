// Pure game logic for the ball-sort puzzle. No React imports here so it can be unit tested.

export type Tube = number[]; // bottom -> top, each number is a color index
export type Board = { tubes: Tube[]; capacity: number };
export type Move = { from: number; to: number };

export const cloneBoard = (b: Board): Board => ({
  capacity: b.capacity,
  tubes: b.tubes.map((t) => t.slice()),
});

const top = (t: Tube) => t[t.length - 1];

/** Number of same-colored balls stacked at the top of a tube. */
export function topRunLength(t: Tube): number {
  if (t.length === 0) return 0;
  const c = top(t);
  let n = 0;
  for (let i = t.length - 1; i >= 0 && t[i] === c; i--) n++;
  return n;
}

export function isTubeComplete(t: Tube, capacity: number): boolean {
  return t.length === capacity && topRunLength(t) === capacity;
}

export function canMove(b: Board, from: number, to: number): boolean {
  if (from === to) return false;
  const src = b.tubes[from];
  const dst = b.tubes[to];
  if (!src || !dst || src.length === 0) return false;
  if (dst.length >= b.capacity) return false;
  if (isTubeComplete(src, b.capacity)) return false;
  return dst.length === 0 || top(dst) === top(src);
}

/**
 * Moves as many matching balls from the top of `from` as fit into `to`.
 * Returns the new board and how many balls moved (0 if illegal).
 */
export function applyMove(b: Board, from: number, to: number): { board: Board; moved: number } {
  if (!canMove(b, from, to)) return { board: b, moved: 0 };
  const next = cloneBoard(b);
  const src = next.tubes[from];
  const dst = next.tubes[to];
  const count = Math.min(topRunLength(src), b.capacity - dst.length);
  for (let i = 0; i < count; i++) dst.push(src.pop()!);
  return { board: next, moved: count };
}

export function isSolved(b: Board): boolean {
  return b.tubes.every((t) => t.length === 0 || isTubeComplete(t, b.capacity));
}

export function legalMoves(b: Board): Move[] {
  const moves: Move[] = [];
  for (let from = 0; from < b.tubes.length; from++) {
    for (let to = 0; to < b.tubes.length; to++) {
      if (canMove(b, from, to)) moves.push({ from, to });
    }
  }
  return moves;
}

/** True when no legal move exists and the board is not solved. */
export function isStuck(b: Board): boolean {
  return !isSolved(b) && legalMoves(b).length === 0;
}

export function addEmptyTube(b: Board): Board {
  const next = cloneBoard(b);
  next.tubes.push([]);
  return next;
}
