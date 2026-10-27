# Greg Bot: School IT Help Desk (MVP)

A help desk for a school district. Students, teachers, and staff describe a technology problem, get guided troubleshooting, and, if it is not fixed, open a ticket that lands in a technician queue. Teachers in an active class are prioritized.

## Who sees what

Everyone signs in with their Google Workspace school account. Role decides the page:

| Role | Lands on | Can open | Can do |
| --- | --- | --- | --- |
| Student (default for anyone in the domain) | `/student` | `/student` | Chat, request a loaner, see their own requests |
| Teacher / staff | `/teacher` | `/teacher` | Same, plus mark "class in session" for priority |
| Technician | `/tech` | `/tech`, `/teacher`, `/student` | See and work every ticket (status, assignment, notes) |
| Admin | `/admin` | everything | All of the above, plus manage who is a technician or admin, import staff lists |

Pages are enforced on the server, not just hidden: a student who types `/tech` is sent back to `/student`, and the technician and admin APIs return 403 to them.

**Everyone in the domain is a student unless listed.** Your Google accounts are all on one domain, so the app cannot tell a student from a teacher by email. Staff are an explicit list the admin imports (paste a Google Admin console user export on the Admin page). A teacher who is missing from the list simply gets the student experience, which is the safe direction to be wrong.

## Run it locally

```bash
npm install
cp .env.example .env
```

For a quick look, set these in `.env`:

```
DEV_LOGIN=true
DEMO_MODE=true
ADMIN_EMAILS=demo.admin@htsdnj.org
```

then `npm run dev` and open http://localhost:3000. The sign-in page shows buttons for demo Student, Teacher, Technician, and Admin accounts, with sample tickets already in the queue. `DEV_LOGIN` lets anyone sign in as anyone; the server refuses to start with it on in production.

## Set up Google sign-in (required for real use)

1. In Google Cloud Console (use a project owned by your district), open **APIs & Services > Credentials** and create an **OAuth client ID** of type **Web application**.
2. Under **Authorized JavaScript origins** add your site's URL (for example `https://help.yourdistrict.org`), and `http://localhost:3000` for local testing.
3. If the consent screen asks for a user type, choose **Internal** so only your Workspace organization can sign in. (Google's menus change; check their current docs if the names differ.)
4. Put the client ID in `GOOGLE_CLIENT_ID`.

The server accepts a sign-in only if Google says the email is verified and the account belongs to your Workspace domain (`DISTRICT_DOMAIN`). Look at one student and one teacher account in the Admin console (Directory > Users) to confirm they share that domain.

## Deploy

```bash
npm run build
npm start
```

The server refuses to start in production without `GOOGLE_CLIENT_ID`, `SESSION_SECRET`, and `ADMIN_EMAILS`, or with `DEV_LOGIN` on. All settings are documented in `.env.example`.

Checklist before real users:

1. Set `DISTRICT_DOMAIN`, `GOOGLE_CLIENT_ID`, `SESSION_SECRET`, `ADMIN_EMAILS` (two or more people, so one absence does not lock you out).
2. Serve over HTTPS. Session cookies are marked `Secure` in production.
3. Set `TRUST_PROXY=1` behind a load balancer, otherwise rate limits see the proxy's IP.
4. Put `DATA_DIR` on a persistent disk (it holds `tickets.json` and `users.json`) and run a single instance. Cloud Run's default filesystem is wiped on restart.
5. Sign in as an admin, import your staff list, and add your technicians.
6. Replace the placeholder campuses, rooms, lead technicians, and help desk contact in `src/data/schools.ts`. (A later step moves these into the Admin page.)
7. Leave `DEV_LOGIN` and `DEMO_MODE` off.
8. Review the privacy items below with your district.

## Security model, and what it is not

| Area | What the MVP does |
| --- | --- |
| Identity | Google Workspace sign-in verified on the server. No passwords are stored. |
| Roles | Looked up on every request, so a role change applies immediately. Students are the default. Admins in `ADMIN_EMAILS` cannot be removed in the app; admins cannot change their own role. |
| Tickets | Name, email, role, priority, routing, and ticket number all come from the server, never the request. Technician notes record who wrote them. |
| Sessions | Signed HttpOnly, SameSite=Lax cookie, 8 hours. Cross-site writes are refused. |
| Abuse | Per-person and per-IP limits, message screening, a daily cap on AI calls, student ticket limit (2 per 15 minutes). |
| AI | The model has no tools or data access. Names and emails are not sent to it. Stricter safety filters are on because students use it. |

**Known limits:**

- A session lasts 8 hours even if the Google account is disabled in the meantime. Removing someone's role applies instantly; blocking them entirely needs a shorter session or a server-side revocation list.
- "Class in session" is self-reported by nature.
- Technicians see every ticket in the district; per-building scoping is the next step.
- Student names and room numbers are stored in tickets. Check FERPA/COPPA obligations and your Gemini API terms (use a paid/Cloud tier that does not train on inputs) before enabling AI for students.
- Nobody is paged by the app itself. Priority 1 tickets rise to the top of the queue and, if `NOTIFY_WEBHOOK_URL` is set, post to Slack/Teams.
- Technicians and admins who open the `/student` or `/teacher` pages to test create real tickets under their own name.

## Project layout

```
server.ts              entry: wires config, stores, chat, Vite/static
server/                app (routes), auth, session, users (roles), google, config, chat,
                       rateLimit, safety, store (tickets), tickets (validation/triage), notify
src/                   React client: App (routing by role), Login, AdminPage, chat, console
src/data/schools.ts    campuses, lead technicians, help desk contact
tests/                 node:test suites (API, roles, sessions, integrations)
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Build the client to `dist/` |
| `npm start` | Production server |
| `npm test` | Run the tests |
| `npm run lint` | Type-check |

## Next steps

Buildings, rooms, and technician coverage as admin-editable data (20+ buildings), per-building technician dashboards, a real admin overview (response times, trends by building), an audit log, a database instead of JSON files, and the Chromebook rollout pieces (web app manifest, offline shell, Admin console force-install).
