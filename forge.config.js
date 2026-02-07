const { MakerSquirrel } = require('@electron-forge/maker-squirrel');
const { MakerZIP } = require('@electron-forge/maker-zip');
const { MakerDeb } = require('@electron-forge/maker-deb');
const { MakerRpm } = require('@electron-forge/maker-rpm');
const { VitePlugin } = require('@electron-forge/plugin-vite');
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const config = {
    packagerConfig: {
        asar: {
            unpack: '**/node_modules/active-win/**',
        },
        icon: './resources/icon',
        extraResource: [
            './resources/icon.png',
            './node_modules/active-win',
        ],
    },
    rebuildConfig: {},
    hooks: {
        postPackage: async (forgeConfig, options) => {
            if (process.platform === 'darwin') {
                const outputDir = options.outputPaths[0];
                // Find the .app bundle in the output directory
                const files = fs.readdirSync(outputDir);
                const appBundle = files.find((f) => f.endsWith('.app'));
                if (appBundle) {
                    const appPath = path.join(outputDir, appBundle);
                    console.log(`Re-signing app bundle: ${appPath}`);
                    execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
                    console.log('App bundle re-signed successfully');
                }
            }
        },
    },
    makers: [
        new MakerSquirrel({}),
        new MakerZIP({}, ['darwin']),
        new MakerRpm({
            options: {
                icon: './resources/icon.png'
            }
        }),
        new MakerDeb({
            options: {
                icon: './resources/icon.png'
            }
        }),
    ],
    plugins: [
        new VitePlugin({
            build: [
                {
                    entry: 'src/main.ts',
                    config: 'vite.main.config.ts',
                    target: 'main',
                },
                {
                    entry: 'src/preload.ts',
                    config: 'vite.preload.config.ts',
                    target: 'preload',
                },
            ],
            renderer: [
                {
                    name: 'main_window',
                    config: 'vite.renderer.config.mjs',
                },
            ],
        }),
        new AutoUnpackNativesPlugin({}),
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: false,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};

module.exports = config;
