# Casper help desk: build plan
Ticket: none yet (this repo has no tracker; file one issue per step once approved)

Status: waiting on approval. No implementation has started. The readable checklist is `TODO.md` at the repo root; this file holds the detail behind it.

## Order of work
Phases are numbered in the order to do them. Each matches a lettered part of `TODO.md`.

| Phase | What | TODO part | Can start now? |
| --- | --- | --- | --- |
| 1 | Teacher screen fixes | A | Yes |
| 2 | Sign-in page cleanup | B | Yes |
| 3 | Rename to Casper | C | Yes |
| 4 | Student language pop-up | D | Yes |
| 5 | Student spam guard | E | Yes |
| 6 | Shared chat layout, production student chat, smarter matching | F | Partly (needs district answers) |
| 7 | Technician tools, notifications, admin, launch testing | G, H, I | After 6 and hosting |

## Context (what the code does today)
- Name "Greg Bot" appears in 24 places across 14 files. User-visible: `index.html` (title, og:title), `src/components/Landing.tsx:21`, `src/App.tsx:211`, `src/components/StudentSupport.tsx:464`, `src/components/TeacherChatBot.tsx:578,944`, `server.ts:45`, `README.md`. Internal identifiers: cookie `greg_session` (`server/session.ts:3`), localStorage key `greg.profile.v2.<email>` (`src/profile.ts:8`), event `greg:unauthorized` (`src/api.ts:13`), package name, test temp dirs. There is no logo file; the brand is plain text.
- Language is chosen as the FIRST CHAT MESSAGE in `StudentSupport.tsx` (phase `language`, chips from `LANGUAGE_PROMPT`). "Change language" in the header calls `reset()` and wipes the whole conversation. Login and Landing have no language choice. Staff chat (`TeacherChatBot.tsx`) is English only (staff-side Spanish is "Later").
- Spam today: `server/safety.ts` screens one message at a time (length, profanity, injection, repetition). `/api/chat` has a per-user 5 msgs / 30 s limit that returns a "please wait" message. Neither warns, counts strikes, or ends the session.
- The student support chat (`/api/support/*`, demo mode only) matches typed text on the CLIENT (`src/data/supportMatch.ts`), so the server never sees most typed messages. Only "Something else" text reaches `screenMessage` (`server/supportRoutes.ts:28`).
- Sessions are a stateless signed cookie (`server/session.ts`), so the server cannot revoke a cookie. Role is looked up per request in `attachUser` (`server/auth.ts:34`), which is the one place a lockout can be enforced.
- Tests are `node:test` on the server only (`tests/*.test.ts`); there are no component tests or browser tests. CI runs `npm run lint`, `npm test`, `npm run build`. (`node_modules` is not installed in this container; run `npm ci` before verifying.)

## Phases

### Phase 1: Teacher screen fixes
Verified when: the last troubleshooting step shows each action once, the three action buttons are visibly color-coded, teacher text matches the student chat's sizes, and the "Where are you working today" form shows red "*Required" markers and an autofill room list.
Files to touch: `src/data/stepActions.ts` (new), `src/components/TeacherChatBot.tsx`, `src/components/ProfileSetup.tsx`, `src/components/RoomPicker.tsx` (new), `tests/stepactions.test.ts` (new).

#### Step 1.1: Fix the duplicate "Submit IT ticket" (Size: XS)
- Acceptance criteria: on the last step the action list is Issue resolved plus Submit IT ticket (each once); students still get "Request loaner device" in the same place; the same list is used by every place that builds step actions (`TeacherChatBot.tsx` lines 284-286, 317-319, 543-549, 581-583).
- Verification command: `npm test` (new `tests/stepactions.test.ts`)
- Files likely touched: `src/data/stepActions.ts`, `TeacherChatBot.tsx`, `tests/stepactions.test.ts`
- Test seams: a pure function `stepActions({ isLastStep, isStudent })` that returns the list; no component test harness exists, so this is the seam.
- Blocked by: none

#### Step 1.2: Color-code the action buttons (Size: S)
- Acceptance criteria: Issue resolved is green, Try next step is blue, Submit IT ticket is orange; each keeps its text label; text and background pass 4.5:1 contrast.
- Verification command: `npm run lint && npm run build`, then a Playwright screenshot of the chat at 390px and 1280px (one-off, scratchpad).
- Files likely touched: `TeacherChatBot.tsx`, `src/data/stepActions.ts` (a `tone` per action)
- Test seams: the `tone` mapping is covered by the 1.1 test; colors are checked in the browser.
- Blocked by: 1.1

#### Step 1.3: Larger, easier-to-read teacher text (Size: S)
- Acceptance criteria: message bubbles, chips and the input use the same sizes as `StudentSupport.tsx` (`text-sm sm:text-base` for bubbles and chips); no `text-xs` or custom pixel sizes remain on text a teacher must read (about 27 spots today); helper labels may stay small but not below 12px.
- Verification command: `npm run lint && npm run build`, then a Playwright screenshot comparison with the student chat.
- Files likely touched: `TeacherChatBot.tsx`
- Test seams: browser probe.
- Blocked by: none

#### Step 1.4: Red "*Required" markers on the working-today form (Size: S)
- Acceptance criteria: submitting with the room empty outlines the room box in red, shows "*Required" beside its label, and moves focus to it; the existing one-line error is replaced; the red state clears when the teacher types; error uses text as well as color.
- Verification command: `npm run lint && npm run build`, then a Playwright run: click Continue with an empty room, check the marker, type, check it clears.
- Files likely touched: `src/components/ProfileSetup.tsx`
- Test seams: a small pure `missingFields(values)` function in `src/profile.ts` with a unit test.
- Blocked by: none

#### Step 1.5: Room autofill dropdown (Size: M)
- Acceptance criteria: typing in the room box shows a filtered list of the chosen school's rooms (matches anywhere in the name, case-insensitive); arrow keys and Enter pick a room; a typed value not in the list is still accepted; follows the ARIA combobox pattern so screen readers announce it.
- Verification command: `npm run lint && npm run build`, then a Playwright keyboard-only walk.
- Files likely touched: `src/components/RoomPicker.tsx`, `ProfileSetup.tsx`, `tests/stepactions.test.ts` (filter function test)
- Test seams: a pure `filterRooms(rooms, query)` function with a unit test; the rest in the browser.
- Blocked by: 1.4 (same form)

### Phase 2: Sign-in page cleanup
Verified when: the signed-out page needs no scrolling at 1366x768 and 390x844, a real user sees one sign-in action, and the wording reads as plain school-office language.
Files to touch: `src/components/Landing.tsx`, `src/components/Login.tsx`, `src/index.css` (if needed).

#### Step 2.1: One sign-in action, demo access tucked away (Size: S)
- Acceptance criteria: the default view shows only the Google "Continue with Google" button; the four demo account buttons and the free email box (shown today when Google is not configured or in the "Demo accounts" section) appear only when `config.devLogin` is on and the visitor opens a small "Testing only" control; production behavior is unchanged (the server already refuses dev login there).
- Verification command: `npm test && npm run build`, then a Playwright screenshot with dev login on and off.
- Files likely touched: `Login.tsx`
- Test seams: browser probe; the server-side refusal is already covered in `tests/api.test.ts`.
- Blocked by: none

#### Step 2.2: One-screen layout (Size: S)
- Acceptance criteria: the landing page fits in one viewport without scrolling at the two sizes above; the three role descriptions are shortened or removed; the footer stays visible.
- Verification command: Playwright check that `document.scrollingElement.scrollHeight <= innerHeight` at both sizes.
- Files likely touched: `Landing.tsx`
- Test seams: browser probe.
- Blocked by: 2.1

#### Step 2.3: Plain wording and better icons (Size: S)
- Acceptance criteria: all page text rewritten in short plain sentences with no bold lead-in bullets and no headline-style phrasing; the generic icon row is replaced or removed; wording goes to the person who signs off English text (district decision 4).
- Verification command: `npm run lint && npm run build`; read-through against the `ux-copy` skill.
- Files likely touched: `Landing.tsx`, `Login.tsx`
- Test seams: none (copy).
- Blocked by: 2.2

### Phase 3: Rename to Casper (logo later)
Verified when: `grep -ri greg` over source returns only intentional hits (none, or a documented cookie-migration shim) and CI commands pass.
Files to touch: `src/brand.ts` (new), `src/components/Logo.tsx` (new), `index.html`, `src/components/Landing.tsx`, `src/App.tsx`, `src/components/StudentSupport.tsx`, `src/components/TeacherChatBot.tsx`, `server.ts`, `server/session.ts`, `src/profile.ts`, `src/api.ts`, `package.json`, `README.md`, `tests/units.test.ts`.

#### Step 3.1: Single brand constant and user-visible text (Size: S)
- Acceptance criteria: `BRAND_NAME` lives in `src/brand.ts` and is used by every user-visible string; page title and og tags say the new name; README retitled.
- Verification command: `npm run lint && npm test && npm run build`
- Files likely touched: `src/brand.ts`, `index.html`, `Landing.tsx`, `App.tsx`, `StudentSupport.tsx`, `TeacherChatBot.tsx`, `server.ts`, `README.md`
- Test seams: one new assertion in `tests/units.test.ts` that no source file under `src/` or `server/` contains the old name outside the migration shim.
- Blocked by: none

#### Step 3.2: Internal identifiers with a safe migration (Size: S)
- Acceptance criteria: cookie, localStorage key and unauthorized event renamed; the old localStorage profile is read once and copied to the new key; signing everyone out once is acceptable for a prototype (see Decision log).
- Verification command: `npm test` (session round-trip test updated; new profile-migration test)
- Files likely touched: `server/session.ts`, `src/profile.ts`, `src/api.ts`, `tests/units.test.ts`
- Test seams: `createSessions` unit test; `profile.ts` pure functions.
- Blocked by: 3.1

#### Step 3.3: Logo slot only (Size: XS)
- Acceptance criteria: a `Logo` component renders the plain text name `Casper` (wordmark) in the three places the old name appears as a header; nothing else. The real logo is a later design task, so the component is the single place to swap it in. No favicon work yet.
- Verification command: `npm run lint && npm run build`
- Files likely touched: `src/components/Logo.tsx`, `Landing.tsx`, `App.tsx`, `StudentSupport.tsx`
- Test seams: none needed (text only).
- Blocked by: 3.1

### Phase 4: Language pop-up before the student chat
Verified when: a signed-in student sees a small language dialog first, cannot reach the chat until they pick, and the chat starts in that language with no language message in the transcript.
Files to touch: `src/components/LanguageDialog.tsx` (new), `src/components/StudentSupport.tsx`, `src/i18n/studentStrings.ts`, `src/profile.ts` (if remembered), `src/App.tsx`.

#### Step 4.1: Language dialog component (Size: S)
- Acceptance criteria: accessible modal (focus trapped, `role="dialog"`, `aria-modal`, labelled, Esc does NOT dismiss because a choice is required); two large buttons, English and Español, each labelled in its own language; no backdrop click dismissal.
- Verification command: `npm run lint && npm run build`, then Playwright keyboard-only walk (Tab, Enter) in the scratchpad.
- Files likely touched: `LanguageDialog.tsx`
- Test seams: browser probe; the remember/forget logic is a pure function in `profile.ts` and gets a unit test.
- Blocked by: none

#### Step 4.2: Wire it in and remove the in-chat language phase (Size: M)
- Acceptance criteria: the `language` phase and `LANGUAGE_PROMPT` first message are gone; `StudentSupport` takes the chosen language as state set by the dialog; `getSupportLimit()` runs right after the pick, as `pickLanguage` does now; the header "Change language" reopens the dialog (see Gate 1 for whether it resets the conversation).
- Verification command: `npm test && npm run build`; Playwright run of the English path and the Spanish path through to the red tag prompt.
- Files likely touched: `StudentSupport.tsx`, `studentStrings.ts`, `App.tsx`
- Test seams: server tests untouched; behavior proven in the browser probe.
- Blocked by: 4.1

### Phase 5: Spam guard (warn, then log off)
Verified when: server tests show message N warns, message M ends the session and blocks sign-in until the lockout expires, and the student chat shows the warning then lands on the signed-out page with a clear reason.
Files to touch: `server/spamGuard.ts` (new), `server/app.ts`, `server/supportRoutes.ts`, `server/auth.ts`, `server/config.ts`, `src/api.ts`, `src/components/StudentSupport.tsx`, `src/i18n/studentStrings.ts`, `tests/spamguard.test.ts` (new).

#### Step 5.1: Strike tracker and lockout store (Size: M)
- Acceptance criteria: per-email tracker counting "bad" events (blocked by `screenMessage`, rapid bursts over the rate limit, repeated identical messages) inside a sliding window; returns `ok | warn | logout`; a lockout map with expiry; unit-testable with an injected clock like `SlidingWindowLimiter`.
- Verification command: `npm test` (new `tests/spamguard.test.ts`)
- Files likely touched: `server/spamGuard.ts`, `server/config.ts`, `tests/spamguard.test.ts`
- Test seams: pure class with injected `now`.
- Blocked by: none

#### Step 5.2: Enforce on the server (Size: M)
- Acceptance criteria: `attachUser` rejects locked-out emails (treated as signed out, with a `LOCKED_OUT` reason and retry time on `/api/auth/me`), both sign-in routes refuse a locked-out email, and `/api/auth/logout`-equivalent cookie clearing happens in the response that delivers the final strike.
- Verification command: `npm test` (API-level test: send junk until warn, until logout, then sign in again and get the lockout error, then advance the clock and sign in successfully)
- Files likely touched: `server/auth.ts`, `server/app.ts`, `tests/api.test.ts`
- Test seams: the existing high seam in `tests/api.test.ts` (`createApp` with injected deps).
- Blocked by: 5.1

#### Step 5.3: Feed it from the student chat (Size: M)
- Acceptance criteria: new `POST /api/support/message` that the client calls for every free-typed message (not red tag digits and not yes/no confirmations); it screens the text, records strikes, and returns `ok | warn | logout`; the existing `/api/chat` also reports strikes; keyword matching stays on the client.
- Verification command: `npm test`
- Files likely touched: `server/supportRoutes.ts`, `server/app.ts`, `src/api.ts`
- Test seams: `tests/support.test.ts` and `tests/api.test.ts`.
- Blocked by: 5.2

#### Step 5.4: Warning and sign-out UI in English and Spanish (Size: S)
- Acceptance criteria: `warn` shows a notice-style bubble in the chat language and keeps the chat usable; `logout` shows the reason, disables input, and returns to the signed-out page with the lockout message; both strings added to `studentStrings.ts` for `en` and `es` (Spanish flagged for the reviewer who signs off wording).
- Verification command: `npm run lint && npm run build`; Playwright run that sends repeated junk and observes warn then sign-out.
- Files likely touched: `StudentSupport.tsx`, `studentStrings.ts`, `src/api.ts`
- Test seams: browser probe.
- Blocked by: 5.3, 4.2 (language is known at warn time)

### Phase 6: Shared chat layout and production student chat (fog until Phases 1 to 5 land)
Not specified. It gets its own plan file when picked up. Open question that must be answered first: see "Not yet specified".

### Phase 7: Technician tools, notifications, admin dashboard, launch testing (fog)
Not specified. Each gets its own plan file when picked up.

## Decision log
| Decision | Chosen option | Why |
| --- | --- | --- |
| Where spam is enforced | Server, with a per-email lockout checked in `attachUser` | The cookie is stateless and the client is untrusted; the role check already runs per request. |
| How the server sees typed chat | New `POST /api/support/message` for free-typed text | Today the server never sees client-matched text, so it cannot count strikes. |
| Rename depth | Full: user-visible text, cookie, localStorage (with migration), package name | A half rename leaves the old name in DevTools and error messages. GitHub repo rename is left to the owner. |
| Name | Casper (not Caspr) | User choice. |
| Logo | Deferred to a later design task; text wordmark placeholder now | User choice. When it is designed, avoid a ghost mascot: "Casper the Friendly Ghost" is a trademarked character. |
| Mid-chat language change | Header "Change language" reopens the pop-up and keeps the conversation | User choice; students should not lose their request progress. |
| Spam thresholds | Warn at 3 bad events, sign out at 5, 15 minute lockout | User choice. |
| Spam scope | Students only | User choice; staff and technicians are never signed out by this guard. |
| Order of phases | Quick teacher fixes first, then sign-in page, rename, language pop-up, spam guard | Smallest and most visible first; the spam guard is the largest of the first five so it goes last. |
| Teacher fixes vs shared chat | Phase 1 restyles the teacher chat (text size, colors); full matching of the student chat is Phase 6 | The teacher flow is a 971-line server-driven chat; rebuilding it is not a quick fix. Needs your confirmation (see Not yet specified). |
| Demo sign-in | Kept for testing, hidden from real users | The server already refuses dev login in production; tests and demos still need it. |

## Not yet specified
- Phase 3: lockout persistence across server restarts. Assumed in-memory (see Assumptions below).
- Phase 6: should the teacher chat be restyled to look like the student chat but keep its own guided flow (recommended, much smaller), or be rebuilt on the student chat's step-by-step design (cleaner, a large rewrite)?
- Phase 2: Google chooser behavior (account picker vs "Continue with Google" popup) can only be checked with real Google credentials, so it waits on district decision 1.
- Phase 7: fog.

## Assumptions (correct before approval, otherwise they stand)
1. The language pop-up is for students only; staff chat stays English until staff-side Spanish is built.
2. The chosen language is remembered per account in the browser (localStorage), so a returning student sees the pop-up only on first use or after "Change language"; signing in on a new device asks again.
3. Renaming the session cookie signs everyone out once; acceptable because the app is not deployed.
4. Spam lockouts are in-memory, so a server restart clears them.
5. "Spam" means blocked by the abuse/off-topic screen, repeated identical messages, or a rate-limit burst; button taps, red tag digits and yes/no confirmations never count.
6. The GitHub repo and `package.json` name `greg-bot-help-desk` are renamed in `package.json` only; the repo rename is left to you.
7. Demo accounts stay available when dev login is on, behind a small "Testing only" control; real users never see them.
8. The teacher's "Try next step" is blue, "Issue resolved" green, "Submit IT ticket" orange; if you want other colors, say so now.
9. I will run `npm ci` first so the 59 existing tests can run, and use the pre-installed Chromium for the one-off browser checks.

## Always / Never
- Always: all chat wording stays fixed reviewable text (no AI); every new student-facing string exists in English and Spanish; the server stays the authority on identity, role, and lockout; existing 59 tests keep passing.
- Never: change what the server enforces for sign-in or roles while cleaning up the sign-in page; log message text to a persistent store in this plan (that belongs to roadmap item 3 and needs the privacy review); change roles or the ticket model; rename the GitHub repository; start Phase 6 or 7 work.

## Progress
| Phase | Status |
| --- | --- |
| 1 Teacher screen fixes | not started |
| 2 Sign-in page cleanup | not started |
| 3 Rename (logo deferred) | not started |
| 4 Language pop-up | not started |
| 5 Spam guard | not started |
| 6 Shared chat and production student chat | fog |
| 7 Technician tools, notifications, admin, launch | fog |
