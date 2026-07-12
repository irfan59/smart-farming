# Smart Farming — Farmer App (React Native, no Expo)

Consumes the v1 API (see `../docs/plans/API-CONTRACT.md`). Complete JS app + tests, **plus native `android/` and `ios/` projects** (generated from React Native 0.76.5 — app name `SmartFarming`, package `com.smartfarming`).

## Test (no device needed)

```bash
npm install --legacy-peer-deps
npm test        # Jest + @testing-library/react-native
```

## Run on Android

**Prerequisites:** Android Studio + SDK (API 35) and an emulator (AVD) or a USB device with debugging enabled. Android Studio's embedded JDK 17 is used for Gradle, so a separate JDK install isn't required when building from the IDE.

1. Install JS deps (autolinks the native modules):
   ```bash
   npm install --legacy-peer-deps
   ```
2. Start the backend (repo root) so the app has an API:  `npm run dev:local`  (serves `:4000`)
3. Start Metro (keep it running):  `npm start`
4. Launch the app — either:
   - **Android Studio:** open the `android/` folder, let Gradle sync, pick a device, press **Run ▶**, or
   - **CLI:**  `npm run android`

The emulator reaches the backend at `http://10.0.2.2:4000/api` (already the default in `src/config.js`). For a **physical phone**, set your PC's LAN IP there instead (e.g. `http://192.168.1.20:4000/api`) and allow Node through the firewall.

## Run on iOS (macOS only)

```bash
npm install --legacy-peer-deps
cd ios && pod install && cd ..
npm run ios
```

## Firebase / push notifications (optional)

FCM registration in `src/screens/NotificationsScreen.jsx` is wrapped in try/catch, so **the app builds and runs without any Firebase setup** — push just no-ops. To enable it: create a Firebase project, add `android/app/google-services.json` (+ the Google-Services Gradle plugin) and `ios/GoogleService-Info.plist`.

## Login flow

Phone + password (no OTP). Register in-app → **"Waiting for approval"** → approve the farmer in the web admin → log in.
