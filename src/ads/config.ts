// In development (__DEV__) Google's test ads are always used, so you can't get banned for
// clicking your own ads while testing.
export const PROD_AD_UNITS = {
  android: {
    banner: 'ca-app-pub-3264759639979045/5861372666',
    interstitial: 'ca-app-pub-3264759639979045/7282265543',
    rewarded: 'ca-app-pub-3264759639979045/2959877154',
  },
  ios: {
    banner: 'ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB',
    interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII',
    rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR',
  },
};

// Get the hashed device ID from the Google Mobile Ads SDK message in `adb logcat`.
export const TEST_DEVICE_IDS: string[] = [];

/** Interstitial pacing: never in the first levels, then at most every N levels and T seconds. */
export const INTERSTITIAL_FIRST_LEVEL = 6;
export const INTERSTITIAL_EVERY_N_LEVELS = 3;
export const INTERSTITIAL_MIN_SECONDS = 90;

export function shouldShowInterstitial(
  levelJustWon: number,
  levelsSinceAd: number,
  secondsSinceLastAd: number,
): boolean {
  return (
    levelJustWon >= INTERSTITIAL_FIRST_LEVEL &&
    levelsSinceAd >= INTERSTITIAL_EVERY_N_LEVELS &&
    secondsSinceLastAd >= INTERSTITIAL_MIN_SECONDS
  );
}
