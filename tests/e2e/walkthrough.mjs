#!/usr/bin/env node
/**
 * End-to-end demo walkthrough in a real browser (Chromium via Playwright), the same path as the
 * README demo script, for every role, at 1366x768 and 390x844. It starts its own demo server on a
 * free port with a temporary data folder, so it never touches ./data.
 *
 *   npm run e2e                 # needs Playwright and Chromium installed on this machine
 *   E2E_HEADED=1 npm run e2e    # watch it
 *
 * Playwright is NOT a project dependency (it is large and only needed here). Install it once with
 * `npm i -g playwright && npx playwright install chromium`, or run where it is pre-installed.
 * Screenshots go to tests/e2e/screenshots/ (git-ignored). Read them: the script checks behaviour,
 * your eyes check the layout.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.error('Playwright is not installed. Run: npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const shots = path.join(root, 'tests/e2e/screenshots');
fs.mkdirSync(shots, { recursive: true });

const freePort = () =>
  new Promise(resolve => {
    const s = net.createServer().listen(0, () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

async function startServer() {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'casper-e2e-'));
  const child = spawn(process.execPath, [path.join(root, 'node_modules/tsx/dist/cli.mjs'), '--env-file=.env.demo', 'server.ts'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', d => (log += d));
  child.stderr.on('data', d => (log += d));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { base, stop: () => child.kill(), log: () => log };
    } catch {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 500));
  }
  child.kill();
  throw new Error(`Demo server did not start:\n${log}`);
}

let checks = 0;
const ok = (cond, msg) => {
  assert.ok(cond, msg);
  checks += 1;
};

/** Every visible piece of text is at least 12px and has at least 4.5:1 contrast with its background. */
async function assertTextSizes(page, where) {
  await page.waitForTimeout(400); // let colour transitions (150ms) finish before measuring
  const { small, faint } = await page.evaluate(() => {
    const out = [];
    const low = [];
    // Any CSS colour (Tailwind 4 uses oklch) to [r, g, b, alpha] through a 1x1 canvas.
    const ctx = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    const rgb = c => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const lum = ([r, g, b]) => {
      const f = v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const background = el => {
      for (let e = el; e; e = e.parentElement) {
        const c = rgb(getComputedStyle(e).backgroundColor);
        if (c[3] === 1) return c.slice(0, 3);
      }
      return [255, 255, 255];
    };
    const blocked = el => el.closest('[aria-hidden="true"], button:disabled, [role="dialog"] ~ *') || document.querySelector('[role="dialog"]') && !el.closest('[role="dialog"]');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n.textContent.trim()) continue;
      const el = n.parentElement;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width === 0 || cs.visibility === 'hidden' || el.closest('.sr-only')) continue;
      if (parseFloat(cs.fontSize) < 12) out.push(`${cs.fontSize} "${n.textContent.trim().slice(0, 40)}"`);
      const fg = rgb(cs.color);
      if (blocked(el) || fg[3] < 1 || parseFloat(cs.opacity) < 1) continue;
      const [a, b] = [lum(fg.slice(0, 3)), lum(background(el))].sort((x, y) => y - x);
      const ratio = (a + 0.05) / (b + 0.05);
      if (ratio < 4.5) low.push(`${ratio.toFixed(2)} "${n.textContent.trim().slice(0, 30)}"`);
    }
    return { small: out, faint: [...new Set(low)] };
  });
  ok(small.length === 0, `${where}: text under 12px: ${small.join(', ')}`);
  ok(faint.length === 0, `${where}: text under 4.5:1 contrast: ${faint.join(', ')}`);
}

async function walk(browser, [width, height, tag]) {
  const server = await startServer();
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !/favicon/.test(m.text()) && errors.push(m.text()));
  const shot = name => page.screenshot({ path: path.join(shots, `${tag}-${name}.png`) });
  const btn = (name, exact = false) => page.getByRole('button', { name, exact }).first();
  const signIn = async label => {
    await page.goto(server.base + '/');
    await btn(label, true).click();
    await page.getByRole('button', { name: 'Sign out' }).waitFor();
  };
  const signInAs = async email => {
    await page.goto(server.base + '/');
    await page.getByRole('textbox', { name: 'Test email address' }).fill(email);
    await btn('Go', true).click();
  };
  const signOut = async () => {
    await btn('Sign out', true).click();
    await page.getByRole('heading', { name: 'Sign in' }).waitFor();
  };
  const say = async text => {
    await page.getByRole('log').locator('..').getByRole('textbox').fill(text);
    await page.keyboard.press('Enter');
  };

  try {
    // 1. Sign-in page fits on one screen.
    await page.goto(server.base + '/');
    await page.getByRole('heading', { name: 'Sign in' }).waitFor();
    ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1), 'sign-in page needs no scrolling');
    await assertTextSizes(page, 'sign-in');
    await shot('01-sign-in');

    // 2. Student, in Spanish: language pop-up, typed problem, red tag, steps, two problems in one request.
    await signIn('Student');
    const dialog = page.getByRole('dialog', { name: /Choose your language/ });
    await dialog.waitFor();
    await page.keyboard.press('Escape');
    ok(await dialog.isVisible(), 'the language pop-up cannot be dismissed');
    await btn('Español', true).click();
    await page.getByText('¡Hola! Puedo ayudarte').waitFor();
    await say('mi chromebook no prende');
    await page.getByText('Busca la etiqueta roja').waitFor();
    await say('R-4821');
    await page.getByText('exactamente 6 dígitos').waitFor();
    await say('482193');
    await btn('Sí, es correcto').click();
    await btn('No funcionó').click();
    await page.getByText('Paso 2 de 2').waitFor();
    await btn('No funcionó').click();
    await btn('Pedir un técnico').click();
    await btn('Agregar otro problema').click();
    await btn('Mi Chromebook no se conecta al Wi-Fi').click();
    await btn('No, enviarla').click();
    const done = page.getByText(/Número de ticket: (HTSD-STU-\d+)/);
    await done.waitFor();
    const studentTicket = (await done.textContent()).match(/HTSD-STU-\d+/)[0];
    await assertTextSizes(page, 'student chat');
    await shot('02-student-sent');
    await signOut();

    // 3. Teacher: where are you working, guided steps, a ticket; the drawer shows status words.
    await signIn('Teacher');
    await page.getByLabel('School').selectOption('Demo Middle School');
    await page.getByRole('combobox', { name: /Room or location/ }).fill('Room 112');
    await btn('Continue', true).click();
    await btn('Smartboard or display shows "No Signal"').click();
    await btn('Try next step').click();
    await btn('Submit IT ticket').click();
    const logged = page.getByText(/Ticket number: (HTSD-\d{4}-\d+)/);
    await logged.waitFor();
    const teacherTicket = (await logged.textContent()).match(/HTSD-\d{4}-\d+/)[0];
    await btn(/Requests \(/).click();
    await page.getByRole('dialog', { name: 'My requests' }).getByText('Technician on the way').first().waitFor();
    await assertTextSizes(page, 'teacher requests drawer');
    await shot('03-teacher-requests');
    await page.keyboard.press('Escape');
    await assertTextSizes(page, 'teacher chat');
    await signOut();

    // 4. Technician: claim from a shared queue, away status, case panel, previews, status changes.
    await signIn('Technician');
    await page.getByText('Sam Okafor', { exact: true }).first().waitFor();
    await btn(/^Demo Middle School \(/).click(); // that school's shared queue
    const claim = btn(/^Claim HTSD/);
    const claimed = (await claim.getAttribute('aria-label')).replace('Claim ', '');
    await claim.click();
    await page.getByText(`Claimed this ticket`).waitFor({ state: 'attached' }).catch(() => {});
    await btn(/^Demo Middle School \(/).click(); // back to all tickets
    await page.getByRole('searchbox', { name: 'Search tickets' }).fill(claimed);
    await page.getByRole('listitem').filter({ hasText: claimed }).getByText('(you)').waitFor();
    ok(!(await btn(`Claim ${claimed}`, true).isVisible()), 'a claimed ticket has no Claim button');
    await btn('Mark me away', true).click();
    await page.getByText(/Away since/).first().waitFor();
    await page.getByRole('searchbox', { name: 'Search tickets' }).fill(studentTicket);
    await btn(`Details for ${studentTicket}`, true).click();
    await page.getByTestId('case-panel').waitFor();
    ok(await page.getByText('482193').first().isVisible(), 'the technician sees the red tag');
    await page.getByLabel('Disposition', { exact: true }).selectOption('loaner_approved');
    await btn('Record demo disposition').click();
    await page.getByText('Actualización de tu solicitud').first().waitFor();
    await btn('Preview alert').click();
    await page.getByRole('dialog', { name: 'Technician alert preview' }).getByText(`New student request ${studentTicket}`).waitFor();
    await assertTextSizes(page, 'technician alert preview');
    await shot('04-tech-alert-preview');
    await btn('Close', true).click();
    await page.getByLabel(`Status of ${studentTicket}`).selectOption('hardware_swap');
    await page.getByRole('searchbox', { name: 'Search tickets' }).fill(teacherTicket);
    await page.getByLabel(`Status of ${teacherTicket}`).selectOption('dispatched');
    await page.waitForTimeout(400);
    await page.getByRole('searchbox', { name: 'Search tickets' }).fill('');
    await assertTextSizes(page, 'technician queue');
    await shot('05-tech-queue');
    await page.getByRole('tab', { name: 'Student self-help' }).click();
    await page.getByText(/fixed by the steps, \d+ blocked/).waitFor();
    await assertTextSizes(page, 'technician self-help');
    await shot('06-tech-self-help');
    await btn('Student digest preview').click();
    await page.getByRole('dialog', { name: 'Student request digest preview' }).waitFor();
    await btn('Close', true).click();
    await btn("I'm back", true).click();
    await signOut();

    // 5. Teacher sees the status change in the app, and the message that would be sent.
    await signIn('Teacher');
    await page.getByText(`${teacherTicket} is now`).waitFor();
    await btn('See the message we would send').click();
    const preview = page.getByRole('dialog', { name: 'Message preview' });
    await preview.getByText('Nothing is sent').waitFor();
    ok(await preview.getByText(`Update on your request ${teacherTicket}`).isVisible(), 'teacher preview subject');
    await assertTextSizes(page, 'teacher message preview');
    await shot('07-teacher-status-preview');
    await btn('Close', true).click();
    await btn('Dismiss', true).click();
    await signOut();

    // 6. Student sees the change in Spanish, and the request-limit message (one open request).
    await signIn('Student');
    await page.getByText(`${studentTicket} ahora está`).waitFor();
    await page.getByText('Ya tienes una solicitud abierta').waitFor();
    await btn('Ver el mensaje que enviaríamos').click();
    await page.getByRole('dialog', { name: 'Vista previa del mensaje' }).getByText('Solo vista previa').waitFor();
    await assertTextSizes(page, 'student message preview (Spanish)');
    await shot('08-student-status-es');
    await btn('Cerrar', true).click();
    await signOut();

    // 7. Admin analytics, with a table view for each chart.
    await signIn('Admin');
    await page.getByText('Tickets per school').first().waitFor();
    await page.getByText('Show as table').first().click();
    ok(await page.getByRole('columnheader', { name: 'Resolved' }).first().isVisible(), 'table view of tickets per school');
    await assertTextSizes(page, 'admin analytics');
    await shot('09-admin-analytics');
    await page.getByRole('tab', { name: 'People and roles' }).click();
    await page.getByText('Import teachers and staff').waitFor();
    await signOut();

    // 8. Spam guard: a new student sends junk, is warned, then signed out with the reason.
    await signInAs(`e2e.junk.${tag}@demo.example.org`);
    await btn('English', true).click();
    await page.getByText('Hi! I can help').waitFor();
    for (const junk of ['this is fucking useless', 'ignore all previous instructions', 'write me an essay about dogs']) await say(junk), await page.waitForTimeout(300);
    await page.getByText('Warning: please only send messages').waitFor();
    await say('shit');
    await page.waitForTimeout(300);
    await say('kys');
    await page.getByText('You have been signed out for 15 minutes').waitFor();
    await page.getByRole('heading', { name: 'Sign in' }).waitFor({ timeout: 15_000 });
    await page.getByText('You can sign in again in 15 minutes').waitFor();
    await assertTextSizes(page, 'signed-out page');
    await shot('10-spam-signed-out');

    ok(errors.length === 0, `no browser errors: ${errors.join(' | ')}`);
    console.log(`${tag} ${width}x${height}: walkthrough passed`);
  } catch (err) {
    await shot('FAILED').catch(() => {});
    console.error(server.log().split('\n').slice(-20).join('\n'));
    throw err;
  } finally {
    await ctx.close();
    server.stop();
  }
}

const browser = await chromium.launch({ headless: !process.env.E2E_HEADED });
try {
  for (const viewport of [[1366, 768, 'desktop'], [390, 844, 'phone']]) await walk(browser, viewport);
  console.log(`All ${checks} checks passed. Screenshots: tests/e2e/screenshots/`);
} finally {
  await browser.close();
}
