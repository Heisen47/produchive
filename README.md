# Produchive 

Produchive is a self-hosted, offline-first productivity application that helps you stay focused. It monitors your activity and uses a local AI to judge your performance based on your goals.

## Key Features

*   **Offline & Private**: All data is stored locally on your device. No cloud, no tracking.
*   **Self-Hosted**: You own your data.
*   **Activity Monitoring**: Automatically tracks what applications you use.
*   **AI Performance Judge**: An optional AI feature that analyzes your activity against your set goals.
    *   *Note: Internet is only required once to download the AI model. You can skip this feature if you prefer.*

## Installation for Mac Users

If you download the app from the GitHub Releases page:

1.  Download and extract the app.
2.  **Important**: macOS blocks apps downloaded from the web. To fix the "Corrupted" error, open your terminal and run:
    ```bash
    sudo xattr -cr /path/to/produchive.app
    ```
3.  Open the app.
4.  **Grant Permission**: You must allow the app to monitor your screen/activity when prompted (System Settings > Privacy & Security > Screen Recording / Accessibility).

## 🐧 Installation for Linux (Arch/Ubuntu/etc)

1.  Download the **.zip** file (for Arch) or **.deb/.rpm** (for others) from Releases.
2.  Extract the zip.
3.  Run the executable:
    ```bash
    ./produchive
    ```
    *(If it fails to start, ensure you have basic dependencies like `nss` and `gtk3` installed, which are standard on most desktops).*

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
