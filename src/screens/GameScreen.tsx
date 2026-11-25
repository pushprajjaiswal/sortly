import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { HostInstance } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Board, Move, addEmptyTube, applyMove, canMove, isSolved, isStuck, isTubeComplete } from '../game/engine';
import { generateLevel } from '../game/levels';
import { hint as findHint } from '../game/solver';
import { Theme } from '../theme/themes';
import { showRewarded } from '../ads/ads';
import BannerSlot from '../ads/BannerSlot';
import TubeView from '../components/TubeView';
import GameButton from '../components/GameButton';
import { bump, complete, land, tap, win } from '../components/feedback';
import { formatCoins } from '../utils/formatCoins';
import { play } from '../audio/sfx';

const FREE_UNDOS = 5;
const HINT_COST = 20;
const TUBE_COST = 100;
export const WIN_COINS = 10;

type Props = {
  level: number;
  theme: Theme;
  coins: number;
  soundOn: boolean;
  onToggleSound: () => void;
  spendCoins: (n: number) => boolean;
  onWin: (coinsEarned: number) => void;
  onHome: () => void;
};

type Rect = { x: number; y: number; width: number; height: number };
type FlyingBall = {
  color: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: Animated.Value;
};
type Flight = {
  balls: FlyingBall[];
  to: number;
  moved: number;
  completed: boolean;
  solved: boolean;
  reducedMotion: boolean;
};

function measureInWindow(ref: HostInstance | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!ref) {
      resolve(null);
      return;
    }
    ref.measureInWindow((x, y, width, height) => {
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}

export default function GameScreen({
  level,
  theme,
  coins,
  soundOn,
  onToggleSound,
  spendCoins,
  onWin,
  onHome,
}: Props) {
  const initial = useMemo(() => generateLevel(level), [level]);
  const [board, setBoard] = useState<Board>(initial);
  const [history, setHistory] = useState<Board[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [undos, setUndos] = useState(FREE_UNDOS);
  const [extraTubeUsed, setExtraTubeUsed] = useState(false);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [shakes, setShakes] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [moves, setMoves] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [landingTokens, setLandingTokens] = useState<Record<number, number>>({});
  const [completeTokens, setCompleteTokens] = useState<Record<number, number>>({});
  const [confettiActive, setConfettiActive] = useState(false);
  const [winVisible, setWinVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const movingRef = useRef(false);
  const rootRef = useRef<HostInstance | null>(null);
  const tubeRefs = useRef<(HostInstance | null)[]>([]);
  const tubeRefCallbacks = useMemo(
    () =>
      Array.from({ length: board.tubes.length }, (_, index) => (node: HostInstance | null) => {
        tubeRefs.current[index] = node;
      }),
    [board.tubes.length],
  );
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tubePressHandler = useRef<(index: number) => void>(() => {});
  const onTubePress = useCallback((index: number) => tubePressHandler.current(index), []);

  const solved = isSolved(board);
  const stuck = !solved && isStuck(board);
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
  const gap = Math.round(ballSize * 0.08);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const timer = setTimeout(fn, delay);
    timers.current.push(timer);
    return timer;
  }, []);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const flash = useCallback(
    (msg: string) => {
      setToast(msg);
      schedule(() => setToast(null), 1600);
    },
    [schedule],
  );

  const finishMove = useCallback(
    ({ to, completed, solved: moveSolved }: Pick<Flight, 'to' | 'completed' | 'solved'>) => {
      movingRef.current = false;
      setAnimating(false);
      setLandingTokens((tokens) => ({ ...tokens, [to]: (tokens[to] ?? 0) + 1 }));
      play('drop');
      land();
      if (completed) {
        setCompleteTokens((tokens) => ({ ...tokens, [to]: (tokens[to] ?? 0) + 1 }));
        play('complete');
        complete();
      }
      if (moveSolved) {
        win();
        if (!reduceMotion) setConfettiActive(true);
        schedule(() => {
          setConfettiActive(false);
          play('win');
          schedule(() => setWinVisible(true), 600);
        }, reduceMotion ? 120 : 800);
      }
    },
    [reduceMotion, schedule],
  );

  const startMove = useCallback(
    async (currentBoard: Board, from: number, to: number) => {
      if (movingRef.current) return;
      const { board: movedBoard, moved } = applyMove(currentBoard, from, to);
      if (moved === 0) return;

      movingRef.current = true;
      setAnimating(true);
      const targetCompleted =
        !isTubeComplete(currentBoard.tubes[to], currentBoard.capacity) &&
        isTubeComplete(movedBoard.tubes[to], movedBoard.capacity);
      const nextBoard: Board = {
        ...movedBoard,
        tubes: movedBoard.tubes.map((tube, index) =>
          index === from || index === to ? tube : currentBoard.tubes[index],
        ),
      };
      const commitMove = () => {
        setHistory((items) => [...items.slice(-50), currentBoard]);
        setBoard(nextBoard);
        setMoves((count) => count + 1);
        setHintMove(null);
        setSelected(null);
      };
      const moveResult = {
        to,
        completed: targetCompleted,
        solved: isSolved(nextBoard),
      };

      const [rootRect, sourceRect, targetRect] = await Promise.all([
        measureInWindow(rootRef.current),
        measureInWindow(tubeRefs.current[from] ?? null),
        measureInWindow(tubeRefs.current[to] ?? null),
      ]);
      if (!rootRect || !sourceRect || !targetRect) {
        commitMove();
        finishMove(moveResult);
        return;
      }

      const sourceTube = currentBoard.tubes[from];
      const targetTubeLength = currentBoard.tubes[to].length;
      const balls: FlyingBall[] = Array.from({ length: moved }, (_, index) => {
        const sourceSlot = sourceTube.length - 1 - index;
        const targetSlot = targetTubeLength + index;
        const slotY = (rect: Rect, slot: number) =>
          rect.y -
          rootRect.y +
          rect.height -
          gap -
          ballSize -
          slot * (ballSize + gap);
        return {
          color: sourceTube[sourceSlot],
          fromX: sourceRect.x - rootRect.x + (sourceRect.width - ballSize) / 2,
          fromY: slotY(sourceRect, sourceSlot) - (index === 0 ? ballSize * 1.1 : 0),
          toX: targetRect.x - rootRect.x + (targetRect.width - ballSize) / 2,
          toY: slotY(targetRect, targetSlot),
          progress: new Animated.Value(0),
        };
      });

      commitMove();
      setFlight({ balls, ...moveResult, moved, reducedMotion: reduceMotion });
    },
    [ballSize, finishMove, gap, reduceMotion],
  );

  useEffect(() => {
    if (!flight) return;
    const animations = flight.balls.map((ball) =>
      Animated.timing(ball.progress, {
        toValue: 1,
        duration: flight.reducedMotion ? 140 : 270,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    const animation = Animated.stagger(flight.reducedMotion ? 0 : 50, animations);
    animation.start(({ finished }) => {
      if (!finished) return;
      setFlight(null);
      finishMove(flight);
    });
    return () => animation.stop();
  }, [flight, finishMove]);

  const handleTubePress = useCallback(
    (i: number) => {
      if (solved || movingRef.current || busy) return;
      if (selected === null) {
        if (board.tubes[i].length === 0 || isTubeComplete(board.tubes[i], board.capacity)) {
          play('invalid');
          bump();
          setShakes((s) => ({ ...s, [i]: (s[i] ?? 0) + 1 }));
          return;
        }
        play('pick');
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
        void startMove(board, selected, i);
      } else if (board.tubes[i].length > 0 && !isTubeComplete(board.tubes[i], board.capacity)) {
        play('pick');
        tap();
        setSelected(i);
      } else {
        play('invalid');
        bump();
        setShakes((s) => ({ ...s, [i]: (s[i] ?? 0) + 1 }));
      }
    },
    [board, busy, selected, solved, startMove],
  );

  useLayoutEffect(() => {
    tubePressHandler.current = handleTubePress;
  }, [handleTubePress]);

  const withAd = async (onReward: () => void) => {
    setBusy(true);
    const ok = await showRewarded();
    setBusy(false);
    if (ok) onReward();
    else flash('Ad not ready yet, try again in a moment');
  };

  const undo = () => {
    if (movingRef.current || busy || !history.length) return;
    if (undos <= 0) {
      void withAd(() => setUndos(FREE_UNDOS));
      return;
    }
    setBoard(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setUndos((u) => u - 1);
    setMoves((m) => Math.max(0, m - 1));
    setSelected(null);
    setHintMove(null);
    play('drop');
    land();
  };

  const restart = () => {
    if (movingRef.current || busy) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBoard(initial);
    setHistory([]);
    setSelected(null);
    setHintMove(null);
    setToast(null);
    setExtraTubeUsed(false);
    setUndos(FREE_UNDOS);
    setMoves(0);
    setWinVisible(false);
    setConfettiActive(false);
  };

  const showHint = () => {
    if (hintMove || busy || movingRef.current) return;
    const calculateHint = () => {
      setBusy(true);
      schedule(() => {
        const m = findHint(board);
        setBusy(false);
        if (m) {
          setSelected(null);
          setHintMove(m);
        } else flash('No solution from here — try Undo or +Tube');
      }, 30);
    };
    if (spendCoins(HINT_COST)) calculateHint();
    else void withAd(calculateHint);
  };

  const addTube = () => {
    if (movingRef.current || busy || extraTubeUsed || solved) return;
    const give = () => {
      setBoard((b) => {
        const added = addEmptyTube(b);
        return { ...added, tubes: [...b.tubes, added.tubes[added.tubes.length - 1]] };
      });
      setExtraTubeUsed(true);
      setHintMove(null);
    };
    if (spendCoins(TUBE_COST)) give();
    else void withAd(give);
  };

  const rowsOfIdx: number[][] = [];
  for (let r = 0; r < rows; r++) rowsOfIdx.push([...Array(n).keys()].slice(r * perRow, (r + 1) * perRow));
  const controlsBusy = busy || animating;

  return (
    <View ref={rootRef} collapsable={false} style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <GameButton iconOnly={narrow} label="Home" icon="🏠" onPress={onHome} theme={theme} disabled={animating} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.level, narrow && styles.compactLevel, { color: theme.text }]}>Level {level}</Text>
          <Text style={{ color: theme.subtext, fontWeight: '600' }}>
            {moves} {moves === 1 ? 'move' : 'moves'}
          </Text>
        </View>
        <View style={[styles.headerSide, styles.headerRight]}>
          <View style={styles.headerActions}>
            <GameButton
              iconOnly
              label={soundOn ? 'Sound on' : 'Sound off'}
              accessibilityLabel={soundOn ? 'Turn sound off' : 'Turn sound on'}
              icon={soundOn ? '🔊' : '🔇'}
              onPress={onToggleSound}
              theme={theme}
              disabled={animating}
            />
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
      </View>

      <View collapsable={false} style={styles.board}>
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
                hiddenTopCount={flight?.to === i ? flight.moved : 0}
                landingToken={landingTokens[i] ?? 0}
                completeToken={completeTokens[i] ?? 0}
                reduceMotion={reduceMotion}
                tubeRef={tubeRefCallbacks[i]}
                tubeIndex={i}
                onPress={onTubePress}
              />
            ))}
          </View>
        ))}
      </View>

      {flight
        ? flight.balls.map((ball, index) => {
            const translateX = ball.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, ball.toX - ball.fromX],
            });
            const deltaY = ball.toY - ball.fromY;
            const translateY = ball.progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, deltaY / 2 - Math.max(36, ballSize * 1.4), deltaY],
            });
            const opacity = flight.reducedMotion
              ? ball.progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [1, 0.8, 0] })
              : 1;
            return (
              <Animated.View
                key={`${flight.to}-${index}`}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: ball.fromX,
                  top: ball.fromY,
                  width: ballSize,
                  height: ballSize,
                  borderRadius: ballSize / 2,
                  backgroundColor: theme.balls[ball.color % theme.balls.length],
                  opacity,
                  zIndex: 10,
                  elevation: 10,
                  transform: [{ translateX }, { translateY }],
                }}
              />
            );
          })
        : null}

      {toast ? (
        <View style={[styles.toast, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.text, fontWeight: '600' }}>{toast}</Text>
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <GameButton compact label="Undo" icon="↩️" badge={undos > 0 ? String(undos) : 'AD'} onPress={undo} theme={theme} disabled={!history.length || controlsBusy} />
        <GameButton compact label="Restart" icon="🔄" onPress={restart} theme={theme} disabled={controlsBusy} />
        <GameButton compact label="Hint" icon="💡" badge={coins >= HINT_COST ? `${HINT_COST}` : 'AD'} onPress={showHint} theme={theme} disabled={controlsBusy || solved} />
        <GameButton compact label="+Tube" icon="🧪" badge={extraTubeUsed ? undefined : coins >= TUBE_COST ? `${TUBE_COST}` : 'AD'} onPress={addTube} theme={theme} disabled={controlsBusy || extraTubeUsed || solved} />
      </View>

      <View style={{ paddingBottom: insets.bottom }}>
        <BannerSlot />
      </View>

      <Confetti active={confettiActive && !reduceMotion} theme={theme} />

      {stuck && !animating ? (
        <Overlay
          theme={theme}
          title="No moves left!"
          subtitle={extraTubeUsed ? 'Undo a few moves or restart the level.' : 'Undo a few moves or add an extra tube.'}
        >
          <GameButton big variant="primary" label={extraTubeUsed ? 'Restart' : 'Add tube'} icon={extraTubeUsed ? '🔄' : '🧪'} onPress={extraTubeUsed ? restart : addTube} theme={theme} />
          <GameButton big label="Undo" icon="↩️" onPress={undo} theme={theme} disabled={controlsBusy} />
        </Overlay>
      ) : null}

      {winVisible ? (
        <WinOverlay
          theme={theme}
          level={level}
          moves={moves}
          busy={busy}
          reduceMotion={reduceMotion}
          onClaim={(multiplier) => onWin(WIN_COINS * multiplier)}
          withAd={withAd}
        />
      ) : null}

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : null}
    </View>
  );
}

function Overlay({ theme, title, subtitle, children }: { theme: Theme; title: string; subtitle: string; children: ReactNode }) {
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
  reduceMotion,
  onClaim,
  withAd,
}: {
  theme: Theme;
  level: number;
  moves: number;
  busy: boolean;
  reduceMotion: boolean;
  onClaim: (multiplier: number) => void;
  withAd: (fn: () => void) => Promise<void>;
}) {
  const [rewardCount, setRewardCount] = useState(WIN_COINS);
  const [claiming, setClaiming] = useState(false);
  const claimTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.92));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: reduceMotion ? 180 : 260, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 24, bounciness: 5 }),
    ]).start();
  }, [opacity, reduceMotion, scale]);

  useEffect(
    () => () => {
      claimTimers.current.forEach(clearTimeout);
    },
    [],
  );

  const claim = useCallback(
    (multiplier: number) => {
      if (claiming) return;
      setClaiming(true);
      setRewardCount(0);
      play('coins');
      const total = WIN_COINS * multiplier;
      const steps = 10;
      for (let step = 1; step <= steps; step++) {
        const timer = setTimeout(() => {
          setRewardCount(Math.round((total * step) / steps));
          if (step === steps) onClaim(multiplier);
        }, step * 45);
        claimTimers.current.push(timer);
      }
    },
    [claiming, onClaim],
  );

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, transform: [{ scale }] }]}>
      <Overlay
        theme={theme}
        title={`Level ${level} complete! 🎉`}
        subtitle={`Solved in ${moves} ${moves === 1 ? 'move' : 'moves'} · +${rewardCount} coins`}
      >
        <GameButton
          big
          variant="primary"
          icon="🎬"
          label={`Get ${WIN_COINS * 3} coins`}
          onPress={() => void withAd(() => claim(3))}
          theme={theme}
          disabled={busy || claiming}
        />
        <GameButton
          big
          label="Next level"
          icon="➡️"
          onPress={() => claim(1)}
          theme={theme}
          disabled={busy || claiming}
        />
      </Overlay>
    </Animated.View>
  );
}

const CONFETTI = Array.from({ length: 22 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 22;
  const distance = 90 + (i % 5) * 18;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, rotation: `${180 + (i % 3) * 180}deg` };
});

function Confetti({ active, theme }: { active: boolean; theme: Theme }) {
  const progress = useMemo(() => CONFETTI.map(() => new Animated.Value(0)), []);
  useEffect(() => {
    if (!active) {
      progress.forEach((value) => value.stopAnimation());
      return;
    }
    progress.forEach((value) => value.setValue(0));
    Animated.parallel(
      progress.map((value) =>
        Animated.timing(value, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ),
    ).start();
  }, [active, progress]);

  if (!active) return null;
  return (
    <View pointerEvents="none" style={styles.confetti}>
      {progress.map((value, i) => {
        const particle = CONFETTI[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 7,
              height: 10,
              borderRadius: 2,
              backgroundColor: theme.balls[i % theme.balls.length],
              opacity: value.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: value.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) },
                { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, particle.y] }) },
                { rotate: value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', particle.rotation] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  headerSide: { flex: 1, alignItems: 'flex-start' },
  headerRight: { alignItems: 'flex-end' },
  headerCenter: { flex: 2, alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  confetti: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', zIndex: 20 },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', zIndex: 30 },
});
