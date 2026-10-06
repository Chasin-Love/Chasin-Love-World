/**
 * ROUND 106 — THE RAYMARCH POLICY gauntlet.
 *
 * A source audit found that live quality changes could silently overrule the
 * Studio switch: low quality forced Always On off, while changing quality
 * could turn an explicit Off back on. The same rules now govern attach,
 * quality changes, switch changes, and frame-budget recovery. This pins the
 * full safety/override table and verifies that production paths use it.
 */
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveRaymarchPolicy } from '../../src/engine/raymarchPolicy';
import * as THREE from 'three';
import { CameraRig } from '../../src/engine/cameraRig';
import { terminateProcessTree } from '../tools/process-tree';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (path: string) => readFileSync(`${ROOT}/${path}`, 'utf8');
let failures = 0;
type RaymarchPolicyInput = Parameters<typeof resolveRaymarchPolicy>[0];

function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
}

const base: RaymarchPolicyInput = {
  override: 'auto',
  tierCapable: true,
  softwareRenderer: false,
  disabledReason: null,
  stoodDown: false,
  activationReason: 'auto',
};

function expect(
  name: string,
  input: Partial<RaymarchPolicyInput>,
  expected: ReturnType<typeof resolveRaymarchPolicy>,
): void {
  const actual = resolveRaymarchPolicy({ ...base, ...input });
  check(name, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

expect('Auto runs when the capability probe allows it', {}, {
  enabled: true, state: 'active', reason: 'auto', clearStandDown: false,
});
expect('Auto stands down below its quality capability', { tierCapable: false }, {
  enabled: false, state: 'off', reason: 'tier-low', clearStandDown: false,
});
expect('Auto preserves a temporary frame-budget stand-down', { stoodDown: true }, {
  enabled: false, state: 'fallback', reason: 'frame-budget', clearStandDown: false,
});
expect('Always On bypasses low quality', { override: 'on', tierCapable: false, activationReason: 'override-on' }, {
  enabled: true, state: 'forced', reason: 'override-on', clearStandDown: false,
});
expect('Always On re-arms a temporary frame-budget stand-down', { override: 'on', stoodDown: true, activationReason: 'override-on' }, {
  enabled: true, state: 'forced', reason: 'override-on', clearStandDown: true,
});
expect('Always On never forces a software renderer', { override: 'on', softwareRenderer: true, activationReason: 'override-on' }, {
  enabled: false, state: 'off', reason: 'software-renderer', clearStandDown: false,
});
expect('shader failure disarms Auto', { disabledReason: 'shader-error' }, {
  enabled: false, state: 'fallback', reason: 'shader-error', clearStandDown: false,
});
expect('shader failure disarms Always On', { override: 'on', disabledReason: 'shader-error', activationReason: 'override-on' }, {
  enabled: false, state: 'fallback', reason: 'shader-error', clearStandDown: false,
});
expect('three breaker strikes remain a permanent safety disarm', { disabledReason: 'frame-budget-3-strikes' }, {
  enabled: false, state: 'fallback', reason: 'frame-budget-3-strikes', clearStandDown: false,
});
expect('Off remains authoritative even when another disarm is present', { override: 'off', disabledReason: 'shader-error' }, {
  enabled: false, state: 'off', reason: 'override-off', clearStandDown: false,
});

const engine = read('src/engine/engine.ts');
const subsystem = read('src/engine/blackhole/BlackHoleSystem.ts');
const tuningCard = read('src/ui/console/BlackHoleTuningCard.tsx');
const cameraRig = read('src/engine/cameraRig.ts');
const r63Probe = read('scripts/probes/round63-void-probe.ts');
const processTree = read('scripts/tools/process-tree.ts');
check('quality and override listeners resolve through the same production policy',
  engine.includes('applyRaymarchPolicy') && engine.includes('resolveRaymarchPolicy'),
  'engine event wiring has bypassed resolveRaymarchPolicy');
check('hole creation and breaker recovery resolve through the production policy',
  subsystem.includes('resolveRaymarchPolicy') && subsystem.includes("activationReason: 're-armed'"),
  'attach or recovery path has bypassed resolveRaymarchPolicy');
check('the Studio card names software-renderer degradation',
  tuningCard.includes("'software-renderer':"),
  'the UI cannot explain the software-renderer safety boundary');
check('camera memory writes require the camera to be fully settled',
  cameraRig.includes('get isSettled(): boolean') && cameraRig.includes('!this.pinching')
    && cameraRig.includes("'touchend', this.onTouchEnd")
    && cameraRig.includes("'touchcancel', this.onTouchEnd")
    && subsystem.includes('this.cosmicStage === \'web\' && this.rig.isSettled'),
  'idle-stage camera motion could still be checkpointed mid-dive');

const cameraListeners = new Map<string, EventListener>();
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { addEventListener() {}, removeEventListener() {} },
});
const canvas = {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (typeof listener === 'function') cameraListeners.set(type, listener);
  },
  removeEventListener() {},
} as unknown as HTMLCanvasElement;
const rig = new CameraRig(new THREE.PerspectiveCamera(), canvas);
rig.theta = rig.tTheta;
rig.phi = rig.tPhi;
rig.zoomT = rig.tZoomT;
const touch = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  const listener = cameraListeners.get(type);
  if (!listener) throw new Error(`CameraRig did not register ${type}`);
  listener({ touches } as unknown as TouchEvent);
};
try {
  const startsSettled = rig.isSettled;
  touch('touchstart', [{ clientX: 10, clientY: 10 }, { clientX: 30, clientY: 10 }]);
  const pinchBlocksCheckpoint = !rig.isSettled;
  touch('touchend', []);
  const touchEndReleasesCheckpoint = rig.isSettled;
  touch('touchstart', [{ clientX: 10, clientY: 10 }, { clientX: 30, clientY: 10 }]);
  touch('touchcancel', []);
  const touchCancelReleasesCheckpoint = rig.isSettled;
  check('pinch activity blocks camera checkpoints until touch end or cancellation',
    startsSettled && pinchBlocksCheckpoint && touchEndReleasesCheckpoint && touchCancelReleasesCheckpoint,
    `settled=${startsSettled}, blocked=${pinchBlocksCheckpoint}, end=${touchEndReleasesCheckpoint}, cancel=${touchCancelReleasesCheckpoint}`);
} finally {
  rig.dispose();
  if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
  else delete (globalThis as typeof globalThis & { window?: unknown }).window;
}
check('R63 runtime probe reads black-hole visuals from their extracted subsystem',
  r63Probe.includes('e.bhSys.blackHoles') && !r63Probe.includes('e.blackHoles'),
  'the probe still looks at the pre-R97 engine field and cannot observe a live lens');

const processCallers = [
  'scripts/smoke.ts',
  'scripts/prod-smoke.ts',
  'scripts/probes/debug-cloud.ts',
  'scripts/probes/round63-void-probe.ts',
  'scripts/probes/round92-live-check.ts',
  'scripts/probes/round95-steady-sky-live.ts',
  'scripts/probes/round101-frost-visual.ts',
  'scripts/probes/round102-independence-probe.ts',
  'scripts/probes/round103-bughunt-probe.ts',
  'scripts/probes/round103-gpu-lens-probe.ts',
  'scripts/probes/round103-lens-recheck.ts',
  'scripts/probes/round104-desktop-perf-probe.ts',
  'scripts/probes/round105-vanished-marble-probe.ts',
];
const processCleanupCovered = processCallers.every((path) => {
  const source = read(path);
  return source.includes('terminateProcessTree')
    && source.includes('await terminateProcessTree(')
    && source.includes("detached: process.platform !== 'win32'");
});
check('all spawned smoke/probe servers use isolated POSIX groups and awaited tree cleanup',
  processCleanupCovered, 'a child-process caller has no cross-platform tree cleanup');
check('the process-tree helper terminates the full Windows tree and POSIX process group',
  processTree.includes("'taskkill.exe'") && processTree.includes("'/T'")
    && processTree.includes('process.kill(-pid, \'SIGTERM\')')
    && processTree.includes('process.kill(-pid, \'SIGKILL\')'),
  'process-tree teardown lost an OS-specific branch');

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const pidIsAlive = (pid: number): boolean => {
  try { process.kill(pid, 0); return true; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'EPERM'; }
};
const waitUntilDead = async (pid: number, timeoutMs = 3_000): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && pidIsAlive(pid)) await delay(50);
  return !pidIsAlive(pid);
};

let spawnedRoot: ReturnType<typeof spawn> | null = null;
let spawnedGrandchildPid = 0;
let runtimeTreeCleanupPassed = false;
try {
  const rootSource = [
    'const { spawn } = require("node:child_process");',
    'const child = spawn(process.execPath, ["-e", "process.stdout.write(\'ready\'); setInterval(() => {}, 1000)"], { stdio: ["ignore", "pipe", "ignore"] });',
    'child.stdout.once("data", () => process.stdout.write(String(child.pid) + "\\n"));',
    'setInterval(() => {}, 1000);',
  ].join('\n');
  spawnedRoot = spawn(process.execPath, ['-e', rootSource], {
    stdio: ['ignore', 'pipe', 'ignore'],
    detached: process.platform !== 'win32',
  });
  const pidText = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('spawned process did not report its child pid')), 5_000);
    spawnedRoot?.stdout?.on('data', (chunk: Buffer) => {
      const match = String(chunk).match(/\d+/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[0]);
    });
    spawnedRoot?.once('error', (error) => { clearTimeout(timeout); reject(error); });
    spawnedRoot?.once('exit', (code) => {
      if (code !== null) { clearTimeout(timeout); reject(new Error(`spawned root exited early (${code})`)); }
    });
  });
  spawnedGrandchildPid = Number(pidText);
  const rootPid = spawnedRoot.pid;
  if (!rootPid || !Number.isInteger(spawnedGrandchildPid)) throw new Error('spawned process tree has invalid pids');
  /* Make the complete tree observable to taskkill before asking it to enumerate
     descendants. Reading a PID immediately after spawn() only proves allocation;
     Windows can still be publishing the child in its process tree. */
  await delay(100);
  await terminateProcessTree(spawnedRoot);
  const [rootDead, grandchildDead] = await Promise.all([waitUntilDead(rootPid), waitUntilDead(spawnedGrandchildPid)]);
  runtimeTreeCleanupPassed = rootDead && grandchildDead;
  if (!runtimeTreeCleanupPassed) console.log(`process-tree receipt: root dead=${rootDead}, grandchild dead=${grandchildDead}`);
} catch (error) {
  console.error(`process-tree runtime probe error: ${String(error)}`);
} finally {
  /* This is a disposable process tree created by the gauntlet. If the helper
     itself regresses, clean up these exact PIDs so the failing gate leaks none. */
  if (spawnedGrandchildPid && pidIsAlive(spawnedGrandchildPid)) {
    try { process.kill(spawnedGrandchildPid, 'SIGKILL'); } catch { /* already exited */ }
  }
  if (spawnedRoot?.pid && pidIsAlive(spawnedRoot.pid)) {
    try { process.kill(spawnedRoot.pid, 'SIGKILL'); } catch { /* already exited */ }
  }
}
check('runtime teardown kills a spawned grandchild with its server parent', runtimeTreeCleanupPassed,
  'one process from the disposable child tree survived shutdown');

console.log(failures ? `\nR106 RAYMARCH POLICY — ${failures} FAILURE(S)` : '\nR106 RAYMARCH POLICY — ALL GREEN');
if (failures) process.exitCode = 1;
