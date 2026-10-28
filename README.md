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

A prototype of a student-support workflow in English and Spanish, shown as a chat. It is available only when `DEMO_MODE=true`, uses fictional data, and has no AI. With demo mode off, its routes return 404 and `/student` shows the original chat.

**How it works:** the student chats with Greg Bot. They tap a language, then either tap one of the common problems (Wi-Fi, will not turn on, sign-in, damaged, something else) or type it. Typed text is matched to a common problem by plain keywords in English and Spanish (`src/data/supportMatch.ts`). It is not AI, so it only recognises those words. If nothing matches, the bot says so and shows the choices again, and "Something else" sends what the student typed to a technician. To stop it being used to send junk, it needs at least 8 characters of real words (no Skip), is run through the same abuse/off-topic screen as the chat, and can appear once per request. The ticket title starts with the student's own words so the technician can see the problem at a glance. Next the student must type the number from the **red tag** on their Chromebook. A red tag is **exactly six digits** (numbers only), the bot refuses anything else and asks again, and there is no way to skip this step because every device has a red tag. Once they type six digits, the bot shows the student's name (from their Google account) and the number and asks "Is all of that right?", and nothing is saved until they confirm (or they can type it again to fix a typo). Then they follow fixed troubleshooting steps, then either finish as fixed or ask for a technician. The red tag is saved as typed and is **never looked up** (the app only checks that it is six digits): it is there so the technician reading the request can find that Chromebook, and the student it belongs to, in their own records. Escalating creates an ordinary ticket, with the red tag as its asset tag. The technician sees the case: language, the student's own words, the red tag, the steps tried, a **demo** disposition, an **unsent** draft message, and a short decision history.

**Demo accounts** (the sign-in panel appears when `DEV_LOGIN=true`): **Student**, **Teacher**, **Technician** and **Admin**. The Student button signs in as a fictional student, Alex Sample. Language is chosen inside the chat, so there is a single student button.

Type any six digits as the red tag, for example `482193` (any six digits are accepted, since nothing is looked up). **Request limit:** to stop one student piling up tickets, a student can have **one open request at a time** (set by `STUDENT_OPEN_TICKET_LIMIT`). A student at the limit is told as soon as they choose a language, in a highlighted message: they already have an open request (the number is shown), the bot can still try some quick fixes, but it cannot send a new request, and if the fixes do not work they should contact the main office or a technician. The normal problem menu follows, and tapping or typing works as usual. For problems that have steps (Wi-Fi, will not turn on, sign-in) the student can try the steps. The red tag question and the "anything else wrong?" question are skipped, because nothing will be sent. If the steps fix it, it is saved as a resolved case, which is the point of this mode. If they do not, or the student taps "Ask for a technician", the bot repeats who to contact, with the open request number, and sends nothing. "Damaged" and "Something else" have no steps, so they show that same contact message straight away. No ticket is ever created in this mode, and the conversation is never cleared: "Change language" is hidden, and after each outcome a "Try another problem" button goes back to the menu without wiping what is on screen. Reloading the page gives the same up-front message, because the check is made on the server. The server still refuses to create the ticket as a backstop, and marks the case `blocked` (a finished case with no ticket) so it is not left open. The slot frees when a technician resolves the request, or when a technician clicks **Allow another request** on it (for example if the loaner has a problem). **Several problems:** before sending, the bot asks "Is there anything else wrong?" and the student can add up to four more problems, which all go in the same single ticket. To rehearse more than once, resolve the ticket as a technician, use **Allow another request**, or type another fictional address in the sign-in box, such as `demo.estudiante@your-demo-domain` (Sofía Muestra) or `demo.student2@your-demo-domain` (Jordan Sample). Any other address works too, and shows as "not on the demo roster".

**Five-minute walkthrough**

1. Sign in as **Student** and tap **Español**. Type `mi chromebook no prende`. The bot recognises the problem. Type a six-digit red tag number such as `482193` (try a wrong one like `R-4821` first and see it refused), confirm it when the bot repeats it back, and notice that the Spanish text awaits review.
2. Tap "No funcionó" on both steps, then "Pedir un técnico". The bot asks if anything else is wrong: tap "Agregar otro problema", pick the Wi-Fi problem, then "No, enviarla". You get one ticket number for both.
3. Start another request ("Empezar otra solicitud") and choose a language. You get the **request limit** message straight away, then the normal problem menu. Try the Wi-Fi steps and tap "No funcionó" on each: the bot shows the contact message with the open ticket number and creates nothing. Tap "Probar otro problema" and pick "Mi Chromebook está dañada": same contact message, and the earlier messages are still on screen.
4. Sign out, sign in as **Technician**, and expand that ticket. See both problems and the red tag, record the "Needs in-person check" disposition and read the Spanish draft (marked as not sent), then click **Allow another request**.
5. Sign in as **Student** again. The limit message is gone, the red tag question is back, and a new request goes through. To see a problem fixed with the steps while at the limit (a resolved case, no ticket), sign in as a student who has an open request, choose a language, pick the Wi-Fi problem and tap "This fixed it" at step 2.
6. Sign in as **Teacher** to confirm the original teacher chat is unchanged.

**What is real and what is simulated**

- **Spanish text is awaiting human review.** Student and technician screens say so. English is prototype wording with no district sign-off, and nothing cites knowledge-base article numbers.
- **The red tag is not checked against anything.** The app only checks that it is six digits, saves it, and shows it to the technician. It does not connect to any inventory or student record system, so a student could type six digits that belong to a different Chromebook.
- **A disposition records a decision only.** It does not approve, order, or change anything.
- **The notification is a stored draft.** Nothing in the app sends it.
- **Typed text is matched by keywords, not understood.** The bot never answers a question it was not written to answer.
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
| Student-support chat: both languages, tapped and typed input, resolved and escalated outcomes | Verified | `tests/support.test.ts`, `tests/match.test.ts` and a full browser walkthrough |
| Student request limit (one open at a time, technician can allow another), and several problems in one request | Verified | `tests/api.test.ts`, `tests/support.test.ts` and the browser walkthrough |
| Student at the limit: up-front message, self-help steps, contact message instead of sending, no ticket ever created, conversation never cleared, same message after reload, technician allowing another then lets a normal request through | Verified in English and Spanish with a scripted Chromium walkthrough at 1366x768 and 360px wide (52 checks plus reading the screenshots), and server tests for the `blocked` case. The walkthrough script is not part of the repo, so it does not run in CI. | `tests/support.test.ts` |
| The case where the limit is lifted or reached while a conversation is already under way (for example from a second tab) | Server side only (a refused escalation closes the case as `blocked`). The chat's reaction to it, and the re-check that "Try another problem" makes (it should drop out of limit mode if a technician has allowed another request), were **not exercised in a browser**. | `tests/support.test.ts` |
| Keyword matching of typed text | Verified for the phrases in `tests/match.test.ts` only. Real students will type things it does not recognise, and it falls back to the choices. | |
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
                           TechnicianConsole, StudentSupport (the student chat), CaseDetailPanel
src/data/schools.ts        campuses, lead technicians, help desk contact (PLACEHOLDER data)
scripts/backup.ts          nightly copy of the data files
src/data/supportContent.ts the fixed troubleshooting steps in English and Spanish
src/data/supportMatch.ts   keyword matching for what students type
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
| `npm run backup` | Copy `DATA_DIR/*.json` to a timestamped folder in `BACKUP_DIR` (default `./backups`), keeping the newest `BACKUP_KEEP` (default 14) |

### Configuration

All settings are in `.env.example`.

| Setting | Purpose |
| --- | --- |
| `DISTRICT_DOMAIN` | Email domain people must sign in with |
| `DISTRICT_NAME`, `TICKET_PREFIX` | Name shown in headers and slips, and the start of ticket numbers (`PREFIX-2026-0001`) |
| `STUDENT_OPEN_TICKET_LIMIT` | Open requests one student may have at once (1 to 10, default 1) |
| `GOOGLE_CLIENT_ID`, `SESSION_SECRET`, `ADMIN_EMAILS` | Required in production |
| `DEV_LOGIN`, `DEMO_MODE` | Development and demo only. The server refuses to start in production with either on. |
| `DATA_DIR`, `PORT`, `TRUST_PROXY` | Storage location, port, and reverse-proxy count |
| `NOTIFY_WEBHOOK_URL` | Optional alert for urgent staff tickets |

Schools are listed in `src/data/schools.ts`. "Demo Middle School" is marked `demoOnly`: it appears in pickers and is accepted for tickets only when `DEMO_MODE=true`, so real campuses can be added alongside it and demo mode can be retired later. A technician can correct a ticket's school from the expanded ticket (the change is written into the notes). `src/data/schools.ts` is placeholder data (a few made-up campuses, rooms and technicians). Replace it before any real use.

## Security model and known limits

| Area | What the prototype does |
| --- | --- |
| Identity | The server verifies the Google sign-in token and accepts only verified accounts in your Workspace domain. No passwords are stored. *(Verified with a mock verifier only.)* |
| Roles | Looked up on every request. Students are the default. Admins in `ADMIN_EMAILS` cannot be removed in the app, and admins cannot change their own role. |
| Tickets | Name, email, role, priority, routing and ticket number come from the server. Technician notes record who wrote them. |
| Sessions | Signed, HttpOnly, SameSite=Lax cookie, 8 hours. Cross-site writes are refused. |
| Abuse limits | Tickets: one open request per student (a technician can allow another), plus a burst limit of 2 per 15 minutes for students and 3 for staff. Chat: 5 messages per 30 seconds per person and 120 per minute per IP. Sign-in: 30 attempts per 10 minutes per IP. Message length is capped, and a regex deny-list screens chat messages. |
| Chat content | Free-text questions are answered from built-in text on the server. They are not stored, and they are not sent to any outside service. |

**Known limits**

- **A session lasts 8 hours** even if the Google account is disabled in the meantime. Removing a role applies at once, but blocking a person entirely needs a shorter session or a revocation list.
- **"Class in session" is self-reported.**
- **Technicians see every ticket in the district.** Per-building scoping is not built.
- **Student names and room numbers are stored in tickets.** Review FERPA and COPPA obligations before using real data.
- **The chat screen is English-only and pattern-based.** It is a courtesy filter for students, not a security boundary, and Spanish free text is not matched by the built-in answers. The student-support demo avoids this by using a menu instead of free text.
- **Rate limits live in memory** and reset when the server restarts.
- **Nobody is paged by the app.** Priority 1 tickets rise to the top of the queue and, if a webhook is set, post to Slack or Teams.
- **A student at the request limit can try the self-help steps, but cannot send anything.** If the steps fail they are told to contact the main office or a technician. Nothing tells the main office or a technician automatically, because the app sends nothing outside itself. Each failed attempt is stored as a `blocked` case (and each fixed one as `resolved`) in `cases.json` with no ticket. No screen shows these to technicians yet, and nothing cleans them up. Creating cases is rate limited (10 per 15 minutes per student). If a technician allows another request while a student is mid-conversation, the student stays in this mode until they tap "Try another problem" or reload.
- **Loaner follow-ups are approved by a technician, not automatic.** A student with a loaner problem has to contact the main office or a technician unless the open request has been released.
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
6. Schedule `npm run backup` (for example nightly from cron) and copy `BACKUP_DIR` off the machine. Point your uptime monitor at `/api/health`, which returns 503 if the data folder is not writable.
7. Sign in as an admin, import your staff list, and add your technicians.
8. Replace the placeholder data in `src/data/schools.ts`.
9. Leave `DEV_LOGIN` and `DEMO_MODE` off. The server refuses to start in production if either is on.

### Before a pilot

These need decisions from the district, not code:

- **Hosting** the district is willing to run, with a district-owned Google Cloud project and domain.
- **A privacy and vendor review** covering FERPA and COPPA for tickets that contain student names.
- **A human reviewer for the Spanish text**, and sign-off on the English text.
- **The real campus, room and technician data**, and a decision on who administers it.
- **A real-device trial** on managed Chromebooks, including the district web filter and shared-device sign-out.
- **Parent sign-in (on hold, confirm with district leadership).** Parents have no district Google account, and the server rejects any address outside `DISTRICT_DOMAIN`, so parents cannot sign in today. Options: (a) parents do not sign in and contact the school; (b) an email magic-link sign-in with a `parent` role limited to their own child's tickets, which needs a parent-to-student link list from the district; (c) a parent portal fed by the student information system. Nothing is built for this yet.
- **What a student does if their Chromebook has no red tag.** The chat requires a six-digit red tag and has no way to skip it, so a student whose device has none cannot send a request. This is undecided and is being confirmed with the district.

## Contributing

- Branch from `master`, make small commits, and open a pull request. CI must pass.
- Before pushing, run `npm run lint`, `npm test` and `npm run build`.
- Keep teacher and staff behavior unchanged unless the change is meant to alter it, and say so in the PR.
- Use fictional data in tests and demos. Never commit real student information or secrets. `.env*` files are git-ignored except `.env.example`.

## Roadmap

Not built yet, roughly in priority order:

**Requested, not built yet** (from the project owner's review):

- One shared chat layout for every role (`ChatShell`), with about 5 tappable common problems and free typing under them; the buttons and keyword table should come from one shared data file. Menu contents should follow the most common past tickets.
- Student path in production: after Google sign-in the student goes straight to the chat, which shows their name and asks for the red tag with a confirmation. Today this runs only in `DEMO_MODE`; it also needs a way to learn the student's school (the demo uses a fictional roster).
- Admin analytics dashboard (tickets per school, priority, time to resolve, top categories).
- **Tell the requester when their ticket changes.** Nothing is sent today; the technician's decision is only a stored draft. Needs an email or in-app notice and a decision on the sender.
- Technician coverage: let technicians claim a ticket, and fall back to a backup technician or the shared queue when a school's lead is out.
- Photo upload (for example a cracked screen). Needs a storage and retention decision first; not started.
- Data retention and privacy policy for tickets and cases.
- Staff-side Spanish.
- Parent sign-in: on hold pending district confirmation (see "Before a pilot").

1. The pilot prerequisites above.
2. Decide whether loaner problems should be allowed automatically, for example once a technician marks the swap done, instead of needing a technician to allow each one.
3. Buildings, rooms and technician coverage as admin-editable data instead of a source file.
4. A database instead of JSON files, and less client polling, before any district-wide use.
5. An audit log, session revocation, and per-building technician scoping.
6. A technician view of self-resolved and blocked student cases (they are stored today but have no screen).
7. Admin reporting (response times, trends by building).
8. Offline or installable support for Chromebooks.
9. Tidying: one source for the troubleshooting text (it exists in three places today), merging duplicate type definitions, and splitting the large `src/components/TeacherChatBot.tsx`.

### Decided against

- **AI chat.** It was removed on purpose, not postponed. At district scale (about 14,000 accounts) a paid model is not financially feasible, a free tier is not appropriate for student data, and fixed text is easier to review and to translate. If the question is reopened, it would need a funded budget, a privacy review, and an evaluation of answer quality first.
