import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEMES, Theme } from '../theme/themes';
import GameButton from '../components/GameButton';
import { formatCoins } from '../utils/formatCoins';

type Props = {
  theme: Theme;
  coins: number;
  owned: string[];
  onSelect: (id: string) => void;
  onBuy: (id: string) => void;
  onBack: () => void;
};

export default function ShopScreen({ theme, coins, owned, onSelect, onBuy, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [pendingThemeId, setPendingThemeId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingThemeId) return;
    const timeout = setTimeout(() => setPendingThemeId(null), 3000);
    return () => clearTimeout(timeout);
  }, [pendingThemeId]);

  const pressTheme = (id: string, price: number, isOwned: boolean) => {
    if (isOwned) {
      setPendingThemeId(null);
      onSelect(id);
    } else if (coins < price) {
      setPendingThemeId(null);
    } else if (pendingThemeId === id) {
      setPendingThemeId(null);
      onBuy(id);
    } else {
      setPendingThemeId(id);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <GameButton label="Back" icon="⬅️" onPress={onBack} theme={theme} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: theme.text }]}>Themes</Text>
        </View>
        <View style={[styles.headerSide, styles.headerRight]}>
          <Text
            selectable={false}
            numberOfLines={1}
            style={{ color: theme.accent, fontWeight: '800', fontSize: width < 300 ? 12 : 16 }}
          >
            🪙 {formatCoins(coins)}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
        {THEMES.map((t) => {
          const isOwned = owned.includes(t.id);
          const active = t.id === theme.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => pressTheme(t.id, t.price, isOwned)}
              style={[styles.card, { backgroundColor: t.background, borderColor: active ? theme.accent : 'transparent' }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: t.text }]}>{t.name}</Text>
                <View style={styles.swatches}>
                  {t.balls.slice(0, 8).map((c, i) => (
                    <View key={i} style={[styles.swatch, { backgroundColor: c }]} />
                  ))}
                </View>
              </View>
              <Text style={[styles.status, { color: t.text }]}>
                {active
                  ? '✓ In use'
                  : isOwned
                    ? 'Use'
                    : coins < t.price
                      ? `Need ${t.price - coins} more 🪙`
                      : pendingThemeId === t.id
                        ? `Tap again to buy for 🪙${t.price}`
                        : `Buy 🪙${t.price}`}
              </Text>
            </Pressable>
          );
        })}
        <Text style={{ color: theme.subtext, textAlign: 'center', marginTop: 8 }}>
          Earn coins by finishing levels. Watch an ad after a win for 3× coins.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  headerSide: { flex: 1, alignItems: 'flex-start' },
  headerRight: { alignItems: 'flex-end' },
  headerCenter: { flex: 2, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '900' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 3 },
  name: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  swatches: { flexDirection: 'row', gap: 6 },
  swatch: { width: 18, height: 18, borderRadius: 9 },
  status: { fontWeight: '800', fontSize: 15 },
});
