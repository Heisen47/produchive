# Produchive Release Notes

---

## Produchive v3.0.31 (Hotfix)

Hotfix release resolving an issue where the "Analyze with AI" button failed to trigger analysis from the dashboard.

### Hotfix Details
- **Analyze with AI Fix**: Resolved a bug causing "Analyze with AI" to fail silently when the on-device WebLLM model was still loading or when daily goals were empty.
- **Graceful Fallback**: Added seamless fallback to on-device tab-level heuristics if the local WebGPU model is offline or uninitialized.
- **Tab & Domain Sanitization**: Cleans active browser tabs to clean domain names and distinguishes educational study from entertainment.
- **Sleek Shareable Card**: Redesigned the productivity verdict export with dynamic card height, active model badge, and `produchive.com` branding.

---

## Produchive v3.0.3

A major feature release introducing Double-Click Calendar Scheduling, Direct Time Planning, AI Insights & Focus Telemetry, Automatic Screen Activity Detection, On-Device AI Distraction Nudges, and Study-Triggered Spaced Revision.

### Interactive Calendar & Direct Time Planning
- **Double-Click Quick Create**: Double-click anywhere on empty calendar slots to schedule focus sessions, routines, and breaks with instant 15-minute grid alignment.
- **Direct Time Planning**: Create, edit, and reorganize calendar routines without requiring the automated algorithmic scheduler.
- **Bidirectional Task Synchronization**: Toggling task completion in the task list or goals immediately synchronizes matching calendar blocks, with automatic task backlog integration.

### AI Insights & Productivity Telemetry
- **Visual AI Insights View**: Comprehensive analytics dashboard showing focus score trends, attention fragmentation, and category breakdowns.
- **Distraction Analysis**: Real-time evaluation of foreground app usage against active goals and routines.

### Automatic Screen Activity Detection & Multi-App Grouping
- **Continuous Foreground Tracking**: Tracks window activity in real-time and logs focus blocks with precise session durations.
- **Intelligent Activity Categorization**: Automatically categorizes active apps into Development, Design, Meeting, Writing, Research, and Media breaks.
- **Multi-App Overflow Grouping**: Cleanly aggregates rapid context switches within a time slot with a `+N apps detected` collapse button and breakdown modal.
- **In-App Accuracy Feedback**: In-app rating dialog to submit classification feedback to the developer database for continuous model refinement.

### On-Device AI Distraction Judge & Native Desktop Nudges
- **Local Model Judge**: Evaluates active windows using local WebGPU LLMs against your active goals and scheduled routines.
- **Polite Native Desktop Notifications**: Alerts when off-task for $\ge 60$ seconds with built-in 10-minute cooldown protection to avoid spam.

### Study-Only Pomodoro & Spaced Revision Assistant
- **Study-Triggered Pomodoro**: 25/5 Pomodoro focus and break cycles trigger strictly while in study environments or study apps.
- **Spaced Repetition Topic Check-In**: Automatic reminders for topics unstudied for 4–5 days with 3 interactive actions:
  - `Yes, Revise`: Slots a 25-minute revision block into the calendar and updates study history.
  - `Not Today`: Snoozes reminder for 24 hours.
  - `Never give me reminder for this`: Permanently mutes reminders for the topic.
- **5-Minute Advance Activity Alerts**: Scans schedule and delivers proactive desktop reminders 5 minutes before scheduled calendar blocks begin.

### 3D Virtual Focus Rooms (Three.js)
- **Immersive Sanctuaries**: Classroom, Café, and Library environments with ambient soundscapes and offline NPC companions.
- **Session Auto-Logging**: Completed study sessions ($\ge 30$s) automatically log to your master routine calendar.

---

## Produchive v3.0.2

Initial routine planning foundation, smart schedule auto-balancing, and calendar themes.

### Smart Routine Foundation
- **7-Day Master Visual Calendar**: Visual timeline slots, color-coded categories, and day-by-day circadian rhythm budgeting.
- **Intelligent Auto-Scheduler**: Algorithm-driven weekly planning (`generateWeeklySmartSchedule`) with workload auto-balancing.
- **Calendar Themes**: Added Totoro bus stop theme and customizable background styling.

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
