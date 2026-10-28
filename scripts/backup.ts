import 'dotenv/config';
import fs from 'fs';
import path from 'path';

/**
 * Copies the JSON data files (tickets, users, cases) into a timestamped folder
 * and keeps the newest few. Run it from cron or a scheduled task, for example
 * `0 2 * * * cd /app && npm run backup`. Copy BACKUP_DIR off the machine too.
 */
const dataDir = process.env.DATA_DIR || './data';
const backupDir = process.env.BACKUP_DIR || './backups';
const keep = Math.max(1, Number(process.env.BACKUP_KEEP) || 14);

const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter(f => f.endsWith('.json')) : [];
if (files.length === 0) {
  console.error(`No .json files found in ${dataDir}; nothing to back up.`);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.join(backupDir, stamp);
fs.mkdirSync(dest, { recursive: true });
for (const f of files) fs.copyFileSync(path.join(dataDir, f), path.join(dest, f));
console.log(`Backed up ${files.length} file(s) to ${dest}`);

// Timestamps sort alphabetically, so the oldest folders come first.
const all = fs.readdirSync(backupDir).filter(d => /^\d{4}-\d{2}-\d{2}T/.test(d)).sort();
for (const old of all.slice(0, Math.max(0, all.length - keep))) {
  fs.rmSync(path.join(backupDir, old), { recursive: true, force: true });
}
