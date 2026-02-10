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

## Using the Dashboard

The dashboard is your productivity command center.

| Feature | What It Does |
|---------|--------------|
| **Start Monitoring** | Begins tracking your app usage. Click again to stop. |
| **Your Targets** | Shows your current goals. Add, edit, or delete them here. |
| **Activity Stats** | Displays metrics like total time tracked and number of apps used. |
| **Top Apps** | Lists the applications you've used the most during this session. |

---

##  AI Productivity Judge

This is the core feature! The AI analyzes your activity and tells you how productive you've been.

### How to Use It:
1. Make sure **monitoring is started** and you have some tracked activity.
2. Click the **"Analyze My Productivity"** button.
3. The AI will compare your activity against your goals and give you:
   - A **Productivity Rating** (0-10)
   - A **Verdict** (Productive / Neutral / Unproductive)
   - **Personalized Tips** for improvement
   - A categorization of your apps (productive, neutral, distracting)

### First-Time Setup:
- The AI model needs to be downloaded once (requires internet).
- After the download, the AI runs **completely offline** on your device.
- You can skip the AI download if you just want activity tracking.

---

## Viewing Historical Reports

Want to see your past analyses?

1. Navigate to the **Historical Reports** section.
2. You'll find a list of all your previous productivity evaluations.
3. Click on any report to view its full details.

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
