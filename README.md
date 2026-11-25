# Ball Sort: Tube Master

A hybrid-casual ball sort game made with React Native + Expo (SDK 58), with AdMob monetization.

## App identity
- Display name: Ball Sort: Tube Master
- Android package: `com.binarybeast.ballsort`
- iOS bundle identifier: `com.binarybeast.ballsort`
- EAS slug: `sortly` (keep this unchanged because it is linked to the EAS project)

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
npm test             # checks game rules, level solvability and palette contrast
npm run typecheck
npx expo start --web # quickest way to try it (ads are simulated)
```
AdMob needs native code, so **Expo Go will run the game but won't show ads**. To see test ads on Android:
```bash
npx eas-cli@latest login
npx eas-cli@latest build --profile development --platform android   # install the APK, then:
npx expo start --dev-client
```

## AdMob configuration
- Android app ID: `ca-app-pub-3264759639979045~7856980612`
- Android banner unit: `ca-app-pub-3264759639979045/5861372666`
- Android interstitial unit: `ca-app-pub-3264759639979045/7282265543`
- Android rewarded unit: `ca-app-pub-3264759639979045/2959877154`
- Development builds use Google's `TestIds`; `TEST_DEVICE_IDS` can enable test ads on a physical device in a release build.
- To get a device's hashed test ID, inspect the Google Mobile Ads SDK message in `adb logcat`, then add the ID to `TEST_DEVICE_IDS` in `src/ads/config.ts`.
- Placeholder production unit IDs are skipped with a warning instead of being requested.

> TODO before an iOS release: replace Google's sample `iosAppId` in `app.json` and the placeholder iOS ad unit IDs in `src/ads/config.ts` with the production IDs.

The app also needs a UMP consent form for EU/UK users before launch (see the TODO in `src/ads/ads.native.ts`) and a published privacy policy URL.

## Release checklist
1. `npx eas-cli@latest build --profile production --platform android`
2. Upload the .aab to Play Console → Internal testing
3. Add your phone's hashed ID to `TEST_DEVICE_IDS`, and never tap your own live ads
4. app-ads.txt on the developer website (TODO)
5. Closed test with 12+ testers for 14 days, then Apply for production

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
