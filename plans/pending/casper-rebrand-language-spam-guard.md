# Casper rebrand, language pop-up, and chat spam guard
Ticket: none yet (this repo has no tracker; file one issue per step once approved)

Status: Gate 1 answered; waiting on final approval. No implementation has started.

## Context (what the code does today)
- Name "Greg Bot" appears in 24 places across 14 files. User-visible: `index.html` (title, og:title), `src/components/Landing.tsx:21`, `src/App.tsx:211`, `src/components/StudentSupport.tsx:464`, `src/components/TeacherChatBot.tsx:578,944`, `server.ts:45`, `README.md`. Internal identifiers: cookie `greg_session` (`server/session.ts:3`), localStorage key `greg.profile.v2.<email>` (`src/profile.ts:8`), event `greg:unauthorized` (`src/api.ts:13`), package name, test temp dirs. There is no logo file; the brand is plain text.
- Language is chosen as the FIRST CHAT MESSAGE in `StudentSupport.tsx` (phase `language`, chips from `LANGUAGE_PROMPT`). "Change language" in the header calls `reset()` and wipes the whole conversation. Login and Landing have no language choice. Staff chat (`TeacherChatBot.tsx`) is English only (staff-side Spanish is "Later").
- Spam today: `server/safety.ts` screens one message at a time (length, profanity, injection, repetition). `/api/chat` has a per-user 5 msgs / 30 s limit that returns a "please wait" message. Neither warns, counts strikes, or ends the session.
- The student support chat (`/api/support/*`, demo mode only) matches typed text on the CLIENT (`src/data/supportMatch.ts`), so the server never sees most typed messages. Only "Something else" text reaches `screenMessage` (`server/supportRoutes.ts:28`).
- Sessions are a stateless signed cookie (`server/session.ts`), so the server cannot revoke a cookie. Role is looked up per request in `attachUser` (`server/auth.ts:34`), which is the one place a lockout can be enforced.
- Tests are `node:test` on the server only (`tests/*.test.ts`); there are no component tests or browser tests. CI runs `npm run lint`, `npm test`, `npm run build`. (`node_modules` is not installed in this container; run `npm ci` before verifying.)

## Phases

### Phase 1: Rename to Casper and add a logo
Verified when: `grep -ri greg` over source returns only intentional hits (none, or a documented cookie-migration shim) and CI commands pass.
Files to touch: `src/brand.ts` (new), `src/components/Logo.tsx` (new), `index.html`, `src/components/Landing.tsx`, `src/App.tsx`, `src/components/StudentSupport.tsx`, `src/components/TeacherChatBot.tsx`, `server.ts`, `server/session.ts`, `src/profile.ts`, `src/api.ts`, `package.json`, `README.md`, `tests/units.test.ts`.

#### Step 1.1: Single brand constant and user-visible text (Size: S)
- Acceptance criteria: `BRAND_NAME` lives in `src/brand.ts` and is used by every user-visible string; page title and og tags say the new name; README retitled.
- Verification command: `npm run lint && npm test && npm run build`
- Files likely touched: `src/brand.ts`, `index.html`, `Landing.tsx`, `App.tsx`, `StudentSupport.tsx`, `TeacherChatBot.tsx`, `server.ts`, `README.md`
- Test seams: one new assertion in `tests/units.test.ts` that no source file under `src/` or `server/` contains the old name outside the migration shim.
- Blocked by: none

#### Step 1.2: Internal identifiers with a safe migration (Size: S)
- Acceptance criteria: cookie, localStorage key and unauthorized event renamed; the old localStorage profile is read once and copied to the new key; signing everyone out once is acceptable for a prototype (see Decision log).
- Verification command: `npm test` (session round-trip test updated; new profile-migration test)
- Files likely touched: `server/session.ts`, `src/profile.ts`, `src/api.ts`, `tests/units.test.ts`
- Test seams: `createSessions` unit test; `profile.ts` pure functions.
- Blocked by: 1.1

#### Step 1.3: Logo slot only (Size: XS)
- Acceptance criteria: a `Logo` component renders the plain text name `Casper` (wordmark) in the three places the old name appears as a header; nothing else. The real logo is a later design task, so the component is the single place to swap it in. No favicon work yet.
- Verification command: `npm run lint && npm run build`
- Files likely touched: `src/components/Logo.tsx`, `Landing.tsx`, `App.tsx`, `StudentSupport.tsx`
- Test seams: none needed (text only).
- Blocked by: 1.1

### Phase 2: Language pop-up before the student chat
Verified when: a signed-in student sees a small language dialog first, cannot reach the chat until they pick, and the chat starts in that language with no language message in the transcript.
Files to touch: `src/components/LanguageDialog.tsx` (new), `src/components/StudentSupport.tsx`, `src/i18n/studentStrings.ts`, `src/profile.ts` (if remembered), `src/App.tsx`.

#### Step 2.1: Language dialog component (Size: S)
- Acceptance criteria: accessible modal (focus trapped, `role="dialog"`, `aria-modal`, labelled, Esc does NOT dismiss because a choice is required); two large buttons, English and Español, each labelled in its own language; no backdrop click dismissal.
- Verification command: `npm run lint && npm run build`, then Playwright keyboard-only walk (Tab, Enter) in the scratchpad.
- Files likely touched: `LanguageDialog.tsx`
- Test seams: browser probe; the remember/forget logic is a pure function in `profile.ts` and gets a unit test.
- Blocked by: none

#### Step 2.2: Wire it in and remove the in-chat language phase (Size: M)
- Acceptance criteria: the `language` phase and `LANGUAGE_PROMPT` first message are gone; `StudentSupport` takes the chosen language as state set by the dialog; `getSupportLimit()` runs right after the pick, as `pickLanguage` does now; the header "Change language" reopens the dialog (see Gate 1 for whether it resets the conversation).
- Verification command: `npm test && npm run build`; Playwright run of the English path and the Spanish path through to the red tag prompt.
- Files likely touched: `StudentSupport.tsx`, `studentStrings.ts`, `App.tsx`
- Test seams: server tests untouched; behavior proven in the browser probe.
- Blocked by: 2.1

### Phase 3: Spam guard (warn, then log off)
Verified when: server tests show message N warns, message M ends the session and blocks sign-in until the lockout expires, and the student chat shows the warning then lands on the signed-out page with a clear reason.
Files to touch: `server/spamGuard.ts` (new), `server/app.ts`, `server/supportRoutes.ts`, `server/auth.ts`, `server/config.ts`, `src/api.ts`, `src/components/StudentSupport.tsx`, `src/i18n/studentStrings.ts`, `tests/spamguard.test.ts` (new).

#### Step 3.1: Strike tracker and lockout store (Size: M)
- Acceptance criteria: per-email tracker counting "bad" events (blocked by `screenMessage`, rapid bursts over the rate limit, repeated identical messages) inside a sliding window; returns `ok | warn | logout`; a lockout map with expiry; unit-testable with an injected clock like `SlidingWindowLimiter`.
- Verification command: `npm test` (new `tests/spamguard.test.ts`)
- Files likely touched: `server/spamGuard.ts`, `server/config.ts`, `tests/spamguard.test.ts`
- Test seams: pure class with injected `now`.
- Blocked by: none

#### Step 3.2: Enforce on the server (Size: M)
- Acceptance criteria: `attachUser` rejects locked-out emails (treated as signed out, with a `LOCKED_OUT` reason and retry time on `/api/auth/me`), both sign-in routes refuse a locked-out email, and `/api/auth/logout`-equivalent cookie clearing happens in the response that delivers the final strike.
- Verification command: `npm test` (API-level test: send junk until warn, until logout, then sign in again and get the lockout error, then advance the clock and sign in successfully)
- Files likely touched: `server/auth.ts`, `server/app.ts`, `tests/api.test.ts`
- Test seams: the existing high seam in `tests/api.test.ts` (`createApp` with injected deps).
- Blocked by: 3.1

#### Step 3.3: Feed it from the student chat (Size: M)
- Acceptance criteria: new `POST /api/support/message` that the client calls for every free-typed message (not red tag digits and not yes/no confirmations); it screens the text, records strikes, and returns `ok | warn | logout`; the existing `/api/chat` also reports strikes; keyword matching stays on the client.
- Verification command: `npm test`
- Files likely touched: `server/supportRoutes.ts`, `server/app.ts`, `src/api.ts`
- Test seams: `tests/support.test.ts` and `tests/api.test.ts`.
- Blocked by: 3.2

#### Step 3.4: Warning and sign-out UI in English and Spanish (Size: S)
- Acceptance criteria: `warn` shows a notice-style bubble in the chat language and keeps the chat usable; `logout` shows the reason, disables input, and returns to the signed-out page with the lockout message; both strings added to `studentStrings.ts` for `en` and `es` (Spanish flagged for the reviewer who signs off wording).
- Verification command: `npm run lint && npm run build`; Playwright run that sends repeated junk and observes warn then sign-out.
- Files likely touched: `StudentSupport.tsx`, `studentStrings.ts`, `src/api.ts`
- Test seams: browser probe.
- Blocked by: 3.3, 2.2 (language is known at warn time)

### Phase 4 onward: the rest of the roadmap (fog until Phases 1 to 3 land)
These are ranked in the previous message. Each gets its own plan file when picked up; none are specified here.

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

## Not yet specified
- Phase 3: lockout persistence across server restarts. Assumed in-memory (see Assumptions below).
- Phase 4+: fog.

## Assumptions (correct before approval, otherwise they stand)
1. The language pop-up is for students only; staff chat stays English until staff-side Spanish is built.
2. The chosen language is remembered per account in the browser (localStorage), so a returning student sees the pop-up only on first use or after "Change language"; signing in on a new device asks again.
3. Renaming the session cookie signs everyone out once; acceptable because the app is not deployed.
4. Spam lockouts are in-memory, so a server restart clears them.
5. "Spam" means blocked by the abuse/off-topic screen, repeated identical messages, or a rate-limit burst; button taps, red tag digits and yes/no confirmations never count.
6. The GitHub repo and `package.json` name `greg-bot-help-desk` are renamed in `package.json` only; the repo rename is left to you.
7. I will run `npm ci` first so the 59 existing tests can run, and use the pre-installed Chromium for the one-off browser checks.

## Always / Never
- Always: all chat wording stays fixed reviewable text (no AI); every new student-facing string exists in English and Spanish; the server stays the authority on identity, role, and lockout; existing 59 tests keep passing.
- Never: log message text to a persistent store in this plan (that belongs to roadmap item 3 and needs the privacy review); change roles or the ticket model; rename the GitHub repository; touch Phase 4+ roadmap items.

## Progress
| Phase | Status |
| --- | --- |
| 1 Rename (logo deferred) | not started |
| 2 Language pop-up | not started |
| 3 Spam guard | not started |
