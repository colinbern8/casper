# Casper: School IT Help Desk

A web help desk for a school district. People sign in with their school Google account, describe a technology problem, try a few fixed troubleshooting steps, and if that does not fix it, send a ticket to a technician queue. Students chat in English or Spanish and give the number on their Chromebook's red tag. Teachers who report a class in session get Priority 1.

**Status: a demo-ready prototype, not a production system.** It runs start to finish in demo mode with fictional people and data. It has not been deployed, has not run on a managed Chromebook, and has not had a student-data privacy review. The [verification table](#what-has-and-has-not-been-verified) says exactly what was tested.

**No AI.** Every reply is fixed, reviewable text, and typed text is matched by plain keywords. **Nothing leaves the app**: messages to requesters and technicians are previews only (see [Known limits](#security-model-and-known-limits) for the one optional webhook and the web font).

- [Quick start](#quick-start)
- [Demo script](#demo-script)
- [What is real and what is simulated](#what-is-real-and-what-is-simulated)
- [What has and has not been verified](#what-has-and-has-not-been-verified)
- [How it works](#how-it-works)
- [Security model and known limits](#security-model-and-known-limits)
- [Deploying for real use](#deploying-for-real-use)
- [Contributing](#contributing)

Planning, decisions and the to-do list live in [TODO.md](TODO.md).

## Quick start

Requires Node 22 (see `.nvmrc`).

```bash
npm ci
```

```bash
npm run demo
```

Open http://localhost:3000. The sign-in page shows **Testing only** buttons for Student, Teacher, Technician and Admin, plus a box to sign in as any `@demo.example.org` address. Demo data is generated the first time the demo starts, in `./data-demo`. To start over:

```bash
npm run demo:reset
```

Demo mode and dev sign-in are for your own machine only. The server refuses to start with either on when `NODE_ENV=production`.

## Demo script

About 15 minutes. Everything below is fictional. Sign out with the button at the top right between steps. To repeat the student part, run `npm run demo:reset` first (a student can only have one open request).

**1. Student, in Spanish** (button: Student, Alex Sample)

1. A language pop-up appears first and must be answered (Esc and clicking outside do nothing). Choose **Español**.
2. Type `mi chromebook no prende`. Casper recognises "will not turn on" from the keywords.
3. Type a wrong red tag such as `R-4821` and see it refused, then `482193`. Casper repeats the name and number; tap **Sí, es correcto**.
4. Tap **No funcionó** on both steps, then **Pedir un técnico**. Tap **Agregar otro problema**, pick the Wi-Fi problem, then **No, enviarla**. One ticket lists both problems. Note its number (HTSD-STU-…).
5. Optional: **Cambiar idioma** reopens the pop-up and keeps the conversation.

**2. Teacher** (button: Teacher, Jamie Rivera)

1. Pick **Demo Middle School**, type `112` in the room box (it filters as you type), pick **Room 112**, then **Continue**.
2. Tap **Smartboard or display shows "No Signal"**, then **Try next step**, then **Submit IT ticket**. The ticket goes to Sam Okafor, the school's lead technician, as Priority 2.
3. Open **Requests** at the top: each request shows its status in plain words and a **Message preview**.

**3. Technician** (button: Technician, Sam Okafor)

1. The queue opens with a Priority 1 at the top. **Away: Leo Ortiz** shows that Yardville tickets are going to his backup.
2. Tap **Demo Middle School** under **Shared queues** to see that school's unclaimed tickets, then **Claim** one. It is now yours.
3. Tap **Mark me away**. Open **Who covers which school** to see leads and backups. New Demo Middle School staff tickets would now go to Priya Shah. Tap **I'm back** when done.
4. Search for the student's ticket number and open its details: both problems, the red tag, the steps tried, and the Spanish chat. Record the **Loaner approved** disposition and read the Spanish draft (marked as not sent). Tap **Preview alert** for the technician alert that would be sent.
5. Change the student ticket's status to **Hardware swap or loaner**, and the teacher's ticket to **Dispatched**.
6. **Student self-help** lists chats that ended without a ticket: fixed by the steps, or blocked at the request limit. **Student digest preview** shows the daily digest that would be sent.

**4. Teacher sees the update** (Teacher)

A notice says the ticket is now **Technician on the way**. **See the message we would send** shows the email, marked as not sent.

**5. Student sees the update** (Student)

The notice is in Spanish, and so is the message preview. Casper also says the student already has an open request: the quick fixes still work, but a new request cannot be sent until a technician resolves the open one or taps **Allow another request** on it.

**6. Admin analytics** (button: Admin, Dana Whitfield)

Four weeks of fictional data: tickets per school, time to resolve by priority, most common problems, and how many student chats were fixed by the steps with no ticket. Every chart has **Show as table**. **People and roles** is where admins add technicians and import a staff list.

**7. Spam guard** (optional)

Sign in with the box as a new student, for example `test.kid@demo.example.org`, choose English, and type junk such as `write me an essay about dogs` three times: Casper warns. Two more and the student is signed out for 15 minutes; the sign-in page says why, and signing in again is refused until the time is up. Taps, red tag digits and yes/no never count. Staff and technicians are never signed out.

## What is real and what is simulated

| Real in the prototype | Simulated or not built |
| --- | --- |
| Sign-in with roles enforced on the server; dev sign-in for demos | Real Google sign-in (code exists, tested only with a mock) |
| Tickets, priorities, routing, ticket numbers, request limit, spam guard, lockouts | Real campuses, rooms and technicians (`src/data/schools.ts` is placeholder data) |
| Fixed troubleshooting text in English and Spanish, keyword matching | Spanish quality (all Spanish awaits human review and says so) |
| Technician claim, away status and routing to a backup or shared queue | Per-building technician scoping (technicians see every school) |
| Status changes shown in the app | Any message actually sent: emails, digests and alerts are previews |
| Red tag recorded exactly as typed | Looking the red tag up in an inventory |
| Analytics computed from the stored tickets and chats | Real ticket history (the demo history is generated) |

## What has and has not been verified

"Verified" means an automated test and/or the real app driven in Chromium. Nothing has run with real students, district systems or devices.

| Area | Status | Evidence |
| --- | --- | --- |
| Type-check, build | Verified | `npm run lint` (strict), `npm run build`; CI runs both |
| Roles, tickets, technician updates, admin tools, cross-site and session protections | Verified | `tests/api.test.ts` |
| Student chat: both languages, typed and tapped, red tag, several problems, request limit, blocked and resolved cases | Verified | `tests/support.test.ts`, `tests/match.test.ts`, `tests/studentChat.test.ts`, e2e walkthrough |
| Language pop-up: required choice, focus kept inside, Esc and outside click do nothing, remembered per account, change keeps the conversation | Verified | `tests/profile.test.ts`, keyboard-only Chromium walk at both sizes |
| Spam guard: warn at 3, sign out at 5, 15-minute lockout, sign-in refused, students only | Verified | `tests/spamguard.test.ts` and `tests/api.test.ts` with a fake clock; e2e walkthrough |
| Shared common-problem list used by every chat and the server | Verified | `tests/commonProblems.test.ts` |
| Claim, away status, routing to backup or shared queue, self-help case list | Verified | `tests/coverage.test.ts`, e2e walkthrough |
| Status-change notices and message previews (English and Spanish), alert and digest previews | Verified | `tests/statusUpdates.test.ts`, e2e walkthrough |
| Admin analytics numbers | Verified | `tests/analytics.test.ts` (fixed data), e2e walkthrough |
| Every role, start to finish, at 1366x768 and 390x844: no browser errors, sign-in page fits without scrolling | Verified | `npm run e2e` (Chromium; needs Playwright installed, so it does not run in CI) |
| Text at least 12px and at least 4.5:1 contrast | Verified on the screens the walkthrough measures: sign-in, student chat, teacher chat and requests, technician queue, self-help and previews, admin analytics, signed-out page, at both sizes. Other screens (admin people list, dispatch slip) not measured | `npm run e2e` |
| Data survives a restart; bad or wrong-shape data files are kept aside, not overwritten | Verified | `tests/units.test.ts`, `tests/support.test.ts` |
| Production refuses to start with `DEV_LOGIN` or `DEMO_MODE` on | Verified | `tests/units.test.ts`, `tests/identity.test.ts` |
| Real Google sign-in, HTTPS, the `Secure` cookie, `TRUST_PROXY` | **Not tested** | |
| Slack/Teams webhook | **Not tested live** (stubbed `fetch` in tests) | |
| Printing a dispatch slip or loaner pass | **Not tested** (renders on screen) | |
| Managed Chromebooks, the district web filter, screen readers | **Not tested** | |
| Screens narrower than 390px | Not checked; the sign-in page scrolls a little at 360x740 | |
| Load and scale | **Not tested** (JSON files, polling every 20 to 30 seconds) | |
| Spanish text quality | **Awaiting human review** | |

## How it works

```
Browser (React 19 + Vite + Tailwind 4)        Server (Express + TypeScript, run with tsx)
  /student  /teacher  /tech  /admin   ----->   /api/*  sign-in, tickets, chat, support, techs, admin
  Google sign-in (or dev sign-in)               signed session cookie; role looked up on every request
                                                rate limits and spam guard (in memory)
                                                +--> DATA_DIR: tickets.json, cases.json, users.json, presence.json
                                                +--> optional Slack/Teams webhook (off unless set)
```

- **Server is in charge** of identity, role, priority, routing, ticket numbers and lockouts. The request body never sets them.
- **Storage:** JSON files in `DATA_DIR`, written atomically (temp file, flush, rename). One instance only.
- **Sessions:** a signed HttpOnly cookie holding who the person is; the role is looked up each time. A locked-out student's cookie is refused in `attachUser`, because a signed cookie cannot be revoked.
- **Limits** are in one place: `LIMITS` in `server/config.ts` and `src/data/limits.ts`.

### Project layout

```
server.ts                      entry: config, stores, demo seed, Vite (dev) or dist/ (production)
server/app.ts                  routes: sign-in, tickets, claim, techs, chat, admin, analytics
server/supportRoutes.ts        student chat API (demo mode): cases, red tag, steps, message screening
server/spamGuard.ts            strike counter and lockouts (students only)
server/presence.ts             who is away;  server/analytics.ts  admin numbers
server/store.ts, cases.ts, users.ts, jsonFile.ts   JSON stores
server/demoData.ts             fictional demo history (fixed seed)
src/App.tsx                    pages by role, polling, status notices
src/components/chat/           the chat frame, bubbles, choices and input every chat uses
src/components/student/        student chat, language pop-up
src/components/tech/           queue rows, filters, coverage, self-help cases
src/components/admin/          analytics
src/data/commonProblems.ts     the tappable common problems, one list for every chat
src/data/supportContent.ts     student troubleshooting steps (English and Spanish)
src/data/supportMatch.ts       student keyword matching;  staffFlows.ts  staff steps and keywords
src/data/messagePreviews.ts    the messages that would be sent (previews only)
src/data/schools.ts            campuses, rooms, technicians (PLACEHOLDER data)
src/i18n/studentStrings.ts     student-facing text, English and Spanish
tests/                         node:test suites;  tests/e2e/  browser walkthrough
```

### Commands

| Command | What it does |
| --- | --- |
| `npm run demo` | Demo mode with fictional data in `./data-demo` |
| `npm run demo:reset` | Delete the demo data (the next start re-seeds it) |
| `npm run dev` | Development server using your `.env` |
| `npm run lint` | Type-check (`tsc --noEmit`, strict) |
| `npm test` | All unit and API tests |
| `npm run e2e` | Browser walkthrough of every role (needs Playwright and Chromium) |
| `npm run build`, `npm start` | Build the client; run in production mode |
| `npm run backup` | Copy `DATA_DIR/*.json` to a timestamped folder |

### Configuration

All settings are described in `.env.example`: `DISTRICT_DOMAIN`, `DISTRICT_NAME`, `TICKET_PREFIX`, `GOOGLE_CLIENT_ID`, `SESSION_SECRET`, `ADMIN_EMAILS` (the last three required in production), `STUDENT_OPEN_TICKET_LIMIT`, `DATA_DIR`, `PORT`, `TRUST_PROXY`, `NOTIFY_WEBHOOK_URL`, and the development-only `DEV_LOGIN` and `DEMO_MODE`.

## Security model and known limits

| Area | What the prototype does |
| --- | --- |
| Identity | Verifies the Google token; only verified accounts in the Workspace domain (mock-tested only) |
| Roles | Looked up on every request; students are the default; admins in `ADMIN_EMAILS` cannot be removed in the app |
| Tickets | Name, email, role, priority, routing and number come from the server; claims use the signed-in name |
| Sessions | Signed HttpOnly SameSite=Lax cookie, 8 hours; cross-site writes refused |
| Abuse | Request limit per student; ticket, chat and sign-in rate limits; abuse and off-topic screen; spam guard for students (3 warns, 5 signs out for 15 minutes) |
| Chat text | Screened and forgotten. Never stored, except a student's "something else" description, which becomes part of the ticket. The spam guard keeps only a hash of the last message, in memory |

**Known limits**

- Rate limits, strikes and lockouts are in memory: a restart clears them.
- A session lasts 8 hours even if the Google account is disabled. Removing a role applies at once.
- Technicians see every school's tickets; per-building scoping is not built.
- "Class in session" is self-reported.
- Student names, rooms and red tags are stored in tickets. Review FERPA and COPPA before real data.
- Status-change notices are remembered per browser; a person on a new device sees no past notices.
- Changing language mid-chat changes what the student sees; the case keeps the language it started in, so the technician's draft uses that language.
- A student with no red tag cannot send a request (district decision pending).
- **Outside requests:** the page loads the Fraunces font from Google Fonts, and Google's sign-in script when sign-in is configured. No user data is sent with them, but they do reach Google. The optional Slack/Teams webhook (off unless `NOTIFY_WEBHOOK_URL` is set) sends Priority 1 and 2 staff tickets, never student tickets.
- Two placeholder campus names match real Hamilton Township schools; every person, room and ticket is fictional.

## Deploying for real use

Not before the district items in [TODO.md section 4](TODO.md#4-waiting-on-the-district) are answered and the privacy review is done.

1. Set `DISTRICT_DOMAIN`, `GOOGLE_CLIENT_ID` (a district-owned Google Cloud project, Web application client, your site under Authorized JavaScript origins), `SESSION_SECRET` and `ADMIN_EMAILS` (two or more people).
2. Serve over HTTPS; set `TRUST_PROXY=1` behind a load balancer.
3. Put `DATA_DIR` on a persistent disk, run a single instance, schedule `npm run backup`, and point monitoring at `/api/health`.
4. Replace the placeholder data in `src/data/schools.ts`.
5. Leave `DEV_LOGIN` and `DEMO_MODE` off (the server refuses to start otherwise).
6. `npm run build && npm start`, then sign in as an admin, import the staff list and add technicians.

## Contributing

- Branch from `master`, keep commits small, open a pull request; CI runs lint, tests and build.
- Before pushing: `npm run lint && npm test && npm run build`. For screen changes, also `npm run e2e` and read the screenshots.
- Fictional data only. Never commit real student information or secrets.
- New student-facing text goes in both English and Spanish; a test checks the two match.
