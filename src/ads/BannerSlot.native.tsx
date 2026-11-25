import { View } from 'react-native';
import { adsAvailable, unitId } from './ads.native';

/** Adaptive banner pinned under the board. Renders nothing in Expo Go. */
export default function BannerSlot() {
  if (!adsAvailable) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { BannerAd, BannerAdSize } = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');
  const id = unitId('banner');
  if (!id) return null;
  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd unitId={id} size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER} />
    </View>
  );
}
