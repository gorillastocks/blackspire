# Shipping Blackspire to the App Store (Mac steps)

The repo already has everything that doesn't need a Mac:

- Capacitor 8 (`@capacitor/core`, `@capacitor/ios`, `@capacitor/preferences`).
- `capacitor.config.json`: app id **com.gorillastocks.blackspire**, name **Blackspire**, `webDir: dist`.
- The generated Xcode project in `ios/`.
- An app-local iCloud plugin: `ios/App/App/ICloudKVPlugin.swift` and `MainViewController.swift`, already added to the Xcode project and storyboard.

The game is bundled inside the app (`dist/` → `ios/App/App/public`), so it makes **no network requests** and plays fully offline.

## 0. One-time Mac setup
1. Install the **latest Xcode** from the Mac App Store. Open it once and accept the license. Install the iOS platform when asked.
2. Install Node.js 22 LTS or newer (https://nodejs.org or `brew install node`).
3. Install CocoaPods: `brew install cocoapods` (or `sudo gem install cocoapods`).
4. Join the **Apple Developer Program** ($99/yr) with your Apple Account. Then in Xcode → Settings → Accounts, add that Apple Account.

## 1. Build the web game and sync it into iOS
```bash
git clone https://github.com/gorillastocks/grokwizard.git && cd grokwizard
npm ci
npm run build          # → dist/
npx cap sync ios       # copies dist into the app + runs pod install
npx cap open ios       # opens ios/App/App.xcworkspace in Xcode
```
Repeat `npm run build && npx cap sync ios` after every game change.

## 2. Configure the target in Xcode
Select the **App** project, then the **App** target.

1. **General**
   - Display Name: `Blackspire`.
   - Bundle Identifier: `com.gorillastocks.blackspire`.
   - Version: `1.0.0`. Build: `1` (increase the build number on every upload).
   - Minimum Deployments: iOS 14.0 (already set).
   - Supported Destinations: iPhone and iPad.
   - Under *Deployment Info*, tick all four orientations for iPad and Portrait plus both Landscapes for iPhone. The layout is tested at 393×852, 852×393, 1024×1366 and 1366×1024.
2. **Signing & Capabilities**
   - Tick *Automatically manage signing* and pick your **Team**.
   - Click **+ Capability → iCloud**, then tick **Key-value storage**. You don't need CloudKit or Documents. This lets saves sync between the player's devices. Without it, the game still saves locally (UserDefaults via @capacitor/preferences, plus WebView storage).
   - (Optional) **+ Capability → Background Modes** is NOT needed. Music pauses when the app is backgrounded.
3. **App icon**: in `App/Assets.xcassets/AppIcon`, replace the placeholder with a **1024×1024 PNG with no transparency**. Xcode generates every other size.
4. **Splash** (optional): replace the images in `Assets.xcassets/Splash.imageset`.
5. `Info.plist` already has `ITSAppUsesNonExemptEncryption = NO`, so you won't be asked about export compliance on each upload.

## 3. Test on a device
1. Plug in an iPhone or iPad, or pick a Simulator, and press **▶ Run**. On the device, enable Settings → Privacy & Security → Developer Mode the first time.
2. Check these things:
   - The title screen appears in airplane mode.
   - Music starts after the first tap. iOS needs a tap before audio can play; the game unlocks audio on that first touch.
   - Save, force-quit, then relaunch: **Continue** works.
   - With iCloud KV enabled and two devices signed in to the same Apple Account, a save made on one device appears on the other after relaunch. The newest copy wins.
   - Press-and-hold on a party card shows the info popup.

## 4. Create the App Store Connect record
1. Go to https://appstoreconnect.apple.com → **Apps → + → New App**.
   - Platform iOS, name **Blackspire**, primary language English.
   - Bundle ID `com.gorillastocks.blackspire` (register it first at developer.apple.com → Identifiers if it isn't listed; Xcode's automatic signing usually creates it).
   - SKU `blackspire-001`.
2. Fill in **App Information**:
   - Category: Games → Role Playing (secondary: Adventure).
   - Content rights: you use third-party content. SRD 5.1 is CC-BY-4.0 and the Quaternius models are CC0; see ATTRIBUTION.md.
3. **Age Rating** questionnaire: *Infrequent/Mild Cartoon or Fantasy Violence*. Answer None for everything else. This usually comes out at 9+.
4. **App Privacy**: *Data Not Collected*. The game has no analytics, accounts or network calls. iCloud KV sync is Apple-managed and is not collection by you.
5. **Privacy Policy URL**: required. A simple page stating "Blackspire collects no data; saves stay on your device/iCloud" is enough, e.g. a GitHub Pages file.
6. **Pricing and Availability**: choose free or paid, and pick countries.
7. **Screenshots** (required sizes):
   - iPhone 6.9" at 1320×2868 or 6.5" at 1284×2778.
   - iPad 13" at 2064×2752 or 2048×2732.
   - Take them in the Simulator (iPhone 16 Pro Max, iPad Pro 13") with ⌘S.
8. Write the description, keywords and support URL (the GitHub repo is fine).

## 5. Archive and upload
1. In Xcode, set the run destination to **Any iOS Device (arm64)**.
2. Choose **Product → Archive**. The Organizer opens when it finishes.
3. Click **Distribute App → App Store Connect → Upload**. Keep the defaults (automatic signing, upload symbols).
4. Wait 5–30 minutes for processing. You'll get an email, and the build appears under **TestFlight**.
5. (Recommended) Add yourself as an internal TestFlight tester and play a few minutes on a real device.

## 6. Submit for review
1. Open the app → the version (1.0) → **Build → +**, and pick the uploaded build.
2. In **App Review Information**, add contact details. Note: "Offline single-player game. No login required."
3. Click **Add for Review → Submit**. Review typically takes 24–48 h.
4. If it's rejected, read the message in the Resolution Center, fix it, bump the **Build** number, re-archive and re-submit.

## Updating later
```bash
git pull && npm ci && npm run build && npx cap sync ios
```
In Xcode, bump the Build (and Version for a feature release), then Archive → Upload → submit the new version.

## How saves work (for reference)
`src/storage.js` handles saves:
- **Web**: localStorage.
- **iOS**: localStorage plus a mirror in `@capacitor/preferences` (UserDefaults, which survives WebView storage purges) plus iCloud KV through the `ICloudKV` plugin. On launch the newest copy by timestamp is restored.
- **Every write**: the save is validated, then written to `.tmp`, the previous good copy is kept as `.bak`, the main copy is written, and `.tmp` is removed.
- **Reads**: fall back main → `.bak` → `.tmp`, so a corrupt or interrupted save is recovered automatically.
- **Backups**: players can also export and import a save as a `.json` file or a `GW1:` code from ☰ Menu → Export / Import.
- **iCloud KV limits**: 1 MB per key and 1 MB total per app. A save is far smaller, but if the limit is ever hit, the plugin refuses that write and the local copies are unaffected.
