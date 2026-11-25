// Fallback ad service used on web (and as the TypeScript type source).
// The real implementation is ads.native.ts, which Metro picks on Android/iOS.

let lastAdAt = 0;

export const adsAvailable = false;

export async function initAds(): Promise<void> {}

/** Simulates a rewarded ad so the reward flow can be tested in a browser. */
export async function showRewarded(): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 600));
  lastAdAt = Date.now();
  return true;
}

export async function showInterstitial(): Promise<boolean> {
  lastAdAt = Date.now();
  return false;
}

export const secondsSinceLastAd = () => (lastAdAt ? (Date.now() - lastAdAt) / 1000 : Infinity);
