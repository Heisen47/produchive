# Publishing Produchive to the Microsoft Store

The code is ready for an MSIX build. Registering, testing on Windows and submitting are manual.

## 1. Register and reserve the name

1. Create a free individual developer account at <https://storedeveloper.microsoft.com>.
2. In Partner Center, go to **Apps and games > New product > MSIX or PWA app** and reserve **Produchive**.
3. Open **Product identity** and copy the three values into `msix/identity.json`:

| Partner Center field | `msix/identity.json` key |
|---|---|
| Package/Identity/Name | `identityName` |
| Package/Identity/Publisher (starts with `CN=`) | `publisher` |
| Package/Properties/PublisherDisplayName | `publisherDisplayName` |

Copy them exactly. A mismatch makes Partner Center reject the upload.

## 2. Build

The build needs Windows. Either option produces the `.msix` file:

- **GitHub Actions:** commit `msix/identity.json`, then run the **Microsoft Store MSIX** workflow on the Actions tab and download its artifact.
- **Windows PC with the Windows SDK:** run `npm run make:store`. The file is in `out/make/msix/x64/`.

Each Store update needs a higher version in `package.json`.

## 3. Test on a real Windows PC

Run `npm run make:store:sideload` to get a package signed with a dev certificate. Trust that certificate on the PC, install the package, then check:

- [ ] Active-window tracking works, including its PowerShell monitor
- [ ] Block mode minimizes a blocked app and restores it
- [ ] Google sign-in and other `produchive://` links open the app, both when it's running and when it's closed
- [ ] The launch-at-startup toggle stays on, and the app starts after signing out and back in
- [ ] **Check for Updates** is gone from the Help menu and no update banner appears
- [ ] Sync folders and the native file manager reveal work
- [ ] Local AI models download and run
- [ ] Uninstalling removes the app cleanly

Then run the Windows App Certification Kit on the package.

## 4. Submit in Partner Center

| Section | What to enter |
|---|---|
| Pricing and availability | Free, and your chosen markets |
| Properties | Category: Productivity. Privacy policy URL: `https://produchive.com/privacy` |
| Age ratings | Complete the IARC questionnaire |
| Packages | Upload the `.msix` from step 2 |
| Store listing | The text below, plus at least one screenshot (four or more recommended) |
| Submission options | The certification notes below |

### Listing description

Check this against what the app does before you submit. Don't reuse the README's "No cloud, no tracking" line: the app monitors active windows and connects to `api.produchive.com` and Firebase.

> Produchive helps you stay focused. With your permission it detects which app or window is active, logs focus sessions to your calendar, and shows how your time lines up with your goals.
>
> - Automatic focus tracking and a 7-day calendar
> - Focus scores, context-switch tracking and timelines
> - Optional on-device AI that nudges you when you drift off task
> - Block mode that minimizes the apps you choose during focus time
> - Pomodoro study sessions and 3D focus rooms
> - Optional encrypted sync across your devices

### Full-trust justification (`runFullTrust`)

> Produchive is a Win32 desktop app built with Electron. It needs full trust to run the Electron runtime and to read the active window title for the productivity tracking described in the listing.

### Notes for certification

> Produchive reads the active window to log focus sessions. Block mode minimizes only the apps the user has chosen, and only after the user turns it on. Launch at startup is off by default. [Add a test login here if the app needs one.]

## Before you submit

- Confirm the privacy policy is live and covers activity data, what is sent to `api.produchive.com`, Firebase and any AI provider, and how users control it (policies 10.5.1 and 10.5.2).
- Confirm block mode and activity tracking only start after the user agrees (policy 10.2.8).

## Updating the app

Raise the version in `package.json`, build a new `.msix`, and create a new submission in Partner Center. The self-updater is off in Store installs. GitHub Release builds keep using it.
