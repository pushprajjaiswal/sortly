import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme } from '../theme/themes';
import GameButton from '../components/GameButton';
import { formatCoins } from '../utils/formatCoins';

const LOGO = [0, 1, 2, 3, 4, 5];

export default function HomeScreen({ theme, level, coins, onPlay, onShop }: { theme: Theme; level: number; coins: number; onPlay: () => void; onShop: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.coins, { backgroundColor: theme.surface }]}>
        <Text selectable={false} numberOfLines={1} style={{ color: theme.accent, fontWeight: '800', fontSize: 16 }}>
          🪙 {formatCoins(coins)}
        </Text>
      </View>

      <View style={styles.center}>
        <View style={styles.logoBalls}>
          {LOGO.map((c) => (
            <View key={c} style={[styles.ball, { backgroundColor: theme.balls[c] }]} />
          ))}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Sortly</Text>
        <Text style={[styles.tag, { color: theme.subtext }]}>Sort the balls. Relax your mind.</Text>
      </View>

      <View style={styles.actions}>
        <GameButton big variant="primary" icon="▶️" label={`Play · Level ${level}`} onPress={onPlay} theme={theme} />
        <GameButton big icon="🎨" label="Themes" onPress={onShop} theme={theme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  coins: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoBalls: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  ball: { width: 34, height: 34, borderRadius: 17 },
  title: { fontSize: 56, fontWeight: '900', letterSpacing: 1 },
  tag: { fontSize: 16, marginTop: 6 },
  actions: { gap: 14, alignSelf: 'center', width: '100%', maxWidth: 360 },
});
