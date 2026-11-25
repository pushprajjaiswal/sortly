import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, canMove, isSolved, Board } from '../src/game/engine';
import { solve } from '../src/game/solver';
import { generateLevel, configFor } from '../src/game/levels';

test('moves follow the rules', () => {
  const b: Board = { capacity: 4, tubes: [[0, 1, 1], [1], [], [0, 0, 0, 0]] };
  assert.equal(canMove(b, 0, 1), true); // 1 onto 1
  assert.equal(canMove(b, 1, 0), true);
  assert.equal(canMove(b, 3, 2), false); // finished tube can't move
  const { board, moved } = applyMove(b, 0, 1);
  assert.equal(moved, 2); // both 1s move together
  assert.deepEqual(board.tubes[1], [1, 1, 1]);
  assert.deepEqual(b.tubes[0], [0, 1, 1]); // original untouched
});

test('solved detection', () => {
  assert.equal(isSolved({ capacity: 2, tubes: [[0, 0], [1, 1], []] }), true);
  assert.equal(isSolved({ capacity: 2, tubes: [[0, 1], [1, 0], []] }), false);
});

test('levels 1-200 are deterministic and solvable', () => {
  for (let lvl = 1; lvl <= 200; lvl++) {
    const a = generateLevel(lvl);
    const b = generateLevel(lvl);
    assert.deepEqual(a, b, `level ${lvl} not deterministic`);
    assert.equal(a.tubes.length, configFor(lvl).colors + configFor(lvl).empty);
    const sol = solve(a);
    assert.ok(sol, `level ${lvl} unsolvable`);
    let cur = a;
    for (const m of sol!) {
      const r = applyMove(cur, m.from, m.to);
      assert.ok(r.moved > 0, `illegal move in solution for level ${lvl}`);
      cur = r.board;
    }
    assert.equal(isSolved(cur), true);
  }
});
