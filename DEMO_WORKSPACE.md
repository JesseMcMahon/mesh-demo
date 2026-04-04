# Mesh Demo Workspace

This repository is isolated for investor-demo work only.

## Branching strategy
- Use `demo/*` branches only.
- Keep production app development in `/Users/jessemcmahon/Desktop/Mesh-2.0/mesh-client`.

## App separation checklist (one-time)
1. Apple Developer: create App ID for `com.hfs.huddle.demo`.
2. App Store Connect: create new app listing named `Mesh Demo` with bundle ID `com.hfs.huddle.demo`.
3. EAS credentials: run `eas credentials -p ios` in this repo and attach/sign for the new bundle ID.

## Build and submit (from this repo only)
```bash
cd /Users/jessemcmahon/Desktop/Mesh-Demo
npm run build:ios:demo
npm run submit:ios:demo
```

## Runtime mode
- `EXPO_PUBLIC_APP_MODE=investor_demo`
- Launches directly to `/(investor-demo)/home`
- Auth/API/socket/push/deep-link invite flows are bypassed in demo mode.
