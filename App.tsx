import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DEFAULT_PROGRESS, Progress, loadProgress, saveProgress } from './src/storage/progress';
import { THEMES, themeById } from './src/theme/themes';
import { initAds, secondsSinceLastAd, showInterstitial } from './src/ads/ads';
import { shouldShowInterstitial } from './src/ads/config';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen, { WIN_COINS } from './src/screens/GameScreen';
import ShopScreen from './src/screens/ShopScreen';

type Screen = 'home' | 'game' | 'shop';

export default function App() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const progressRef = useRef<Progress>(DEFAULT_PROGRESS);

  useEffect(() => {
    loadProgress().then((p) => {
      progressRef.current = p;
      setProgress(p);
    });
    initAds();
  }, []);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    const next = fn(progressRef.current);
    progressRef.current = next;
    setProgress(next);
    saveProgress(next);
  }, []);

  const spendCoins = useCallback(
    (n: number) => {
      if (progressRef.current.coins < n) return false;
      update((p) => ({ ...p, coins: p.coins - n }));
      return true;
    },
    [update],
  );

  const onWin = useCallback(
    async (earned: number) => {
      const won = progressRef.current.level;
      const since = progressRef.current.levelsSinceAd + 1;
      const watchedRewarded = earned > WIN_COINS; // don't stack an interstitial right after a rewarded ad
      const showAd = !watchedRewarded && shouldShowInterstitial(won, since, secondsSinceLastAd());
      update((p) => ({
        ...p,
        level: p.level + 1,
        coins: p.coins + earned,
        levelsSinceAd: showAd || watchedRewarded ? 0 : since,
      }));
      if (showAd) await showInterstitial();
    },
    [update],
  );

  if (!progress) {
    return (
      <View style={{ flex: 1, backgroundColor: THEMES[0].background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={THEMES[0].accent} size="large" />
      </View>
    );
  }

  const theme = themeById(progress.themeId);

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.id === 'candy' ? 'dark' : 'light'} />
      {screen === 'home' && (
        <HomeScreen theme={theme} level={progress.level} coins={progress.coins} onPlay={() => setScreen('game')} onShop={() => setScreen('shop')} />
      )}
      {screen === 'game' && (
        <GameScreen
          key={progress.level} // fresh state for every level
          level={progress.level}
          theme={theme}
          coins={progress.coins}
          spendCoins={spendCoins}
          onWin={onWin}
          onHome={() => setScreen('home')}
        />
      )}
      {screen === 'shop' && (
        <ShopScreen
          theme={theme}
          coins={progress.coins}
          owned={progress.ownedThemes}
          onBack={() => setScreen('home')}
          onSelect={(id) => update((p) => ({ ...p, themeId: id }))}
          onBuy={(id) => {
            const t = themeById(id);
            if (progressRef.current.coins < t.price) return;
            update((p) => ({ ...p, coins: p.coins - t.price, ownedThemes: [...p.ownedThemes, id], themeId: id }));
          }}
        />
      )}
    </SafeAreaProvider>
  );
}
