import fs from 'fs';
import path from 'path';

/**
 * Reads a JSON data file. A file that is not valid JSON, or is JSON of the wrong shape, is
 * moved aside (never overwritten) so a person can inspect it, and `undefined` is returned so
 * the store starts empty. A missing file also returns `undefined`.
 */
export function readJsonFile<T>(file: string | null, isValid: (value: unknown) => value is T, label: string): T | undefined {
  if (!file || !fs.existsSync(file)) return undefined;
  let reason: unknown;
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (isValid(parsed)) return parsed;
    reason = new Error('unexpected shape');
  } catch (err) {
    reason = err;
  }
  const backup = `${file}.corrupt-${Date.now()}`;
  fs.renameSync(file, backup);
  console.error(`${label} file was unreadable; moved to ${backup}. Starting empty.`, reason);
  return undefined;
}

/**
 * Writes a data file atomically: a temporary file is written and flushed to disk, then renamed
 * over the old one, so a crash leaves either the old or the new file, never half of one.
 * `null` means an in-memory store and writes nothing.
 */
export function writeJsonFile(file: string | null, data: unknown): void {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, JSON.stringify(data, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
