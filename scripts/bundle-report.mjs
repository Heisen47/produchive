// Renderer bundle-size report.
// Builds the renderer in memory (nothing is written to disk) and prints:
//   1. every output file with raw + gzip size
//   2. the heaviest npm packages / source folders by rendered size
// Usage: npm run perf:bundle  (optionally: npm run perf:bundle -- --top 40)

import { build } from 'vite';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const topArg = process.argv.indexOf('--top');
const TOP = topArg !== -1 ? Number(process.argv[topArg + 1]) || 25 : 25;

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`.padStart(11);

// Group a module id into its npm package (node_modules/@scope/name) or src folder.
const groupFor = (id) => {
    const clean = id.replace(/^\0/, '').split('?')[0];
    const nm = clean.lastIndexOf('node_modules/');
    if (nm !== -1) {
        const parts = clean.slice(nm + 'node_modules/'.length).split('/');
        return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
    }
    const rel = path.relative(process.cwd(), clean);
    return rel.startsWith('..') ? clean : `(app) ${path.dirname(rel)}`;
};

const result = await build({
    configFile: 'vite.renderer.config.mjs',
    logLevel: 'error',
    build: { write: false },
});

const outputs = (Array.isArray(result) ? result : [result]).flatMap((r) => r.output);

let totalRaw = 0;
let totalGzip = 0;
const groups = new Map();
const rows = [];

for (const file of outputs) {
    const content = file.type === 'chunk' ? file.code : file.source;
    const raw = Buffer.byteLength(content);
    const gzip = gzipSync(content).length;
    totalRaw += raw;
    totalGzip += gzip;
    rows.push({ name: file.fileName, raw, gzip });

    if (file.type === 'chunk' && file.modules) {
        for (const [id, mod] of Object.entries(file.modules)) {
            const g = groupFor(id);
            groups.set(g, (groups.get(g) ?? 0) + (mod.renderedLength ?? 0));
        }
    }
}

rows.sort((a, b) => b.raw - a.raw);
console.log('\nOutput files');
console.log(`${'raw'.padStart(11)} ${'gzip'.padStart(11)}  file`);
for (const r of rows) console.log(`${kb(r.raw)} ${kb(r.gzip)}  ${r.name}`);
console.log(`${kb(totalRaw)} ${kb(totalGzip)}  TOTAL (${rows.length} files)`);

if (groups.size) {
    const sorted = [...groups.entries()].sort((a, b) => b[1] - a[1]);
    const jsTotal = sorted.reduce((sum, [, size]) => sum + size, 0);
    console.log(`\nTop ${Math.min(TOP, sorted.length)} contributors to JS (rendered, pre-gzip)`);
    for (const [name, size] of sorted.slice(0, TOP)) {
        console.log(`${kb(size)} ${((size / jsTotal) * 100).toFixed(1).padStart(5)}%  ${name}`);
    }
} else {
    console.log('\n(Per-module breakdown unavailable from this bundler version.)');
}
