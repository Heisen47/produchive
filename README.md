# Produchive 🚀

Produchive is an offline-first productivity application with a built-in Local LLM. It monitors your computer activities and helps you stay focused on your goals with AI-powered analysis—all without your data ever leaving your device.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

*   **Goal-Oriented Productivity**: Set your daily goal and let Produchive monitor your activities to keep you on track.
*   **Activity Monitoring**: Automatically tracks which applications and windows you're using in real-time.
*   **AI-Powered Analysis**: Get instant productivity insights by asking the AI to judge your activities against your goal.
*   **Offline First**: All data is stored locally on your machine. No cloud, no tracking, no privacy concerns.
*   **Local AI Coach**: Built-in LLM (Llama-3.1 via WebLLM) runs entirely in your browser/window using WebGPU. No API keys, no monthly fees.
*   **Data Persistence**: Your goals and activity history are saved automatically to a local JSON database.
*   **Modern UI**: Beautiful dark-mode interface with smooth animations built with React and TailwindCSS.

## 🛠️ Tech Stack

*   **Core**: [Electron](https://www.electronjs.org/) + [Vite](https://vitejs.dev/)
*   **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [TailwindCSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
*   **AI Engine**: [WebLLM](https://webllm.mlc.ai/) (WebGPU)
*   **State Management**: [Zustand](https://docs.pmnd.rs/zustand)
*   **Database**: [LowDB](https://github.com/typicode/lowdb)
*   **Logging**: [electron-log](https://github.com/megahertz/electron-log)
*   **Activity Monitoring**: [active-win](https://github.com/sindresorhus/active-win)

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/produchive.git
    cd produchive
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

## 🚀 Running Locally

To start the development server:
```bash
npm start
```

This will launch the Electron application.

> **Note**: On the first run, the AI Coach will download the model weights (approx 4GB). This happens once and is cached for offline use. Ensure you have a stable internet connection for the initial setup.

## 📊 How It Works

1. **Set Your Goal**: When you launch the app, you'll be prompted to set your productivity goal (e.g., "Complete my project proposal" or "Study for my exam").

2. **Activity Monitoring**: Produchive automatically monitors which applications and windows you're using every 3 seconds. It tracks:
   - Application name (e.g., Chrome, VS Code, Word)
   - Window title (e.g., "YouTube - Funny Videos" or "Project Documentation")
   - Timestamp of each activity

3. **AI Analysis**: Click the "Judge My Productivity" button to get an instant AI-powered analysis of your recent activities. The AI will:
   - Compare your activities against your stated goal
   - Provide a productivity rating (1-10)
   - Give a verdict (productive/neutral/unproductive)
   - Offer constructive feedback and suggestions

4. **Privacy First**: All monitoring and analysis happens locally on your device. No data is ever sent to external servers.

## 🏗️ Building for Production

To create a distributable package for your OS:

```bash
npm run make
```

Check the `out` directory for the generated installer.

## 🐛 Debugging & Data Location

### Where is my data stored?

All your data is stored locally in:
- **Windows**: `%APPDATA%\produchive`
- **macOS**: `~/Library/Application Support/produchive`
- **Linux**: `~/.config/produchive`

See [DATA_LOCATION.md](DATA_LOCATION.md) for detailed information.

### Debug Panel

Click the bug icon (🐛) in the bottom-right corner to access:
- System information
- Data folder location
- Log files
- Database contents
- Quick access buttons

### Logs

Application logs are stored in `logs/produchive.log` within your user data folder.


## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
