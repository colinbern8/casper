# Greg Bot: School IT Help Desk

A web-based IT help desk prototype for a school district. People sign in with their school Google account, describe a technology problem, get guided troubleshooting, and, if that does not fix it, open a ticket that lands in a technician queue. Teachers who report a class in session are prioritized, and students get a separate loaner-device path.

**Status: working prototype, not a production system.** It has not been deployed, has not run on a managed Chromebook, and has not been reviewed for student-data privacy. The [verification table](#what-has-and-has-not-been-verified) lists exactly what was tested and what was not.

- [Overview](#overview)
- [Bilingual student-support demo](#bilingual-student-support-demo)
- [Run it locally](#run-it-locally)
- [What has and has not been verified](#what-has-and-has-not-been-verified)
- [How it works](#how-it-works)
- [Security model and known limits](#security-model-and-known-limits)
- [Deploying for real use](#deploying-for-real-use)
- [Contributing](#contributing)
- [Roadmap](#roadmap)

## Overview

### Who uses it

Everyone signs in with a school Google Workspace account. The role decides the page.

| Role | Lands on | Can open | Can do |
| --- | --- | --- | --- |
| Student (the default for anyone in the domain) | `/student` | `/student` | Get troubleshooting, request a loaner device, see their own requests |
| Teacher / staff | `/teacher` | `/teacher` | The same, plus mark a class as in session for priority |
| Technician | `/tech` | `/tech`, `/teacher`, `/student` | See and work every ticket: status, assignment, notes, printable slip |
| Admin | `/admin` | everything | Everything above, plus manage who is a technician or admin and import staff lists |

Pages are enforced on the server, not only hidden. A student who types `/tech` is sent back to `/student`, and the technician and admin APIs return 403 to them.

**Everyone in the domain is a student unless listed.** The app cannot tell a student from a teacher by email, so staff are an explicit list that an admin imports. A teacher who is missing from the list gets the student experience, which is the safe direction to be wrong.

### The main flows

1. **Teacher or staff.** Pick a school and room, describe the problem, follow guided steps (power, Wi-Fi, classroom display, audio, copier badge, account sign-in), then submit a ticket. A teacher who says a class is in session gets Priority 1, and a planning-period teacher gets Priority 2.
2. **Student.** Same idea, but an unresolved problem becomes a loaner request routed to a Media Center desk.
3. **Technician.** A live queue with search and filters, status changes, reassignment, timestamped notes, and a printable dispatch slip or loaner pass.
4. **Admin.** Manage roles and import a staff list.

Identity, role, priority, routing, and ticket numbers always come from the server, never from the request body.

### What it deliberately does not do

- **It contains no AI.** Every troubleshooting step and every chat answer is fixed text written by people, so replies are predictable and reviewable, and nothing a person types goes to a language model. This was a deliberate decision: a paid model is not financially realistic for roughly 14,000 accounts, and a free tier is not appropriate for student data.
- **It sends nothing outside the app** except an optional Slack/Teams webhook for urgent staff tickets, which is off unless `NOTIFY_WEBHOOK_URL` is set and never carries student tickets. Free-text chat questions are answered on the server by keyword matching.
- **It does not connect to any district system** (no inventory, no student information system, no directory).

## Bilingual student-support demo

A prototype of a student-support workflow in English and Spanish. It is available only when `DEMO_MODE=true`, uses fictional data, and has no AI. With demo mode off, its routes return 404 and `/student` shows the original chat.

**The flow:** pick English or Spanish, pick an issue (Wi-Fi, will not turn on, sign-in, damaged), optionally enter a Chromebook tag for a **simulated** assignment check, follow fixed troubleshooting steps, then either finish as fixed or ask for a technician. Escalating creates an ordinary ticket. The technician then sees the case: language, the student's own words, the simulated check, the steps tried, a **demo** disposition, an **unsent** draft message, and a short decision history.

**Demo accounts** (the sign-in panel appears when `DEV_LOGIN=true`):

| Button | Fictional student | Assigned tag |
| --- | --- | --- |
| Student | Alex Sample | `DEMO-CB-1001` |
| Student (Spanish) | Sofía Muestra | `DEMO-CB-1002` |
| Student 2 | Jordan Sample | `DEMO-CB-1003` |

Tags `DEMO-CB-1001` to `DEMO-CB-1004` exist (1004 is an unassigned spare). Any other tag shows "unknown tag", and a tag that belongs to someone else shows "mismatch". There are also Teacher, Technician and Admin buttons.

**Five-minute walkthrough**

1. Sign in as **Student (Spanish)**, choose Español, pick "Mi Chromebook no enciende", type a description, enter tag `DEMO-CB-1003`, and continue. You see the simulated "mismatch" result and a notice that the Spanish text awaits review.
2. Press "No funcionó" on both steps, then "Pedir un técnico". You get a ticket number.
3. Sign out, sign in as **Technician**, and expand that ticket. Record the "Needs in-person check" disposition and read the Spanish draft, which is marked as not sent.
4. Sign in as **Student**, choose English and Wi-Fi, and press "This fixed it" at step 2 to see a resolved case.
5. Sign in as **Teacher** to confirm the original teacher chat is unchanged.

Students are limited to 2 tickets per 15 minutes, the same limit as the normal form, so rotate between the three student accounts when rehearsing.

**What is real and what is simulated**

- **Spanish text is awaiting human review.** Student and technician screens say so. English is prototype wording with no district sign-off, and nothing cites knowledge-base article numbers.
- **The device check is a lookup in a fixture file** (`server/supportFixtures.ts`), not a district inventory.
- **A disposition records a decision only.** It does not approve, order, or change anything.
- **The notification is a stored draft.** Nothing in the app sends it.
- Technician and staff screens stay in English.

## Run it locally

Requires Node 22 (see `.nvmrc`). The project was verified on Node 22, and `package.json` allows Node 20 or newer, which was not tested.

```bash
npm ci
cp .env.example .env
```

For a quick look with fictional data, set these in `.env`:

```
DEV_LOGIN=true
DEMO_MODE=true
DISTRICT_DOMAIN=demo.example.org
ADMIN_EMAILS=demo.admin@demo.example.org
```

Then run `npm run dev` and open http://localhost:3000. The sign-in page shows demo buttons, and sample tickets are already in the queue. `DEV_LOGIN` lets anyone sign in as anyone, so use it on your own machine only. The server refuses to start with it on in production.

## What has and has not been verified

"Verified" here means an automated test and/or a manual run of the real app in a browser (Chromium via Playwright). Nothing below has been exercised with real students, real district systems, or real devices.

| Area | Status | Evidence |
| --- | --- | --- |
| Type-check, build | Verified | `npm run lint`, `npm run build` |
| Roles, tickets, technician updates, admin tools | Verified | `tests/api.test.ts`, plus manual sign-in and access checks for each role over HTTP |
| Student-support demo (both languages, all three outcomes) | Verified | `tests/support.test.ts` and a full browser walkthrough |
| Teacher chat and ticket path | Verified, unchanged by the demo work | existing tests, and a ticket filed through the UI |
| Data survives a restart; demo off hides the demo routes | Verified | real process restarts |
| Server-side access control for the new routes | Verified | other students get 404, non-technicians get 403 on dispositions, tampered priority/role fields are ignored |
| Production refuses to start with `DEV_LOGIN` or `DEMO_MODE` on | Verified | `tests/units.test.ts`, `tests/identity.test.ts` |
| Real Google sign-in | **Not tested.** Only a mock verifier is used in tests. | |
| HTTPS, the `Secure` cookie flag, `TRUST_PROXY` behind a load balancer | **Not tested** | |
| Slack/Teams webhook | **Not tested live.** Tests use a stubbed `fetch`. | |
| Printing a dispatch slip | Renders on screen. A real print was not tested. | |
| Managed Chromebooks, district web filters, screen readers | **Not tested** | |
| Load and scale | **Not tested.** The client polls every 20 to 30 seconds and tickets live in a JSON file. | |
| Spanish text quality | **Awaiting human review** | |

CI (`.github/workflows/ci.yml`) runs `npm ci`, lint, test and build on every pull request and every push to `master`.

## How it works

```
Browser (React + Vite + Tailwind)            Server (Express + TypeScript, run with tsx)
  /student  /teacher  /tech  /admin   ----->  /api/*  auth, tickets, chat, admin, support
  signs in with Google (or dev login)           |  signed session cookie, role looked up on every request
                                                |  rate limits (in memory)
                                                +--> data/tickets.json, users.json, cases.json
                                                +--> optional: Slack/Teams webhook
```

- **Entry point:** `server.ts` loads config, builds the stores, mounts the API, and serves Vite in development or `dist/` in production.
- **Storage:** three JSON files in `DATA_DIR`, written atomically after every change. This suits a single-instance prototype and nothing larger.
- **Sessions:** a signed, HttpOnly cookie that holds only who the person is. Roles are looked up on every request, so a role change applies immediately.
- **Shared types:** `src/types/index.ts` is used by both client and server.

### Project layout

```
server.ts                  entry: wires config, stores, chat, Vite/static
server/                    app (routes), auth, session, users (roles), google, config, chat,
                           rateLimit, safety, store (tickets), tickets (validation/triage), notify,
                           cases + support + supportRoutes + supportFixtures (student-support demo),
                           demoData (sample tickets)
src/                       React client: App (routing by role), Login, AdminPage, TeacherChatBot,
                           TechnicianConsole, StudentSupport, CaseDetailPanel
src/data/schools.ts        campuses, lead technicians, help desk contact (PLACEHOLDER data)
src/data/supportContent.ts the fixed troubleshooting steps in English and Spanish
src/i18n/                  student-facing strings for the demo
tests/                     node:test suites: API, units, integrations, support demo, identity
.github/workflows/ci.yml   lint, test and build on every PR
```

### Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Build the client to `dist/` |
| `npm start` | Production server (`NODE_ENV=production`) |
| `npm test` | Run all tests |
| `npm run lint` | Type-check (`tsc --noEmit`) |

### Configuration

All settings are in `.env.example`.

| Setting | Purpose |
| --- | --- |
| `DISTRICT_DOMAIN` | Email domain people must sign in with |
| `DISTRICT_NAME`, `TICKET_PREFIX` | Name shown in headers and slips, and the start of ticket numbers (`PREFIX-2026-0001`) |
| `GOOGLE_CLIENT_ID`, `SESSION_SECRET`, `ADMIN_EMAILS` | Required in production |
| `DEV_LOGIN`, `DEMO_MODE` | Development and demo only. The server refuses to start in production with either on. |
| `DATA_DIR`, `PORT`, `TRUST_PROXY` | Storage location, port, and reverse-proxy count |
| `NOTIFY_WEBHOOK_URL` | Optional alert for urgent staff tickets |

`src/data/schools.ts` is placeholder data (a few made-up campuses, rooms and technicians). Replace it before any real use.

## Security model and known limits

| Area | What the prototype does |
| --- | --- |
| Identity | The server verifies the Google sign-in token and accepts only verified accounts in your Workspace domain. No passwords are stored. *(Verified with a mock verifier only.)* |
| Roles | Looked up on every request. Students are the default. Admins in `ADMIN_EMAILS` cannot be removed in the app, and admins cannot change their own role. |
| Tickets | Name, email, role, priority, routing and ticket number come from the server. Technician notes record who wrote them. |
| Sessions | Signed, HttpOnly, SameSite=Lax cookie, 8 hours. Cross-site writes are refused. |
| Abuse limits | Tickets: 2 per 15 minutes for students, 3 for staff. Chat: 5 messages per 30 seconds per person and 120 per minute per IP. Sign-in: 30 attempts per 10 minutes per IP. Message length is capped, and a regex deny-list screens chat messages. |
| Chat content | Free-text questions are answered from built-in text on the server. They are not stored, and they are not sent to any outside service. |

**Known limits**

- **A session lasts 8 hours** even if the Google account is disabled in the meantime. Removing a role applies at once, but blocking a person entirely needs a shorter session or a revocation list.
- **"Class in session" is self-reported.**
- **Technicians see every ticket in the district.** Per-building scoping is not built.
- **Student names and room numbers are stored in tickets.** Review FERPA and COPPA obligations before using real data.
- **The chat screen is English-only and pattern-based.** It is a courtesy filter for students, not a security boundary, and Spanish free text is not matched by the built-in answers. The student-support demo avoids this by using a menu instead of free text.
- **Rate limits live in memory** and reset when the server restarts.
- **Nobody is paged by the app.** Priority 1 tickets rise to the top of the queue and, if a webhook is set, post to Slack or Teams.
- **Technicians and admins who open the student or teacher pages** to test create real tickets under their own name.

## Deploying for real use

Do not deploy with real student data until the items under [Before a pilot](#before-a-pilot) are done.

```bash
npm run build
npm start
```

Requirements and checklist:

1. Set `DISTRICT_DOMAIN`, `GOOGLE_CLIENT_ID`, `SESSION_SECRET`, and `ADMIN_EMAILS` (two or more people, so one absence does not lock you out). Set `DISTRICT_NAME` and `TICKET_PREFIX` to your own values.
2. Create the Google OAuth client in a **district-owned** Google Cloud project: APIs & Services > Credentials > OAuth client ID, type Web application. Add your site's URL under Authorized JavaScript origins. If asked for a user type, choose Internal so only your Workspace organization can sign in. (Google's menus change, so check their current docs.)
3. Serve over HTTPS. Session cookies are marked `Secure` in production.
4. Set `TRUST_PROXY=1` behind a load balancer, otherwise rate limits see the proxy's IP.
5. Put `DATA_DIR` on a persistent disk and run a **single instance**. Serverless platforms whose filesystem is wiped on restart do not work with the JSON stores.
6. Sign in as an admin, import your staff list, and add your technicians.
7. Replace the placeholder data in `src/data/schools.ts`.
8. Leave `DEV_LOGIN` and `DEMO_MODE` off. The server refuses to start in production if either is on.

### Before a pilot

These need decisions from the district, not code:

- **Hosting** the district is willing to run, with a district-owned Google Cloud project and domain.
- **A privacy and vendor review** covering FERPA and COPPA for tickets that contain student names.
- **A human reviewer for the Spanish text**, and sign-off on the English text.
- **The real campus, room and technician data**, and a decision on who administers it.
- **A real-device trial** on managed Chromebooks, including the district web filter and shared-device sign-out.

## Contributing

- Branch from `master`, make small commits, and open a pull request. CI must pass.
- Before pushing, run `npm run lint`, `npm test` and `npm run build`.
- Keep teacher and staff behavior unchanged unless the change is meant to alter it, and say so in the PR.
- Use fictional data in tests and demos. Never commit real student information or secrets. `.env*` files are git-ignored except `.env.example`.

## Roadmap

Not built yet, roughly in priority order:

1. The pilot prerequisites above.
2. Buildings, rooms and technician coverage as admin-editable data instead of a source file.
3. A database instead of JSON files, and less client polling, before any district-wide use.
4. An audit log, session revocation, and per-building technician scoping.
5. A technician view of self-resolved student cases (they are stored today but have no screen).
6. Admin reporting (response times, trends by building).
7. Offline or installable support for Chromebooks.
8. Tidying: one source for the troubleshooting text (it exists in three places today), merging duplicate type definitions, and splitting the large `src/components/TeacherChatBot.tsx`.

### Decided against

- **AI chat.** It was removed on purpose, not postponed. At district scale (about 14,000 accounts) a paid model is not financially feasible, a free tier is not appropriate for student data, and fixed text is easier to review and to translate. If the question is reopened, it would need a funded budget, a privacy review, and an evaluation of answer quality first.
