
<div align="center">
  <p>
    <a href="https://github.com/Heisen47/produchive">
      <img src="https://img.shields.io/github/stars/Heisen47/produchive?style=for-the-badge&color=eab308&logo=github&labelColor=333333" alt="GitHub stars" />
    </a>
  </p>
  <strong>If you find Produchive useful, please consider giving it a star on GitHub!</strong>
  <br/>
  It helps the project grow and is the best way to motivate me to keep improving it.
</div>


https://github.com/user-attachments/assets/c838f4f3-b312-4251-b68a-fe9d2e8584bb

[![produchive v3.0.0](https://img.youtube.com/vi/8HJvUn4LI0A/maxresdefault.jpg)](https://youtu.be/8HJvUn4LI0A)

# Produchive 

Produchive is a self-hosted, offline-first productivity application that helps you stay focused. It monitors your activity and uses a local AI to judge your performance based on your goals.



## Key Features

*   **Interactive Routine & Calendar Scheduler (v3.0.31)**: 7-day visual calendar, double-click quick event creation, circadian rhythm balance (deep work, meetings, breaks, sleep), intelligent auto-balancing, and bidirectional task synchronization.
*   **Automatic Screen Activity Detection (v3.0.31)**: Automatically detects active windows and logs focus sessions into the calendar with duration, handling multi-app overflow (`+N apps detected`) and 1-click user verification.
*   **AI Insights & Productivity Telemetry (v3.0.31)**: Real-time focus scoring, context switch tracking, app distraction evaluation, and detailed visual timelines.
*   **On-Device AI Distraction Judge & Native Nudges (v3.0.31)**: Local LLM monitors active windows against goals and delivers polite native desktop notifications when off-task.
*   **Study-Only Pomodoro & Spaced Revision (v3.0.31)**: 25/5 Pomodoro cycles activated strictly during study mode, plus gentle 4-5 day spaced repetition check-ins with 3-action controls.
*   **3D Virtual Focus Rooms (v3.0.31)**: Three.js powered study environments (Classroom, Café, Library) with ambient audio, timer sync, and NPC study companions.
*   **Focus Telemetry & Custom AI Prompts (v3.0.1)**: Real-time context switch tracking, Focus Score analytics, and built-in Prompt Editor for custom AI Judge personas.
*   **Offline & Strictly Private**: All data is stored locally on your device in LowDB JSON. No cloud, no tracking.
*   **Self-Hosted & Open Source**: You own your data 100%. Optional local AI runs on WebGPU.

## Download

For the latest version, please visit our **[Releases Page](https://github.com/Heisen47/produchive/releases/latest)**.

| Platform | Recommended File |
|----------|-----------------|
| **macOS** | `produchive-darwin-arm64-[version].zip` |
| **Windows** | `produchive-win32-x64-[version].zip` |

_Note: If you prefer a portable version without installation, look for the `.zip` file._

## Installation for Mac Users

If you download the app from the GitHub Releases page:

1.  Download and extract the app.
2.  **Important**: macOS blocks apps downloaded from the web. To fix the "Corrupted" error, open your terminal and run:
    ```bash
    sudo xattr -cr /path/to/produchive.app
    ```
3.  Open the app.
4.  **Grant Permission**: You must allow the app to monitor your screen/activity when prompted (System Settings > Privacy & Security > Screen Recording / Accessibility).

## Running from Source

1.  Clone the repo & install dependencies:
    ```bash
    git clone https://github.com/yourusername/produchive.git
    cd produchive
    npm install
    ```

2.  Start the app:
    ```bash
    npm start
    ```

### Report a bug

If you have noticed any bug in the project please report in the issues sections using the correct guidelines mentioned.

### Suggest a feature

If you have any feature request, please open an issue and describe the feature you would like to see in the app.


##  Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License.
