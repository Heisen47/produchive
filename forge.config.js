// Platform-specific makers: loaded conditionally so the config works on both macOS and Windows.
// maker-dmg has native macOS deps that can't install on Windows, and vice versa.
let MakerWix, MakerDMG, MakerNsis;
try { ({ MakerWix } = require('@electron-forge/maker-wix')); } catch {}
try { ({ MakerDMG } = require('@electron-forge/maker-dmg')); } catch {}
try { ({ MakerNsis } = require('electron-forge-maker-nsis')); } catch {}
// const { MakerMSIX } = require('@electron-forge/maker-msix');
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

// Add local WiX binaries to PATH (downloaded to .wix/ for non-admin installs)
const localWixPath = path.join(__dirname, '.wix');
if (fs.existsSync(localWixPath)) {
    process.env.PATH = `${localWixPath};${process.env.PATH}`;
}

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
            './resources/trayIconTemplate.png',
            './resources/trayIconTemplate@2x.png',
            './node_modules/active-win',
        ],
    },
    rebuildConfig: {},
    hooks: {
        prePackage: async () => {
            // Generate a self-signed dev certificate for local MSIX builds.
            // When submitting to the Microsoft Store, Microsoft re-signs the package
            // for free — so this cert is only needed for local sideload testing.
            if (process.platform === 'win32') {
                const certFile = path.join(process.cwd(), 'dev-cert.pfx');
                if (!fs.existsSync(certFile) && !process.env.CI) {
                    console.log('Generating self-signed dev certificate for MSIX...');
                    try {
                        execSync(
                            `powershell -Command "$cert = New-SelfSignedCertificate -Type Custom -Subject 'CN=Rishi' -KeyUsage DigitalSignature -FriendlyName 'Produchive Dev Cert' -CertStoreLocation 'Cert:\\CurrentUser\\My' -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.3', '2.5.29.19={text}'); $pwd = ConvertTo-SecureString -String 'devpass123' -Force -AsPlainText; Export-PfxCertificate -Cert $cert -FilePath '${certFile}' -Password $pwd"`,
                            { stdio: 'inherit' }
                        );
                        console.log('Dev certificate generated: dev-cert.pfx');
                    } catch (e) {
                        console.warn('Could not generate dev cert (may need to run as Administrator once):', e.message);
                    }
                }

                // Pass the certificate file and password to the MSIX maker only if it exists
                if (fs.existsSync(certFile)) {
                    process.env.WINDOWS_CERTIFICATE_FILE = certFile;
                    process.env.WINDOWS_CERTIFICATE_PASSWORD = 'devpass123';
                }
            }
        },
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
        // ─── Windows: NSIS (.exe) ── traditional installer wizard
        ...(MakerNsis ? [new MakerNsis({
            oneClick: false,
            allowToChangeInstallationDirectory: true,
            setupIcon: './resources/icon.ico',
        })] : []),
        // ─── Windows: WiX MSI (.exe) ── traditional installer with directory picker
        ...(MakerWix ? [new MakerWix({
            icon: './resources/icon.ico',
            manufacturer: 'Rishi',
            ui: {
                chooseDirectory: true,
            },
        })] : []),
        // ─── Microsoft Store / MSIX ───────────────────────────────────────────
        // Before submitting to the Store:
        //   1. Create a free Microsoft Partner Center account at https://partner.microsoft.com
        //   2. Reserve your app name → copy the Identity Name + Publisher CN shown there
        //   3. Replace the two placeholder values below with your real Partner Center values
        //   4. Remove the windowsSignOptions block (Microsoft re-signs the package for free)
        //   5. Run: npm run make -- --targets @electron-forge/maker-msix
        // new MakerMSIX({
        //     manifestVariables: {
        //         identityName: 'PLACEHOLDER.Produchive', // ← replace with Partner Center Identity Name
        //         publisher: 'CN=Rishi',                  // ← replace with Partner Center Publisher CN
        //         publisherDisplayName: 'Rishi',
        //     },
        //     // electron-windows-msix fails to read windowsSignOptions from the Forge config directly
        //     // due to a bug, so we pass sign: true and use environment variables instead.
        //     sign: !process.env.CI,
        // }),
        // ─── macOS: DMG (.dmg) ────────────────────────────────────────────────
        ...(MakerDMG ? [new MakerDMG({
            icon: './resources/icon.icns',
            name: 'Produchive'
        })] : []),
        // ─── Cross-platform ───────────────────────────────────────────────────
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
    publishers: [
        {
            name: '@electron-forge/publisher-github',
            config: {
                repository: {
                    owner: 'Heisen47',
                    name: 'produchive'
                },
                prerelease: false,
                draft: true // We'll make it a draft first so they can verify before publishing
            }
        }
    ]
};

module.exports = config;