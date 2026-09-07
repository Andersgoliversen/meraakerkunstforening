const { watch } = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');
let timer;
let building = false;
let pending = false;
function run(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Build exited ${code}`)));
  });
}
async function build() {
  if (building) { pending = true; return; }
  building = true;
  try {
    await run(path.join(__dirname, 'build.cjs'));
    await run(require.resolve('tailwindcss/lib/cli.js'), ['-i', 'input.css', '-o', 'style.css', '--minify']);
    await run(path.join(__dirname, 'build.cjs'), ['--pages-only']);
  } catch (error) { console.error(error); }
  finally { building = false; if (pending) { pending = false; build(); } }
}
function schedule() { clearTimeout(timer); timer = setTimeout(build, 200); }
watch('src', { recursive: true }, schedule);
for (const file of ['input.css', 'tailwind.config.js', 'main.js']) watch(file, schedule);
watch('images', (event, file) => { if (file && !String(file).startsWith('optimized')) schedule(); });
build();
console.log('Watching source pages, layout, scripts, styles and original images.');
