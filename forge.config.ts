import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
const config: ForgeConfig = {
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
        const { execSync } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        const outputDir = options.outputPaths[0];
        // Find the .app bundle in the output directory
        const files = fs.readdirSync(outputDir);
        const appBundle = files.find((f: string) => f.endsWith('.app'));
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

export default config;
