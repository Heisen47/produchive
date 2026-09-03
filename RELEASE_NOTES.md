# Produchive Release Notes

---

## Produchive v3.0.2

A landmark release introducing the Smart Routine Calendar, Automatic Screen Activity Detection, On-Device AI Distraction Nudges, and Study-Triggered Pomodoro & Spaced Revision.

### Smart Routine and Calendar Scheduler
- **7-Day Master Visual Calendar**: Plan your week with visual timeline slots, color-coded categories, and day-by-day circadian rhythm budgeting (Deep Work, Meetings, Meals, Breaks, Sleep).
- **Intelligent Auto-Scheduler**: Algorithm-driven weekly planning (`generateWeeklySmartSchedule`) with automatic workload balancing and sequential rescheduling.
- **Bidirectional Task & Routine Sync**: Toggling task completion in the task list or goals immediately updates matching calendar blocks and synchronizes with LowDB persistence.

### Automatic Activity Tracking and Calendar Event Logging
- **Real-Time Activity Auto-Tracking**: Tracks foreground window usage and automatically creates completed calendar blocks with exact session durations.
- **Multi-App Overflow Grouping**: When switching between multiple apps within a time block, cleanly groups items with a `+N apps detected` collapse button and full breakdown modal.
- **Developer Accuracy Feedback**: In-app feedback ratings stored to database, with direct integration to Google Forms for continuous accuracy improvement.

### On-Device AI Distraction Judge and Native Nudges
- **Local Model Judge**: Checks if a local LLM is downloaded in cache. Evaluates active windows against active goals and scheduled routine blocks.
- **Native Desktop Notifications & Sonner Alerts**: Dispatches gentle, polite native desktop notifications when you stay on non-goal apps (e.g. YouTube, social media) for $\ge 60$ seconds.
- **Spam Protection**: 10-minute cooldown timer ensures notifications remain helpful and never intrusive.

### Study-Only Pomodoro and Spaced Revision Assistant
- **Study-Triggered Pomodoro**: 25-minute focus / 5-minute break cycles trigger *strictly* while actively studying (in 3D Focus Rooms, study apps, reading PDFs/notes).
- **Spaced Repetition Topic Check-In**: Gentle reminders for topics unstudied for 4–5 days (e.g., *Photosynthesis*), capped at max 1 per day.
- **3-Action Interactive Response**:
  - `Yes, Revise`: Slots a 25-min revision block into the calendar and updates study timestamp.
  - `Not Today`: Snoozes reminder for 24 hours.
  - `Never give me reminder for this`: Permanently mutes reminders for that specific topic.
- **5-Minute Ahead Activity Warnings**: Scans routines every 30 seconds and delivers proactive reminders 5 minutes before scheduled calendar blocks begin.

### 3D Virtual Focus Rooms (Three.js)
- **Immersive Sanctuaries**: Choose between Classroom, Café, and Library environments with ambient audio.
- **Study Session Auto-Logging**: Completed study sessions ($\ge 30$s) automatically log to your master routine calendar with exact duration and timestamp.

---

## Produchive v3.0.1

Focus telemetry integration, customizable AI personas, and cross-platform native improvements.

### Real-Time Focus Telemetry and Analytics
- **Context Switch Tracking**: Real-time monitoring of app-switching frequency to quantify attention fragmentation.
- **Daily Focus Score**: Evaluates productive vs unproductive active time.
- **Category Hour Breakdown**: Visual categorization across Development, Design, Writing, Research, and Meetings.

### Custom AI Prompt Editor
- **Prompt Editor Modal**: Users can customize the system prompt used by the local AI Judge to personalize tone, strictness, and evaluation criteria.

### Native Platform and Installer Modernization
- **Node 22 Compatibility**: Migrated native modules to `@napi-ffi` scope (`ffi-napi`, `ref-napi`) for seamless stability.
- **Windows NSIS Installer**: Added standard Windows wizard installer (`setup.exe`) alongside portable `.zip` builds.

---

# Produchive v3.0.0 Release Notes

Welcome to **Produchive v3.0.0**! This is a major release featuring real-time multiplayer focus rooms, premium subscription features, an overhauled navigation sidebar, and significant performance and developer improvements.

---

## Real-Time Multiplayer Focus and Study Rooms

Bring your study group to Produchive! Work together in our newly introduced multiplayer focus environments.

- **Study with Friends (Premium Feature)**: Unlock the ability to create and join shared focus rooms in real time. Generate and copy room codes with one click to easily invite friends.
- **Offline NPCs (Free Feature)**: Prefer studying alone or offline? We have added an identical focus room experience that runs completely offline on your device, featuring virtual NPC companions to keep you motivated.
- **Real-Time Sync**: Fully synchronized timers, study durations, and room states (including play/pause state synchronization) powered by WebSockets.
- **Auto-Reconnect**: Seamless auto-reconnection logic so you never lose your progress during brief network dropouts.
- **Immersive Animations**:
  - **Local Spawn Animation**: Watch your avatar glide into place when you join a room.
  - **Smoke Poof Effect**: Clean visual animations trigger whenever someone joins or leaves a room.

---

## Redesigned Authentication, Login, and Premium Features

We have upgraded our user accounts system to support custom experiences and secure access.

- **Seamless Login & Deep Linking**: Implemented a local authentication server with deep linking support so you can sign in quickly and securely.
- **Premium Visual Branding**: Beautiful new branding highlights premium users across the app.
- **Redesigned Login Modal**: A fresh profile view, easier access to user settings, and session restoration states.
- **Account Protection**: Extra verification steps before modifying settings to keep your account safe.

---

## Apple-Style Glassmorphic Navigation Sidebar

We have overhauled the layout to maximize screen space while keeping the app accessible.

- **Hover-to-Reveal**: The sidebar automatically slides open when you hover near the left edge, and retracts when not in use.
- **Sidebar Pinning**: Want it visible all the time? Simply click the pin button to lock it in place.
- **Premium Glassmorphism**: Sleek, modern styling with glassmorphic background blur and tooltips.

---

## Technical and Developer Improvements

Under-the-hood upgrades to ensure the app is faster, more stable, and easier to build.

- **Native Library Fixes**: Upgraded native dependencies (`ffi-napi`, `ref-napi`) to custom-scoped variants for robust cross-platform execution on both Windows and macOS.
- **Cross-Env Compatibility**: Added `cross-env` support for seamless configuration of environment variables on all developer platforms.
- **QA & Production Configurations**: Clean, centralized base URL routing for QA and production environments.
- **Dependency Patches**: Integrated `patch-package` for reliable building of third-party dependencies.
