import { memo, useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Tube } from '../game/engine';
import { Theme } from '../theme/themes';

type Props = {
  tube: Tube;
  capacity: number;
  ballSize: number;
  selected: boolean;
  highlighted: boolean; // hint target/source
  complete: boolean;
  theme: Theme;
  shake: number; // increment to trigger a shake
  onPress: () => void;
};

function TubeView({ tube, capacity, ballSize, selected, highlighted, complete, theme, shake, onPress }: Props) {
  const [lift] = useState(() => new Animated.Value(0));
  const [shakeX] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(lift, { toValue: selected ? 1 : 0, useNativeDriver: Platform.OS !== 'web', speed: 30, bounciness: 8 }).start();
  }, [selected, lift]);

  useEffect(() => {
    if (!shake) return;
    Animated.sequence(
      [6, -6, 4, -4, 0].map((v) => Animated.timing(shakeX, { toValue: v, duration: 40, useNativeDriver: Platform.OS !== 'web' })),
    ).start();
  }, [shake, shakeX]);

  const gap = Math.round(ballSize * 0.08);
  const width = ballSize + gap * 2 + 4;
  const height = capacity * (ballSize + gap) + gap + ballSize * 0.6;
  const topIndex = tube.length - 1;

  return (
    <Pressable
      onPress={onPress}
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
          { transform: [{ translateX: shakeX }] },
        ]}
      >
        {tube.map((color, i) => {
          const isTop = i === topIndex;
          const translateY = isTop ? lift.interpolate({ inputRange: [0, 1], outputRange: [0, -ballSize * 1.1] }) : 0;
          return (
            <Animated.View
              key={i}
              style={{
                width: ballSize,
                height: ballSize,
                borderRadius: ballSize / 2,
                marginTop: gap,
                backgroundColor: theme.balls[color % theme.balls.length],
                transform: [{ translateY }],
              }}
            >
              {/* glossy highlight */}
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
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tube: {
    flexDirection: 'column-reverse', // first ball sits at the bottom
    alignItems: 'center',
    borderTopWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
});

export default memo(TubeView);
