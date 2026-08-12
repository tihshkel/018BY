/**
 * Cross-platform env runner for album generators.
 * Usage: node scripts/run-with-env.js ONLY_ALBUM=diary ./scripts/generate-line-slots.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const envAssigns = [];
let scriptIdx = -1;
for (let i = 0; i < args.length; i++) {
  if (args[i].includes('=') && !args[i].endsWith('.js') && !args[i].endsWith('.mjs')) {
    envAssigns.push(args[i]);
  } else {
    scriptIdx = i;
    break;
  }
}
if (scriptIdx < 0) {
  console.error('Usage: node scripts/run-with-env.js KEY=val ./scripts/target.js');
  process.exit(1);
}

const env = { ...process.env };
for (const a of envAssigns) {
  const eq = a.indexOf('=');
  env[a.slice(0, eq)] = a.slice(eq + 1);
}

const script = path.resolve(args[scriptIdx]);
const scriptArgs = args.slice(scriptIdx + 1);
const result = spawnSync(process.execPath, [script, ...scriptArgs], {
  stdio: 'inherit',
  env,
  cwd: path.join(__dirname, '..'),
});
process.exit(result.status ?? 1);
