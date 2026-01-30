# Produchive 🚀

Produchive is an offline-first productivity application with a built-in Local LLM. It helps you track tasks and provides AI-powered coaching and analysis without your data ever leaving your device.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

*   **Offline First**: All data is stored locally on your machine.
*   **Local AI Coach**: Built-in LLM (Llama-3 via WebLLM) runs entirely in your browser/window using WebGPU. No API keys, no monthly fees, no privacy concerns.
*   **Task Management**: Simple and fast todo list with drag-and-drop simplicity (planned) and instant updates.
*   **Data Persistence**: Your tasks are saved automatically to a local JSON database.
*   **Modern UI**: Beautiful dark-mode interface built with React and TailwindCSS.

## 🛠️ Tech Stack

*   **Core**: [Electron](https://www.electronjs.org/) + [Vite](https://vitejs.dev/)
*   **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [TailwindCSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
*   **AI Engine**: [WebLLM](https://webllm.mlc.ai/) (WebGPU)
*   **State Management**: [Zustand](https://docs.pmnd.rs/zustand)
*   **Database**: [LowDB](https://github.com/typicode/lowdb)

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

## 🏗️ Building for Production

To create a distributable package for your OS:

```bash
npm run make
```

Check the `out` directory for the generated installer.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.
