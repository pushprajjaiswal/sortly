import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const ok = Platform.OS !== 'web';

export const tap = () => ok && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
export const bump = () => ok && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
export const win = () => ok && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
