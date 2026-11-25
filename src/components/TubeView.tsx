import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import type { HostInstance } from 'react-native';
import { Tube } from '../game/engine';
import { Theme } from '../theme/themes';

type Props = {
  tube: Tube;
  capacity: number;
  ballSize: number;
  selected: boolean;
  highlighted: boolean;
  complete: boolean;
  theme: Theme;
  shake: number;
  hiddenTopCount: number;
  landingToken: number;
  completeToken: number;
  reduceMotion: boolean;
  tubeRef: (node: HostInstance | null) => void;
  tubeIndex: number;
  onPress: (index: number) => void;
};

const SPARKLES = Array.from({ length: 8 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 8;
  return { x: Math.cos(angle) * 34, y: Math.sin(angle) * 38 };
});

function TubeView({
  tube,
  capacity,
  ballSize,
  selected,
  highlighted,
  complete,
  theme,
  shake,
  hiddenTopCount,
  landingToken,
  completeToken,
  reduceMotion,
  tubeRef,
  tubeIndex,
  onPress,
}: Props) {
  const [lift] = useState(() => new Animated.Value(0));
  const [shakeX] = useState(() => new Animated.Value(0));
  const [landingScale] = useState(() => new Animated.Value(1));
  const [completeScale] = useState(() => new Animated.Value(1));
  const [glow] = useState(() => new Animated.Value(0));
  const [hintPulse] = useState(() => new Animated.Value(0));
  const [sparkleProgress] = useState(() => SPARKLES.map(() => new Animated.Value(0)));
  const previousLanding = useRef(landingToken);
  const previousComplete = useRef(completeToken);

  useEffect(() => {
    if (reduceMotion) {
      Animated.timing(lift, {
        toValue: selected ? 1 : 0,
        duration: 100,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
      return;
    }
    Animated.spring(lift, {
      toValue: selected ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
      speed: 30,
      bounciness: 8,
    }).start();
  }, [reduceMotion, selected, lift]);

  useEffect(() => {
    if (!shake) return;
    Animated.sequence(
      [6, -6, 4, -4, 0].map((v) =>
        Animated.timing(shakeX, { toValue: v, duration: 40, useNativeDriver: Platform.OS !== 'web' }),
      ),
    ).start();
  }, [shake, shakeX]);

  useEffect(() => {
    if (landingToken === previousLanding.current) return;
    previousLanding.current = landingToken;
    landingScale.setValue(0.9);
    Animated.sequence([
      Animated.timing(landingScale, { toValue: 1.07, duration: 80, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(landingScale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 35, bounciness: 7 }),
    ]).start();
  }, [landingToken, landingScale]);

  useEffect(() => {
    if (completeToken === previousComplete.current) return;
    previousComplete.current = completeToken;
    glow.setValue(1);
    Animated.sequence([
      Animated.timing(completeScale, { toValue: 1.08, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(completeScale, { toValue: 1, duration: 140, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    Animated.timing(glow, { toValue: 0, duration: 500, useNativeDriver: Platform.OS !== 'web' }).start();
    sparkleProgress.forEach((value) => value.setValue(0));
    Animated.stagger(
      20,
      sparkleProgress.map((value) =>
        Animated.timing(value, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
      ),
    ).start();
  }, [completeToken, completeScale, glow, sparkleProgress]);

  useEffect(() => {
    if (!highlighted || reduceMotion) {
      hintPulse.stopAnimation();
      hintPulse.setValue(0);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(hintPulse, { toValue: 1, duration: 550, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(hintPulse, { toValue: 0, duration: 550, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [highlighted, hintPulse, reduceMotion]);

  const gap = Math.round(ballSize * 0.08);
  const width = ballSize + gap * 2 + 4;
  const height = capacity * (ballSize + gap) + gap + ballSize * 0.6;
  const visibleTube = tube.slice(0, Math.max(0, tube.length - hiddenTopCount));
  const topIndex = visibleTube.length - 1;
  const hintOpacity = hintPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <Pressable
      ref={tubeRef}
      onPress={() => onPress(tubeIndex)}
      hitSlop={{ top: ballSize * 1.2, bottom: 10, left: 7, right: 7 }}
      accessibilityRole="button"
      accessibilityLabel={`Tube with ${tube.length} balls`}
    >
      <Animated.View
        style={[
          styles.tube,
          {
            width,
            height,
            paddingBottom: gap,
            borderColor: complete ? theme.accent : highlighted ? theme.accent : theme.tubeBorder,
            backgroundColor: theme.tube,
            borderBottomLeftRadius: width / 2,
            borderBottomRightRadius: width / 2,
            borderWidth: highlighted ? 3 : 2,
          },
          { transform: [{ translateX: shakeX }, { scale: completeScale }] },
        ]}
      >
        {visibleTube.map((color, i) => {
          const isTop = i === topIndex;
          const translateY = isTop ? lift.interpolate({ inputRange: [0, 1], outputRange: [0, -ballSize * 1.1] }) : 0;
          const scale = isTop
            ? Animated.multiply(
                lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                landingScale,
              )
            : 1;
          return (
            <Animated.View
              key={i}
              style={{
                width: ballSize,
                height: ballSize,
                borderRadius: ballSize / 2,
                marginTop: gap,
                backgroundColor: theme.balls[color % theme.balls.length],
                transform: [{ translateY }, { scale }],
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: ballSize * 0.14,
                  left: ballSize * 0.2,
                  width: ballSize * 0.28,
                  height: ballSize * 0.2,
                  borderRadius: ballSize,
                  backgroundColor: 'rgba(255,255,255,0.45)',
                }}
              />
            </Animated.View>
          );
        })}
        {highlighted ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.hintRing,
              {
                borderColor: theme.accent,
                borderBottomLeftRadius: width / 2,
                borderBottomRightRadius: width / 2,
                opacity: hintOpacity,
              },
            ]}
          />
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.glow, { borderColor: theme.accent, opacity: glow }]} />
        {sparkleProgress.map((progress, i) => {
          const point = SPARKLES[i];
          return (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[
                styles.sparkle,
                {
                  left: width / 2 - 3,
                  top: height * 0.25,
                  backgroundColor: theme.accent,
                  opacity: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                  transform: [
                    { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, point.x] }) },
                    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, point.y] }) },
                    { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.2, 1, 0.3] }) },
                  ],
                },
              ]}
            />
          );
        })}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tube: {
    flexDirection: 'column-reverse',
    alignItems: 'center',
    borderTopWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  hintRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderWidth: 3,
    borderTopWidth: 0,
  },
  glow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderWidth: 3,
    borderRadius: 16,
  },
  sparkle: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
});

export default memo(TubeView);
