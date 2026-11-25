import { createAudioPlayer, preload, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

export type SoundName = 'pick' | 'drop' | 'invalid' | 'complete' | 'win' | 'coins' | 'tap';

const soundNames: SoundName[] = ['pick', 'drop', 'invalid', 'complete', 'win', 'coins', 'tap'];
const sources: Record<SoundName, number> = {
  pick: require('../../assets/sounds/pick.wav'),
  drop: require('../../assets/sounds/drop.wav'),
  invalid: require('../../assets/sounds/invalid.wav'),
  complete: require('../../assets/sounds/complete.wav'),
  win: require('../../assets/sounds/win.wav'),
  coins: require('../../assets/sounds/coins.wav'),
  tap: require('../../assets/sounds/tap.wav'),
};
const players: Partial<Record<SoundName, AudioPlayer>> = {};

let soundEnabled = true;
let initialization: Promise<void> | null = null;

export function initializeSfx(enabled: boolean): Promise<void> {
  soundEnabled = enabled;
  if (!initialization) {
    initialization = (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
      } catch {
        // Audio effects remain optional if the platform cannot configure an audio session.
      }

      await Promise.all(
        soundNames.map(async (name) => {
          try {
            await preload(sources[name]);
          } catch {
            // Preloading is best-effort on platforms that do not support it.
          }
        }),
      );
      for (const name of soundNames) {
        try {
          players[name] = createAudioPlayer(sources[name]);
          players[name]!.volume = 0.7;
        } catch {
          // A failed player should not prevent the rest of the game from loading.
        }
      }
    })();
  }
  return initialization;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (!enabled) {
    for (const player of Object.values(players)) {
      try {
        player?.pause();
      } catch {
        // Pausing effects is best-effort.
      }
    }
  }
}

export function play(name: SoundName): void {
  if (!soundEnabled) return;
  const player = players[name];
  if (!player) return;
  try {
    if (player.playing || player.currentTime > 0) {
      void Promise.resolve(player.seekTo(0)).then(() => {
        if (soundEnabled) player.play();
      }).catch(() => {});
    } else {
      player.play();
    }
  } catch {
    // Audio failures must never interrupt gameplay.
  }
}
