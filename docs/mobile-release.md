# ChessAlive Mobile Release

ChessAlive uses Expo so the same React Native codebase ships to web, Android, and iPhone.

## App Identity

- iOS bundle id: `com.chessalive.app`
- Android package: `com.chessalive.app`
- Deep link scheme: `chessalive://`
- Current launch version: `0.1.0`

## Build Commands

```bash
npm run mobile
npm run mobile:android:preview
npm run mobile:android
npm run mobile:ios
```

The production Android build produces an `.aab` for Play Store. The iOS production build produces a signed App Store build after Apple credentials are connected in EAS.

## Store Submission Commands

```bash
npm run mobile:submit:android
npm run mobile:submit:ios
```

## Required Before Public Store Submission

- Connect an Expo account with access to the ChessAlive project.
- Add Google Play Console service account credentials for Android submission.
- Add Apple Developer Program credentials for iOS signing and App Store Connect upload.
- Replace local test auth IDs with production Google, Apple, and Facebook OAuth app IDs.
- Add final privacy policy, support URL, screenshots, age rating, and data safety answers in both stores.

## Release Decision

The first mobile release is configured as a managed Expo app. That keeps the web and mobile product in one codebase while still allowing native builds, deep links, push notifications, AdMob, and store publishing as the product grows.
