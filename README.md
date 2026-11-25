# Sortly: Ball Sort Puzzle

A hybrid-casual ball sort game made with React Native + Expo (SDK 58), with AdMob monetization.

## Features
- Unlimited levels. Each level is generated from a fixed seed, so everyone gets the same puzzle, and every level is checked by a solver so it can always be finished
- Difficulty starts easy (3 colors) and goes up to 12 colors
- Undo (5 free per level, then watch an ad to get 5 more), Restart, Hint (solver-based), and +Tube (one extra empty tube per level)
- Coins: +10 per win, or 3× if the player watches a rewarded ad. Coins buy themes (Classic, Neon, Candy, Ocean)
- Progress is saved on the device with AsyncStorage
- Ads: rewarded (hints, extra tube, undo, 3× coins), interstitial (only from level 6, at most every 3 levels and every 90s), and an adaptive banner

## Run it
```bash
npm install
npm test             # checks that levels 1–200 can be solved
npm run typecheck
npx expo start --web # quickest way to try it (ads are simulated)
```
AdMob needs native code, so **Expo Go will run the game but won't show ads**. To see test ads on Android:
```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # install the APK, then:
npx expo start --dev-client
```

## Before publishing to the Play Store
1. Create an app in AdMob. Replace the test app IDs in `app.json` (plugin `androidAppId`/`iosAppId`) and the ad unit IDs in `src/ads/config.ts` with your own.
2. Change `android.package` / `ios.bundleIdentifier` in `app.json` (it is currently `com.yourname.sortly`).
3. Make your own icon and splash screen in `assets/`.
4. Add a UMP consent form for EU/UK users (see the TODO in `src/ads/ads.native.ts`) and publish a privacy policy URL.
5. Build and submit: `npx eas-cli@latest build --profile production --platform android`, then `eas submit`.
6. In the Play Console: fill in the Data safety form (the AdMob SDK collects the device ad ID) and set the content rating.

## Project layout
```
src/game/      engine.ts (rules), solver.ts (hints and solvability), levels.ts (seeded generator)
src/ads/       ads.native.ts (AdMob), ads.ts (web stub), config.ts (unit IDs and pacing), BannerSlot
src/screens/   Home, Game, Shop
src/theme/     theme palettes
```

## Ideas for next steps
- "Remove ads" in-app purchase (`expo-iap` or RevenueCat)
- Daily challenge and streaks (help D1/D7 retention), sound effects, a level-complete confetti effect
- Firebase Analytics events: level_start / level_complete / ad_reward, to track retention and ARPU
