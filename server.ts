import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { loadConfig } from './server/config';
import { createApp } from './server/app';
import { UserStore } from './server/users';
import { createGoogleVerifier } from './server/google';
import { TicketStore } from './server/store';
import { CaseStore } from './server/cases';
import { seedDemoTickets, seedDemoUsers } from './server/demoData';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = loadConfig();

  fs.mkdirSync(config.dataDir, { recursive: true });
  const store = new TicketStore(path.join(config.dataDir, 'tickets.json'), config.ticketPrefix);
  const cases = new CaseStore(path.join(config.dataDir, 'cases.json'));
  const users = new UserStore(path.join(config.dataDir, 'users.json'), config.adminEmails);
  if (config.demoMode) {
    seedDemoTickets(store, config);
    seedDemoUsers(users, config);
  }
  const verifyGoogle = config.googleClientId ? createGoogleVerifier(config.googleClientId) : undefined;
  const app = createApp({ config, store, users, verifyGoogle, cases });

  if (!config.googleClientId && !config.devLogin) console.warn('Neither GOOGLE_CLIENT_ID nor DEV_LOGIN is set: nobody can sign in.');
  if (config.devLogin) console.warn('DEV_LOGIN is on: anyone can sign in as any district address. Development only.');
  if (config.adminEmails.length === 0) console.warn('ADMIN_EMAILS not set: nobody can reach the admin page.');

  if (!config.isProduction) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve(__dirname, 'dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Greg Bot help desk running on http://0.0.0.0:${config.port} (${config.isProduction ? 'production' : 'development'})`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
