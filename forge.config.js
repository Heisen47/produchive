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
            './resources/icon.ico',
            './resources/icon.icns',
            './node_modules/active-win',
        ],
    },
    rebuildConfig: {},
    hooks: {
        postPackage: async (forgeConfig, options) => {
            const outputDir = options.outputPaths[0];

            if (process.platform === 'win32') {
                const resourcesDir = path.join(outputDir, 'resources');
                const activeWinDest = path.join(resourcesDir, 'active-win');
                const rootNodeModules = path.join(process.cwd(), 'node_modules');

                const getDependencies = (pkgPath) => {
                    const pkgJsonPath = path.join(pkgPath, 'package.json');
                    if (!fs.existsSync(pkgJsonPath)) return [];

                    try {
                        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
                        const deps = Object.keys(pkg.dependencies || {});
                        const optDeps = Object.keys(pkg.optionalDependencies || {});
                        return [...deps, ...optDeps];
                    } catch (e) {
                        return [];
                    }
                };

                // Collect all dependencies recursively
                const allDeps = new Set();
                const processPackage = (pkgPath, depth = 0) => {
                    if (depth > 10) return; // Prevent infinite recursion

                    const deps = getDependencies(pkgPath);
                    for (const dep of deps) {
                        const nestedPath = path.join(pkgPath, 'node_modules', dep);
                        const hoistedPath = path.join(rootNodeModules, dep);

                        if (fs.existsSync(nestedPath)) {
                            // Keep nested structure
                            const relPath = path.relative(path.join(rootNodeModules, 'active-win'), nestedPath);
                            if (!allDeps.has(nestedPath)) {
                                allDeps.add(nestedPath);
                                processPackage(nestedPath, depth + 1);
                            }
                        } else if (fs.existsSync(hoistedPath) && !allDeps.has(hoistedPath)) {
                            allDeps.add(hoistedPath);
                            processPackage(hoistedPath, depth + 1);
                        }
                    }
                };

                // Start with active-win's dependencies
                const activeWinSrc = path.join(rootNodeModules, 'active-win');
                processPackage(activeWinSrc);

                // Copy all collected dependencies
                for (const depPath of allDeps) {
                    const relativePath = path.relative(rootNodeModules, depPath);

                    // If it's nested inside a package (contains node_modules in path), preserve structure
                    if (relativePath.includes('node_modules')) {
                        // This is a nested dependency, copy to same relative location under active-win
                        const activeWinRelative = path.relative(path.join(rootNodeModules, 'active-win'), depPath);
                        const destPath = path.join(activeWinDest, activeWinRelative);

                        if (!fs.existsSync(destPath)) {
                            fs.cpSync(depPath, destPath, { recursive: true });
                            console.log(`Copied nested: ${activeWinRelative}`);
                        }
                    } else {
                        // This is a hoisted dependency, copy to active-win/node_modules
                        const destPath = path.join(activeWinDest, 'node_modules', relativePath);

                        if (!fs.existsSync(destPath)) {
                            fs.cpSync(depPath, destPath, { recursive: true });
                            console.log(`Copied hoisted: ${relativePath}`);
                        }
                    }
                }

                console.log(`Copied ${allDeps.size} dependencies for active-win`);
            }

            if (process.platform === 'darwin') {
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
        new MakerZIP({}, ['darwin', 'win32']),
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
