# Smart Farming — Farmer App (React Native, no Expo)

Consumes the v1 API (see `../docs/plans/API-CONTRACT.md`). The JavaScript app + tests are complete; **native `android/` and `ios/` projects are not included in this scaffold** and must be generated on a machine with the RN toolchain.

## Test (works anywhere with Node)

```bash
npm install --legacy-peer-deps
npm test        # Jest + @testing-library/react-native
```

## Run on a device / emulator (your machine)

The native projects aren't committed. Generate them once, then copy `android/` and `ios/` here:

```bash
# in a temp folder
npx @react-native-community/cli init SmartFarming --version 0.76.5
# copy the generated android/ and ios/ into this farmer-app/ folder
```

Then:

```bash
npm install --legacy-peer-deps
cd ios && pod install && cd ..        # iOS only (macOS)
# Firebase: add android/app/google-services.json and ios/GoogleService-Info.plist for FCM
npm run android   # or: npm run ios
```

- **API base URL:** `src/config.js` — Android emulator reaches the host backend at `http://10.0.2.2:4000/api`; set `API_URL` for real builds (the production Render URL).
- **Auth:** phone + password (no OTP). After register → "Waiting for approval" until an admin approves in the web admin, then login works.
- Native modules used: `react-native-keychain`, `react-native-image-picker`, `@react-native-firebase/messaging`, `react-native-view-shot`, `react-native-share`, `react-native-svg` — these need the native projects + linking (autolinked) to run on-device; they are mocked in tests.
