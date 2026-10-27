import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

export interface Config {
  port: number;
  isProduction: boolean;
  /** Everyone must sign in with a Google Workspace account in this domain. */
  domain: string;
  /** Shown in headers and printed slips. */
  districtName: string;
  /** Starts every ticket number, e.g. HTSD-2026-0001. */
  ticketPrefix: string;
  googleClientId?: string;
  /** Always admins; cannot be removed in the app. The way the first admin gets in. */
  adminEmails: string[];
  /** Development-only sign-in without Google. Refused in production. */
  devLogin: boolean;
  sessionSecret: string;
  demoMode: boolean;
  dataDir: string;
  notifyWebhookUrl?: string;
  trustProxy: number | false;
  /** Unresolved requests one student may have at once. A technician can allow another. */
  studentOpenTicketLimit: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const isProduction = env.NODE_ENV === 'production';
  const devLogin = env.DEV_LOGIN === 'true';
  const adminEmails = (env.ADMIN_EMAILS || '')
    .split(/[,\s]+/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (isProduction) {
    if (devLogin) throw new Error('DEV_LOGIN must not be enabled when NODE_ENV=production.');
    if (env.DEMO_MODE === 'true') throw new Error('DEMO_MODE must not be enabled when NODE_ENV=production.');
    if (!env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is required when NODE_ENV=production.');
    if (!env.SESSION_SECRET) throw new Error('SESSION_SECRET is required when NODE_ENV=production (use a long random string).');
    if (adminEmails.length === 0) throw new Error('ADMIN_EMAILS is required when NODE_ENV=production (at least one admin).');
  }

  const prefix = (env.TICKET_PREFIX || 'HTSD').trim().toUpperCase();
  if (!/^[A-Z0-9]{2,8}$/.test(prefix)) throw new Error('TICKET_PREFIX must be 2 to 8 letters or digits.');

  const openLimit = env.STUDENT_OPEN_TICKET_LIMIT?.trim() ? Number(env.STUDENT_OPEN_TICKET_LIMIT) : 1;
  if (!Number.isInteger(openLimit) || openLimit < 1 || openLimit > 10) {
    throw new Error('STUDENT_OPEN_TICKET_LIMIT must be a whole number from 1 to 10.');
  }

  const trust = Number(env.TRUST_PROXY);

  return {
    port: Number(env.PORT) || 3000,
    isProduction,
    domain: (env.DISTRICT_DOMAIN || 'htsdnj.org').trim().toLowerCase(),
    districtName: env.DISTRICT_NAME?.trim().slice(0, 80) || 'Hamilton Township School District',
    ticketPrefix: prefix,
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() || undefined,
    adminEmails,
    devLogin,
    // Dev only: a random per-boot secret just means everyone is signed out on restart.
    sessionSecret: env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    demoMode: env.DEMO_MODE === 'true',
    dataDir: env.DATA_DIR || './data',
    notifyWebhookUrl: env.NOTIFY_WEBHOOK_URL?.trim() || undefined,
    trustProxy: Number.isInteger(trust) && trust > 0 ? trust : false,
    studentOpenTicketLimit: openLimit,
  };
}
