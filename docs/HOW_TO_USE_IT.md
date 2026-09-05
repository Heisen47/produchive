# How to Use Produchive

A simple guide to get the most out of Produchive on **Windows** and **macOS**.

---

## Getting Started

### Step 1: Download & Install

**macOS**
1. Download the `.dmg` or `.zip` file from [GitHub Releases](https://github.com/Heisen47/produchive/releases).
2. If macOS says the app is "damaged" or "unverified", open **Terminal** and run:
   ```bash
   sudo xattr -cr /path/to/Produchive.app
   ```
3. Drag the app to your **Applications** folder and open it.

**Windows**
1. Download the `.exe` installer from [GitHub Releases](https://github.com/Heisen47/produchive/releases).
2. Run the installer and follow the prompts.
3. Launch Produchive from your Start menu or desktop shortcut.

---

### Step 2: Grant Permissions

Produchive needs permission to monitor which apps you're using.

**macOS**
- When prompted, go to **System Settings → Privacy & Security → Screen Recording** and enable Produchive.
- You may also need to enable **Accessibility** permissions.

**Windows**
- No special permissions are required. The app works out of the box.

---

## Setting Your Goals

When you first open the app, you'll see a welcome screen asking you to set your goals.

1. **Add up to 5 goals** for your day (e.g., "Finish the React project", "Study for 2 hours").
2. Each goal must be at least 3 characters.
3. Click **Start Productivity** to begin, or **Skip** to set goals later.

You can always edit your goals from the **Your Targets** section on the main dashboard.

---

## Using the Dashboard & Routine Hub

The dashboard is your central focus command center.

| Feature | What It Does |
|---------|--------------|
| **Start Monitoring** | Begins real-time foreground window tracking. Click again to stop. |
| **Today's Schedule & Routine** | Displays your active scheduled block, upcoming routine, daily adherence progress, and recent auto-detected screen events. |
| **Your Targets** | Shows your current goals. Add, edit, or delete them here. |
| **Activity Stats** | Displays metrics like total time tracked, focus score, and apps used. |
| **Top Apps** | Lists the applications you've spent the most time in. |

---

## Smart Routine and Calendar Scheduler

Produchive v3.0.2 includes a master 7-day visual calendar built around circadian rhythms.

1. **Circadian Rhythm Budgets**: View planned vs allocated hours across Deep Work, Meetings, Meals, Breaks, and Sleep.
2. **Auto-Scheduling & Balancing**: Use the Smart Scheduler to automatically balance your weekly routine without overlapping blocks.
3. **Bidirectional Task Sync**: Complete a task in your task list and it immediately marks as completed on your calendar (and vice versa).

---

## Automatic Activity Detection and Calendar Logging

Never manually track sessions again.

1. **Auto-Detection**: With screen monitoring enabled, Produchive tracks foreground activity and automatically logs verified focus blocks directly to your calendar.
2. **Multi-App Grouping**: If you switch between apps (e.g. VS Code, Terminal, Browser) during a block, it displays a clean `+N apps detected` badge with full percentage breakdowns on click.
3. **1-Click Accuracy Feedback**: Rate detection accuracy directly in-app or click to open the feedback form to help refine categorization.

---

## AI Distraction Judge and Native Desktop Nudges

When an on-device AI model is downloaded:

1. **Distraction Evaluation**: The AI judge evaluates whether your active window aligns with your scheduled routine block or goal.
2. **Proactive Alerts**: Spending $\ge 60$ seconds on non-goal apps (e.g. YouTube, social media) triggers a polite native desktop notification and toast warning.
3. **10-Minute Cooldown**: Rate-limited to prevent notification fatigue.

---

## Study-Only Pomodoro and Spaced Revision

Intelligent study assistance built for retention:

1. **Study-Triggered Pomodoro**: 25-minute focus / 5-minute break timers initiate *only* when you are actively studying (Focus Room study mode, reading PDFs, notes, or study routine blocks).
2. **Spaced Repetition Check-In**: If you haven't studied a topic (e.g., *Photosynthesis*) in 4–5 days, Produchive offers a gentle revision nudge with 3 choices:
   - **Yes, Revise**: Slots a 25-minute revision block into your calendar.
   - **Not Today**: Snoozes reminder for 24 hours.
   - **Never give me reminder for this**: Permanently disables future alerts for that topic.
3. **5-Minute Ahead Alerts**: Sends a desktop alert 5 minutes before your planned calendar activities start.

---

## 3D Virtual Focus Rooms

Immersive Three.js environments for solo and group focus:

1. Choose a scene: **Classroom**, **Café**, or **Library**.
2. Ambient soundscapes and timer controls keep you grounded.
3. Sessions $\ge 30$ seconds automatically log as completed blocks on your master routine calendar.

---

## Custom Prompt Editor (v3.0.1)

Personalize the local AI Judge's strictness and tone:

1. Open **Prompt Editor** from the settings or AI panel.
2. Adjust evaluation instructions (e.g., strict software engineer, supportive student tutor, minimalist coach).
3. Changes apply immediately to all on-device evaluations.

---

## AI Productivity Judge

The AI analyzes your tracked activity and scores your focus.

### How to Use It:
1. Make sure **monitoring is started** and you have some tracked activity.
2. Click the **"Analyze My Productivity"** button.
3. The AI compares your activity against your goals and schedule, outputting:
   - A **Productivity Rating** (0-10)
   - A **Verdict** (Productive / Neutral / Unproductive)
   - **Personalized Tips** for improvement
   - App categorization (productive, neutral, distracting)

### First-Time Setup:
- The AI model downloads once (requires internet connection).
- After download, the model executes **100% locally** via WebGPU with zero cloud telemetry.

---

## Viewing Historical Reports & Analytics

1. Navigate to **Historical Reports** or **Analytics**.
2. Inspect past daily analyses, context switch rates, and planned vs actual adherence.
3. Share aesthetic watercolor milestone cards with 1 click.

---

## FAQ / Troubleshooting

**Q: The app says "No activity data to analyze"**  
A: Make sure you have clicked "Start Monitoring" and used your computer for a bit before running the AI analysis.

**Q: My goals aren't saving**  
A: Ensure your goal text is at least 3 characters long.

**Q: macOS says the app is damaged**  
A: Run `sudo xattr -cr /path/to/Produchive.app` in Terminal, then try opening again.

**Q: The AI model download is stuck**  
A: Check your internet connection. The model is several hundred MB. Once downloaded, it's stored locally.

---

## Privacy

- **All data stays on your device.** No cloud servers, no tracking.
- The AI runs locally after the initial model download. (we use gemma as the Open source model)
- Your goals, activity, and reports are never transmitted anywhere.

---

## Launch at Startup

Want Produchive to start automatically when you turn on your computer?

1. Look at the **footer** of the app.
2. You'll see a **"Launch at startup"** toggle switch.
3. Turn it **on** — the app will now auto-launch when your PC or Mac starts up.
4. Turn it **off** anytime to disable auto-launch.

---

## Update Notifications

When a new version of Produchive is released on GitHub:

1. A **blue banner** will appear at the top of the app.
2. It shows the new version number and a **"Download"** button.
3. Click **Download** to go to the GitHub Releases page and get the latest version.
4. You can dismiss the banner by clicking the **X** button.

---

## Tips for Best Results

1. **Be specific with your goals.** Instead of "Work", try "Complete chapters 3-5 of online course".
2. **Run analysis periodically** (e.g., every few hours) to stay on track.
3. **Review historical reports** at the end of the week to spot patterns.

---

**Have feedback or found a bug?** [Open an issue on GitHub](https://github.com/Heisen47/produchive/issues)

Happy Productivity! 
