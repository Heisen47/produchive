# Produchive v3.0.0 Release Notes

Welcome to **Produchive v3.0.0**! This is a major release featuring real-time multiplayer focus rooms, premium subscription features, an overhauled navigation sidebar, and significant performance and developer improvements.

---

## 🌐 Real-Time Multiplayer Focus & Study Rooms

Bring your study group to Produchive! Work together in our newly introduced multiplayer focus environments.

*   **Study with Friends (Premium Feature)**: Unlock the ability to create and join shared focus rooms in real time. Generate and copy room codes with one click to easily invite friends.
*   **Offline NPCs (Free Feature)**: Prefer studying alone or offline? We have added an identical focus room experience that runs completely offline on your device, featuring virtual NPC companions to keep you motivated.
*   **Real-Time Sync**: Fully synchronized timers, study durations, and room states (including play/pause state synchronization) powered by WebSockets.
*   **Auto-Reconnect**: Seamless auto-reconnection logic so you never lose your progress during brief network dropouts.
*   **Immersive Animations**:
    *   **Local Spawn Animation**: Watch your avatar glide into place when you join a room.
    *   **Smoke Poof Effect**: Clean visual animations trigger whenever someone joins or leaves a room.

---

## 🔐 Redesigned Auth, Login, & Premium Features

We have upgraded our user accounts system to support custom experiences and secure access.

*   **Seamless Login & Deep Linking**: Implemented a local authentication server with deep linking support so you can sign in quickly and securely.
*   **Premium Visual Branding**: Beautiful new branding highlights premium users across the app.
*   **Redesigned Login Modal**: A fresh profile view, easier access to user settings, and session restoration states.
*   **Account Protection**: Extra verification steps before modifying settings to keep your account safe.

---

## 🧭 Apple-Style Glassmorphic Navigation Sidebar

We have overhauled the layout to maximize screen space while keeping the app accessible.

*   **Hover-to-Reveal**: The sidebar automatically slides open when you hover near the left edge, and retracts when not in use.
*   **Sidebar Pinning**: Want it visible all the time? Simply click the pin button to lock it in place.
*   **Premium Glassmorphism**: Sleek, modern styling with glassmorphic background blur and tooltips.

---

## 🛠️ Technical & Developer Improvements

Under-the-hood upgrades to ensure the app is faster, more stable, and easier to build.

*   **Native Library Fixes**: Upgraded native dependencies (`ffi-napi`, `ref-napi`) to custom-scoped variants for robust cross-platform execution on both Windows and macOS.
*   **Cross-Env Compatibility**: Added `cross-env` support for seamless configuration of environment variables on all developer platforms.
*   **QA & Production Configurations**: Clean, centralized base URL routing for QA and production environments.
*   **Dependency Patches**: Integrated `patch-package` for reliable building of third-party dependencies.
