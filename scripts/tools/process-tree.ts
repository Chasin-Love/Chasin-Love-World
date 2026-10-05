import { spawnSync, type ChildProcess } from 'node:child_process';

const TERMINATION_GRACE_MS = 1_000;

/**
 * Stop a helper process and every child it started.
 *
 * POSIX callers must spawn the process with `detached: true` so its PID is
 * also the process-group ID. Windows uses taskkill's native tree operation.
 */
export async function terminateProcessTree(child: ChildProcess | null | undefined): Promise<void> {
  const pid = child?.pid;
  if (!pid) return;

  if (process.platform === 'win32') {
    const result = spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
      timeout: 5_000,
    });
    if (result.error || result.status !== 0) {
      /* If tree enumeration is denied or taskkill itself is unavailable, do
         not leave the direct server wrapper running. The caller still uses a
         detached process group on POSIX, where the full descendant fallback
         is available without Windows process-tree privileges. */
      try { child?.kill('SIGTERM'); } catch { /* already exited */ }
    }
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try { child?.kill('SIGTERM'); } catch { /* already exited */ }
    return;
  }

  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, TERMINATION_GRACE_MS);
    child?.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });

  /* The shell can exit before a descendant does. Reap anything left in the
     isolated group; a missing group means the whole tree has already exited. */
  try { process.kill(-pid, 'SIGKILL'); } catch { /* group already exited */ }
}
