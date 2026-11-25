import AsyncStorage from '@react-native-async-storage/async-storage';

export type Progress = {
  level: number; // next level to play
  coins: number;
  themeId: string;
  ownedThemes: string[];
  levelsSinceAd: number; // for interstitial pacing
  soundOn?: boolean;
};

export const DEFAULT_PROGRESS: Progress = {
  level: 1,
  coins: 50,
  themeId: 'classic',
  ownedThemes: ['classic'],
  levelsSinceAd: 0,
  soundOn: true,
};

const KEY = 'sortly/progress/v1';

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PROGRESS, ...JSON.parse(raw) } : DEFAULT_PROGRESS;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export async function saveProgress(p: Progress): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Saving is best-effort; the game keeps working in memory.
  }
}
