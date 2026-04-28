/**
 * file-lock.ts — Tiny synchronous file-based mutex.
 *
 * Why: pool-state.json and text-pool-state.json are read-modify-write JSON
 * files. Two `new-demo.ts` / API processes running concurrently can read the
 * same available image, both flip it to in-use, and the second writer wins —
 * silently overwriting the first allocation. Result: two clients share the
 * same hero photo. This module prevents that.
 *
 * How: O_CREAT | O_EXCL on a sibling .lock file is atomic on every OS we
 * care about (POSIX + Windows NTFS). Whoever creates the lock file wins,
 * others spin with backoff until it's released.
 *
 * The lock is held only across one read-modify-write transaction (microseconds
 * for our 14-image pool), so contention is negligible. A stale lock from a
 * crashed process is force-broken after `staleMs` to avoid permanent jams.
 */
import fs   from 'fs';
import path from 'path';

export interface LockOptions {
  /** ms to wait between retries */     retryMs?:  number;
  /** total ms to wait before giving up */ timeoutMs?: number;
  /** ms after which a lock is considered stale and force-removed */ staleMs?: number;
}

const DEFAULTS: Required<LockOptions> = {
  retryMs:   25,
  timeoutMs: 5_000,
  staleMs:   30_000,
};

function lockPath(target: string): string {
  return target + '.lock';
}

function sleepSync(ms: number): void {
  // Atomics.wait on a fresh SAB blocks the thread for exactly `ms` without
  // burning CPU. Works in any modern Node.
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

function tryAcquire(lock: string): boolean {
  try {
    const fd = fs.openSync(lock, 'wx');
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
    return true;
  } catch (e: any) {
    if (e.code === 'EEXIST') return false;
    throw e;
  }
}

function breakStaleLock(lock: string, staleMs: number): void {
  try {
    const stat = fs.statSync(lock);
    if (Date.now() - stat.mtimeMs > staleMs) {
      fs.unlinkSync(lock);
    }
  } catch {
    // lock vanished between stat and unlink — fine.
  }
}

/**
 * Run `fn` while holding an exclusive lock on `targetPath`.
 * The lock file lives at `${targetPath}.lock`.
 */
export function withFileLock<T>(targetPath: string, fn: () => T, opts: LockOptions = {}): T {
  const { retryMs, timeoutMs, staleMs } = { ...DEFAULTS, ...opts };
  const lock  = lockPath(targetPath);
  const start = Date.now();

  // Ensure parent dir exists so openSync('wx') doesn't ENOENT
  fs.mkdirSync(path.dirname(lock), { recursive: true });

  while (!tryAcquire(lock)) {
    if (Date.now() - start > timeoutMs) {
      breakStaleLock(lock, staleMs);
      if (!tryAcquire(lock)) {
        throw new Error(
          `[file-lock] Timed out after ${timeoutMs}ms waiting for ${lock}.\n` +
          `  Holder pid (if readable): ${safeRead(lock)}\n` +
          `  If you're sure no other process is running, delete the lock file manually.`,
        );
      }
      break;
    }
    sleepSync(retryMs);
  }

  try {
    return fn();
  } finally {
    try { fs.unlinkSync(lock); } catch { /* already gone */ }
  }
}

function safeRead(p: string): string {
  try { return fs.readFileSync(p, 'utf-8').trim(); } catch { return '?'; }
}
