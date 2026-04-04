# Unity Integration (iOS-first PoC)

This folder contains the Unity handoff contract for the React Native Avatar tab.

## Target
- React Native route: `avatar-lab`
- Unity bridge package: `@azesmway/react-native-unity`
- iOS framework drop path expected by plugin:
  - `unity/builds/ios/UnityFramework.framework`

## Important constraints
- iOS Simulator is **not supported** by this Unity bridge.
- Use a **physical iPhone** with an EAS Development Build (not Expo Go).

## Unity project setup
1. Open your Unity project (Unity 2023+ recommended).
2. Copy plugin unity bridge scripts from:
   - `node_modules/@azesmway/react-native-unity/unity`
   into your Unity project root.
3. Create a scene named `CharacterViewer` and set it as Scene 0 in Build Settings.
4. Add one character prefab at origin.
5. Attach `unity/starter/CharacterOrbitController.cs` to the character root.
6. Set the GameObject name to `CharacterOrbitController` (or update RN constants accordingly).

## Export iOS UnityFramework
1. Build Unity iOS project to any external folder.
2. Open generated Xcode project.
3. Build `UnityFramework.framework`.
4. Copy framework to:
   - `unity/builds/ios/UnityFramework.framework`

## RN command channel (already wired)
- GameObject: `CharacterOrbitController`
- Methods expected:
  - `ResetView()`
  - `ToggleAutoSpin(string jsonPayload)` where payload format is `{ "enabled": true|false }`

## Device run
1. `npx expo prebuild -p ios`
2. `eas build --profile development --platform ios`
3. Install on iPhone, open `Avatar` tab.
