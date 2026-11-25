// Real AdMob integration (Android/iOS development or production builds).
// In Expo Go the native module is missing, so everything falls back to "no ad" safely.
import { Platform } from 'react-native';
import { PROD_AD_UNITS, TEST_DEVICE_IDS } from './config';

type Lib = typeof import('react-native-google-mobile-ads');
let lib: Lib | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  lib = require('react-native-google-mobile-ads');
} catch {
  lib = null;
}

export const adsAvailable = lib !== null;

let lastAdAt = 0;
const warnedPlaceholderUnits = new Set<string>();
export const secondsSinceLastAd = () => (lastAdAt ? (Date.now() - lastAdAt) / 1000 : Infinity);

export function unitId(kind: 'banner' | 'interstitial' | 'rewarded'): string {
  if (!lib) return '';
  if (__DEV__) {
    const t = lib.TestIds;
    return kind === 'banner' ? t.ADAPTIVE_BANNER : kind === 'interstitial' ? t.INTERSTITIAL : t.REWARDED;
  }
  const ids = Platform.OS === 'ios' ? PROD_AD_UNITS.ios : PROD_AD_UNITS.android;
  const id = ids[kind];
  if (id.includes('XXXX')) {
    const key = `${Platform.OS}:${kind}`;
    if (!warnedPlaceholderUnits.has(key)) {
      console.warn(`AdMob ${Platform.OS} ${kind} unit ID is still a placeholder; skipping ad request.`);
      warnedPlaceholderUnits.add(key);
    }
    return '';
  }
  return id;
}

// Minimal shape shared by rewarded and interstitial ads, for listening to close/error/reward.
type Fullscreen = {
  addAdEventListener: (type: never, listener: (...args: never[]) => void) => () => void;
};
let rewarded: import('react-native-google-mobile-ads').RewardedAd | null = null;
let interstitial: import('react-native-google-mobile-ads').InterstitialAd | null = null;

function preloadRewarded() {
  if (!lib) return;
  const id = unitId('rewarded');
  if (!id) return;
  rewarded?.destroy();
  rewarded = lib.RewardedAd.createForAdRequest(id);
  rewarded.load();
}

function preloadInterstitial() {
  if (!lib) return;
  const id = unitId('interstitial');
  if (!id) return;
  interstitial?.destroy();
  interstitial = lib.InterstitialAd.createForAdRequest(id);
  interstitial.load();
}

export async function initAds(): Promise<void> {
  if (!lib) return;
  try {
    // TODO before launch in EU/UK: gather UMP consent with lib.AdsConsent before initialize().
    const ads = lib.default();
    await ads.setRequestConfiguration({ testDeviceIdentifiers: TEST_DEVICE_IDS });
    await ads.initialize();
    preloadRewarded();
    preloadInterstitial();
  } catch (e) {
    console.warn('Ad init failed', e);
  }
}

function waitForClose(ad: Fullscreen, onEarn?: () => void): Promise<void> {
  return new Promise((resolve) => {
    const subs: (() => void)[] = [];
    const done = () => {
      subs.forEach((u) => u());
      resolve();
    };
    const listen = ad.addAdEventListener as (type: string, l: () => void) => () => void;
    subs.push(listen.call(ad, lib!.AdEventType.CLOSED, done));
    subs.push(listen.call(ad, lib!.AdEventType.ERROR, done));
    if (onEarn) subs.push(listen.call(ad, lib!.RewardedAdEventType.EARNED_REWARD, onEarn));
  });
}

/** Shows a rewarded ad. Resolves true only if the user watched it to the end. */
export async function showRewarded(): Promise<boolean> {
  if (!lib || !rewarded || !rewarded.loaded) {
    preloadRewarded();
    return false;
  }
  const ad = rewarded;
  let earned = false;
  const closed = waitForClose(ad, () => (earned = true));
  try {
    await ad.show();
    await closed;
  } catch {
    // not loaded / show failed
  }
  lastAdAt = Date.now();
  preloadRewarded();
  return earned;
}

export async function showInterstitial(): Promise<boolean> {
  if (!lib || !interstitial || !interstitial.loaded) {
    preloadInterstitial();
    return false;
  }
  const ad = interstitial;
  const closed = waitForClose(ad);
  try {
    await ad.show();
    await closed;
  } catch {
    return false;
  } finally {
    lastAdAt = Date.now();
    preloadInterstitial();
  }
  return true;
}
