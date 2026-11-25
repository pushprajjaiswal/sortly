import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, Move, addEmptyTube, applyMove, canMove, isSolved, isStuck, isTubeComplete } from '../game/engine';
import { generateLevel } from '../game/levels';
import { hint as findHint } from '../game/solver';
import { Theme } from '../theme/themes';
import { showRewarded } from '../ads/ads';
import BannerSlot from '../ads/BannerSlot';
import TubeView from '../components/TubeView';
import GameButton from '../components/GameButton';
import { bump, tap, win } from '../components/feedback';
import { formatCoins } from '../utils/formatCoins';

const FREE_UNDOS = 5;
const HINT_COST = 20;
const TUBE_COST = 100;
export const WIN_COINS = 10;

type Props = {
  level: number;
  theme: Theme;
  coins: number;
  spendCoins: (n: number) => boolean;
  onWin: (coinsEarned: number) => void; // called when player leaves the win screen
  onHome: () => void;
};

export default function GameScreen({ level, theme, coins, spendCoins, onWin, onHome }: Props) {
  const initial = useMemo(() => generateLevel(level), [level]);
  const [board, setBoard] = useState<Board>(initial);
  const [history, setHistory] = useState<Board[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [undos, setUndos] = useState(FREE_UNDOS);
  const [extraTubeUsed, setExtraTubeUsed] = useState(false);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [shakes, setShakes] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [moves, setMoves] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const solved = isSolved(board);
  const stuck = !solved && isStuck(board);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  const commit = (next: Board) => {
    setHistory((h) => [...h.slice(-50), board]);
    setBoard(next);
    setMoves((m) => m + 1);
    setHintMove(null);
    if (isSolved(next)) win();
  };

  const onTubePress = useCallback(
    (i: number) => {
      if (solved) return;
      if (selected === null) {
        if (board.tubes[i].length === 0 || isTubeComplete(board.tubes[i], board.capacity)) {
          bump();
          setShakes((s) => ({ ...s, [i]: (s[i] ?? 0) + 1 }));
          return;
        }
        tap();
        setSelected(i);
        return;
      }
      if (selected === i) {
        setSelected(null);
        return;
      }
      if (canMove(board, selected, i)) {
        tap();
        commit(applyMove(board, selected, i).board);
        setSelected(null);
      } else if (board.tubes[i].length > 0 && !isTubeComplete(board.tubes[i], board.capacity)) {
        // Tapping another non-empty tube switches the selection (feels natural).
        tap();
        setSelected(i);
      } else {
        bump();
        setShakes((s) => ({ ...s, [i]: (s[i] ?? 0) + 1 }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, selected, solved],
  );

  const withAd = async (onReward: () => void) => {
    setBusy(true);
    const ok = await showRewarded();
    setBusy(false);
    if (ok) onReward();
    else flash('Ad not ready yet, try again in a moment');
  };

  const undo = () => {
    if (!history.length) return;
    if (undos <= 0) {
      withAd(() => setUndos(FREE_UNDOS));
      return;
    }
    setBoard(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setUndos((u) => u - 1);
    setMoves((m) => Math.max(0, m - 1));
    setSelected(null);
    setHintMove(null);
  };

  const restart = () => {
    setBoard(initial);
    setHistory([]);
    setSelected(null);
    setHintMove(null);
    setExtraTubeUsed(false);
    setUndos(FREE_UNDOS);
    setMoves(0);
  };

  const showHint = () => {
    if (hintMove || busy) return;
    const calculateHint = () => {
      setBusy(true);
      setTimeout(() => {
        const m = findHint(board);
        setBusy(false);
        if (m) {
          setSelected(null);
          setHintMove(m);
        } else flash('No solution from here — try Undo or +Tube');
      }, 30);
    };
    if (spendCoins(HINT_COST)) calculateHint();
    else withAd(calculateHint);
  };

  const addTube = () => {
    if (extraTubeUsed) return;
    const give = () => {
      setBoard((b) => addEmptyTube(b));
      setExtraTubeUsed(true);
      setHintMove(null);
    };
    if (spendCoins(TUBE_COST)) give();
    else withAd(give);
  };

  // --- layout: fit tubes into 1 or 2 rows ---
  const { width, height } = useWindowDimensions();
  const narrow = width < 300;
  const insets = useSafeAreaInsets();
  const n = board.tubes.length;
  const perRow = n <= 6 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / perRow);
  const usableW = Math.min(width, 600) - 32;
  const byWidth = (usableW / perRow - 14) / 1.2;
  const usableH = height - insets.top - insets.bottom - 330;
  const byHeight = usableH / rows / (board.capacity * 1.08 + 1.8);
  const ballSize = Math.max(18, Math.min(46, byWidth, byHeight));

  const rowsOfIdx: number[][] = [];
  for (let r = 0; r < rows; r++) rowsOfIdx.push([...Array(n).keys()].slice(r * perRow, (r + 1) * perRow));

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <GameButton iconOnly={narrow} label="Home" icon="🏠" onPress={onHome} theme={theme} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.level, narrow && styles.compactLevel, { color: theme.text }]}>Level {level}</Text>
          <Text style={{ color: theme.subtext, fontWeight: '600' }}>{moves} {moves === 1 ? 'move' : 'moves'}</Text>
        </View>
        <View style={[styles.headerSide, styles.headerRight]}>
          <View style={[styles.coins, narrow && styles.compactCoins, { backgroundColor: theme.surface }]}>
            <Text
              selectable={false}
              numberOfLines={1}
              style={{ color: theme.accent, fontWeight: '800', fontSize: narrow ? 12 : 16 }}
            >
              🪙 {formatCoins(coins)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.board}>
        {rowsOfIdx.map((row, r) => (
          <View key={r} style={[styles.row, { marginTop: ballSize * 1.4 }]}>
            {row.map((i) => (
              <TubeView
                key={i}
                tube={board.tubes[i]}
                capacity={board.capacity}
                ballSize={ballSize}
                selected={selected === i}
                highlighted={!!hintMove && (hintMove.from === i || hintMove.to === i)}
                complete={isTubeComplete(board.tubes[i], board.capacity)}
                theme={theme}
                shake={shakes[i] ?? 0}
                onPress={() => onTubePress(i)}
              />
            ))}
          </View>
        ))}
      </View>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.text, fontWeight: '600' }}>{toast}</Text>
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <GameButton compact label="Undo" icon="↩️" badge={undos > 0 ? String(undos) : 'AD'} onPress={undo} theme={theme} disabled={!history.length || busy} />
        <GameButton compact label="Restart" icon="🔄" onPress={restart} theme={theme} disabled={busy} />
        <GameButton compact label="Hint" icon="💡" badge={coins >= HINT_COST ? `${HINT_COST}` : 'AD'} onPress={showHint} theme={theme} disabled={busy || solved} />
        <GameButton compact label="+Tube" icon="🧪" badge={extraTubeUsed ? undefined : coins >= TUBE_COST ? `${TUBE_COST}` : 'AD'} onPress={addTube} theme={theme} disabled={busy || extraTubeUsed || solved} />
      </View>

      <View style={{ paddingBottom: insets.bottom }}>
        <BannerSlot />
      </View>

      {stuck ? (
        <Overlay
          theme={theme}
          title="No moves left!"
          subtitle={extraTubeUsed ? 'Undo a few moves or restart the level.' : 'Undo a few moves or add an extra tube.'}
        >
          <GameButton big variant="primary" label={extraTubeUsed ? 'Restart' : 'Add tube'} icon={extraTubeUsed ? '🔄' : '🧪'} onPress={extraTubeUsed ? restart : addTube} theme={theme} />
          <GameButton big label="Undo" icon="↩️" onPress={undo} theme={theme} />
        </Overlay>
      ) : null}

      {solved ? <WinOverlay theme={theme} level={level} moves={moves} busy={busy} onClaim={(mult) => onWin(WIN_COINS * mult)} withAd={withAd} /> : null}

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : null}
    </View>
  );
}

function Overlay({ theme, title, subtitle, children }: { theme: Theme; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.overlay}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={{ color: theme.subtext, textAlign: 'center', marginBottom: 20 }}>{subtitle}</Text>
        <View style={{ gap: 12, alignSelf: 'stretch' }}>{children}</View>
      </View>
    </View>
  );
}

function WinOverlay({
  theme,
  level,
  moves,
  busy,
  onClaim,
  withAd,
}: {
  theme: Theme;
  level: number;
  moves: number;
  busy: boolean;
  onClaim: (multiplier: number) => void;
  withAd: (fn: () => void) => Promise<void>;
}) {
  return (
    <Overlay theme={theme} title={`Level ${level} complete! 🎉`} subtitle={`Solved in ${moves} ${moves === 1 ? 'move' : 'moves'} · +${WIN_COINS} coins`}>
      <GameButton big variant="primary" icon="🎬" label={`Get ${WIN_COINS * 3} coins`} onPress={() => withAd(() => onClaim(3))} theme={theme} disabled={busy} />
      <GameButton big label="Next level" icon="➡️" onPress={() => onClaim(1)} theme={theme} disabled={busy} />
    </Overlay>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  headerSide: { flex: 1, alignItems: 'flex-start' },
  headerRight: { alignItems: 'flex-end' },
  headerCenter: { flex: 2, alignItems: 'center' },
  level: { fontSize: 24, fontWeight: '900' },
  compactLevel: { fontSize: 20 },
  coins: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, minWidth: 64, alignItems: 'center' },
  compactCoins: { paddingHorizontal: 2, minWidth: 0 },
  board: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 24 },
  row: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  toast: { position: 'absolute', bottom: 160, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 24, padding: 24, alignItems: 'center' },
  cardTitle: { fontSize: 24, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
});
