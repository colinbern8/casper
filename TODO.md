# Casper IT Help Desk: Roadmap and To-Do

Casper (formerly Greg Bot) is a school IT help desk. It uses no AI: every answer is fixed, reviewable text. Today it is a working prototype that has not been deployed or reviewed for student-data privacy.

This is the one file for planning. It says what the **prototype** needs, what the **final version** needs, and how to build each in order.

**Contents:** [1. Prototype vs final](#1-prototype-vs-final) · [2. Prototype to-do](#2-prototype-to-do) · [3. Final version to-do](#3-final-version-to-do) · [4. Waiting on the district](#4-waiting-on-the-district) · [5. Decisions and rules](#5-decisions-and-rules) · [6. Progress](#6-progress) · [7. Already built](#7-already-built)

---

## 1. Prototype vs final

- **Prototype** means: it can be shown start to finish to district decision makers, in demo mode, with fictional accounts and data. No real students. Nothing is sent outside the app. The goal is to get a yes, answers to the district questions, and feedback.
- **Final version** means: running on district hosting, with real Google sign-in, real schools, rooms and technicians, real messages sent, a passed privacy review, and testing on real devices.

- **Sign-in**
  - **Prototype:** One clean sign-in page; demo accounts hidden for testing
  - **Final version adds:** Real Google sign-in on a district-owned Google project, HTTPS, secure cookie
- **Teacher screens**
  - **Prototype:** All fixes: bug, colors, larger text, room autofill, required markers
  - **Final version adds:** Staff-side Spanish; teacher menu built from real past tickets
- **Student chat**
  - **Prototype:** English and Spanish; language pop-up; spam guard; fuller keywords with Spanish matching
  - **Final version adds:** Goes straight to the chat after real sign-in; student's school learned from a pick or roster; no-red-tag rule
- **Shared chat**
  - **Prototype:** One look for every role, built from one data file
  - **Final version adds:** Unmatched text logging (after privacy review)
- **Technician**
  - **Prototype:** Claim, away status, self-resolved and blocked case screen (demo data)
  - **Final version adds:** Per-building scoping; real queue per school
- **Messages**
  - **Prototype:** Status change shown in the app; unsent message preview
  - **Final version adds:** Real email or digest to requesters and technicians; live Slack/Teams webhook
- **Admin**
  - **Prototype:** Analytics dashboard on demo data
  - **Final version adds:** Audit log, session revocation, admin-editable schools and rooms, roles from Google groups
- **Data**
  - **Prototype:** JSON files, demo data
  - **Final version adds:** Real database, real campus, room and technician data
- **Safety**
  - **Prototype:** Rate limits, abuse screening, spam guard
  - **Final version adds:** Retention rules, FERPA/COPPA review, testing-day limits
- **Testing**
  - **Prototype:** Automated tests plus a browser check of each new screen
  - **Final version adds:** Real devices, web filter, printing, screen readers, load, Spanish quality
- **Branding**
  - **Prototype:** Name Casper as plain text
  - **Final version adds:** Logo

---

## 2. Prototype to-do

Do these in order. Each phase is one chunk of work. All of them can start now.

### P1. Teacher screen fixes

Do first: small, visible, and one is a bug. *Done when:* the last step shows each action once, the three buttons are color-coded, teacher text matches the student chat's sizes, and the working-today form shows red "*Required" markers and an autofill room list.

- [x] **Bug:** "Submit IT ticket" shows twice on the last troubleshooting step. Show it once. Students still see "Request loaner device" in that spot.
  - Files: `src/data/stepActions.ts` (new), `src/components/TeacherChatBot.tsx` (lines 284-286, 317-319, 543-549, 581-583). Check: `npm test` with a new test of a pure `stepActions({ isLastStep, isStudent })` function.
- [x] Color-code the buttons: "Issue resolved" green, "Try next step" blue, "Submit IT ticket" orange. Keep the words so color is not the only cue. Text and background must pass 4.5:1 contrast.
  - Files: `TeacherChatBot.tsx`, `stepActions.ts`. Check: `npm run lint && npm run build`, plus a browser screenshot at 390px and 1280px.
- [x] Make the teacher text larger, matching the student chat (`text-sm sm:text-base` for bubbles and chips). About 27 spots use tiny or custom sizes. Helper labels may stay small but not below 12px. *Checked in a browser: chat text is 16px, and nothing is under 12px now.*
  - Files: `TeacherChatBot.tsx`. Check: build, plus a screenshot next to the student chat.
- [x] "Where are you working today": if Continue is clicked with a required box empty, outline it in red, show "*Required" next to its label, move focus to it, and clear the marker when they type. Use text as well as color.
  - Files: `src/components/ProfileSetup.tsx`, `src/profile.ts` (a `missingFields` function with a unit test). Check: browser run.
- [x] "Where are you working today": make the room box an autofill dropdown that filters the school's rooms as the teacher types (matches anywhere in the name). Arrow keys and Enter pick a room. A typed location still works. Follow the ARIA combobox pattern so screen readers announce it.
  - Files: `src/components/RoomPicker.tsx` (new), `ProfileSetup.tsx`. Check: unit test of `filterRooms`, plus a keyboard-only browser walk.
- [x] The teacher chat is **restyled** to look like the student chat (same look, text size, button style) but keeps its own guided flow. This is a decision; see section 5.
- [x] Raise the remaining sub-12px text to 12px: `text-[10px]` and `text-[11px]` in `App.tsx`, `Landing.tsx`, `CaseDetailPanel.tsx`, `AdminPage.tsx` and `TechnicianConsole.tsx`. Found in the browser check. Check: build, plus a screenshot.

### P2. Sign-in page cleanup

*Done when:* the signed-out page needs no scrolling at 1366x768 and 390x844, a real user sees one sign-in action, and the wording reads like plain school-office language.

- [x] Show one sign-in action: "Continue with Google". Today there is the Google button, four demo account buttons and a free email box. Keep demo accounts and the email box behind a small "Testing only" control, shown only when dev login is on. The server already refuses dev login in production, and that stays.
  - Files: `src/components/Login.tsx`. Check: `npm test && npm run build`, plus screenshots with dev login on and off.
- [x] Fit the page on one screen with no scrolling. Shorten or remove the three role descriptions. Keep the footer visible.
  - Files: `src/components/Landing.tsx`. Check: browser check that page height fits the window at both sizes.
- [x] Replace the generic icons with better ones, or remove them.
- [x] Rewrite the page text in short, plain sentences. Remove the bold-label bullet list and the headline-style wording.
  - Files: `Landing.tsx`, `Login.tsx`. The English wording goes to whoever signs it off (see section 4).

*Moved to the final version:* checking that clicking sign-in opens the Google account chooser needs real Google credentials (see F1).

### P3. Rename to Casper

*Done when:* searching the source for the old name finds nothing except a documented one-time migration, and lint, tests and build pass.

- [x] Put the name in one place: `BRAND_NAME` in `src/brand.ts`. Use it in the page title, headers, chat headers, server start message and README.
  - Files: `src/brand.ts` (new), `index.html`, `Landing.tsx`, `src/App.tsx`, `StudentSupport.tsx`, `TeacherChatBot.tsx`, `server.ts`, `README.md`. Check: `npm run lint && npm test && npm run build`, plus a test that no file under `src/` or `server/` contains the old name.
- [x] Rename the internal names: sign-in cookie, saved browser profile key, the sign-out event, and the package name. Copy the old saved profile to the new key once so nobody loses it. Everyone is signed out once, which is fine because nothing is deployed.
  - Files: `server/session.ts`, `src/profile.ts`, `src/api.ts`, `package.json`, `tests/units.test.ts`.
- [x] A small `Logo` component shows the name. It now shows the Casper wordmark (see F6).
  - Files: `src/components/Logo.tsx` (new), `Landing.tsx`, `App.tsx`, `StudentSupport.tsx`.

*Not now:* the logo itself (see F6), and renaming the GitHub repository (you do that).

### P4. Student language pop-up

*Done when:* a signed-in student sees a small language dialog first, cannot reach the chat until they pick, and the chat starts in that language with no language message in the transcript.

- [ ] Build the pop-up: English and Español, each labelled in its own language. Focus is trapped, it is labelled for screen readers, and Esc and clicking outside do not close it, because a choice is required.
  - Files: `src/components/LanguageDialog.tsx` (new). Check: keyboard-only browser walk.
- [ ] Remove the language choice from inside the chat (the `language` phase and the first language message).
  - Files: `src/components/StudentSupport.tsx`, `src/i18n/studentStrings.ts`, `src/App.tsx`. Check: browser runs of the English and Spanish paths through to the red tag prompt.
- [ ] "Change language" in the chat header reopens the pop-up and **keeps the conversation** (today it wipes it). The request-limit check runs right after a pick, as it does now.
- [ ] Remember the choice per account in the browser. Students only; staff chat stays English.
  - Files: `src/profile.ts` (with a unit test).

### P5. Student spam guard

Students only. Staff and technicians are never signed out by this.

*Done when:* server tests show the 3rd bad message warns, the 5th ends the session and blocks sign-in until the lockout expires, and the student chat shows the warning and then the signed-out page with a clear reason.

- [ ] Build the strike counter and lockout list. A bad message is one that the abuse or off-topic check blocks, the same message repeated, or too many messages too fast. Button taps, red tag digits and yes/no answers never count. It takes a clock as input so it can be tested.
  - Files: `server/spamGuard.ts` (new), `server/config.ts`, `tests/spamguard.test.ts` (new). Check: `npm test`.
- [ ] Enforce it on the server: at 3 bad messages, warn. At 5, sign the student out and lock them out for 15 minutes. A locked-out student cannot sign back in until the time is up. The check sits in `attachUser`, because the sign-in cookie cannot be revoked.
  - Files: `server/auth.ts`, `server/app.ts`, `tests/api.test.ts`. Check: an API test that sends junk to the warning, then to the sign-out, then tries to sign in, then moves the clock forward and signs in.
- [ ] Add `POST /api/support/message`. The student chat matches typed text in the browser, so the server never sees it today. The browser calls this for every typed message (not red tag digits or yes/no) so the server can screen it and count strikes. The existing `/api/chat` reports strikes too.
  - Files: `server/supportRoutes.ts`, `server/app.ts`, `src/api.ts`. Check: `npm test`.
- [ ] Show the warning and the sign-out message in English and Spanish. The chat stays usable after a warning. After a sign-out, input is disabled and the student lands on the signed-out page with the lockout message.
  - Files: `StudentSupport.tsx`, `studentStrings.ts`, `src/api.ts`. Needs P4 first so the language is known.

### P6. Shared chat layout and smarter matching

Large. Gets its own detailed plan when picked up.

- [ ] One chat layout for every role, with about 5 tappable common problems plus free typing, built from one shared data file. This is also what makes the teacher chat match the student chat.
- [x] Build a fuller keyword table so typed text matches common problems. *Done in `src/data/supportMatch.ts` with `tests/match.test.ts`.*
- [x] Match Spanish typed text. *Checked in the browser: "mi chromebook no se conecta al wifi" matches Wi-Fi.*
- [x] Keep the chat to fixes only. The refusal for unmatched text is already in.

### P7. Technician and admin demo screens

Large. Gets its own detailed plan when picked up. Uses demo data only.

- [ ] Technician: shared queue per school, a "Claim" button on each ticket, and a way to mark yourself away.
- [ ] Technician: a screen for self-resolved and blocked student cases.
- [ ] Requester: show a ticket's status change in the app, and a preview of the message that would be sent. Nothing is actually sent.
- [ ] Technician: show what a student-ticket alert would look like (email or digest preview). Nothing is actually sent.
- [ ] Admin: analytics dashboard on demo data. Tickets per school, priority, time to resolve and top categories.

---

## 3. Final version to-do

Do these after the prototype is approved. Most of them wait on the district.

### F1. Hosting and real sign-in

- [ ] Hosting set up. *Needs district decision 1.*
- [ ] District-owned Google OAuth project. *Needs district decision 1.*
- [ ] Test real Google sign-in, HTTPS and the secure cookie. Sign-in has only been tested with a mock.
- [ ] Check that clicking sign-in opens the Google account chooser (or "Continue with Google") on the real project.
- [ ] Student chat as the real production path: after Google sign-in, go straight to the chat with name and red tag confirmation. It runs in demo mode only today.
- [ ] Find out each student's school: the student picks it, or a roster is imported.
- [ ] Load the real campus, room and technician data. *Needs district decision 3.*

### F2. Real messages

- [ ] Tell the requester by email when their ticket changes. Nothing is sent today.
- [ ] Alert technicians about student tickets by email or a digest. Today they must watch the queue, and the Slack/Teams webhook skips students.
- [ ] Test a live Slack/Teams webhook.

### F3. Privacy and safety

- [ ] Data retention rules and the privacy and vendor review (FERPA and COPPA). *Needs district decision 2.*
- [ ] Log unmatched text so the keywords can be tuned. Only after the privacy review.
- [ ] Decide what a student does if their Chromebook has no red tag. *Needs district decision 5.*
- [ ] Audit log.
- [ ] Session revocation.
- [ ] Testing-day limits for students.

### F4. Testing before go-live

None of these have been tested yet.

- [ ] Printing dispatch slips and loaner passes.
- [ ] Managed Chromebooks and the district web filter.
- [ ] Screen readers, plus browser end-to-end tests and an accessibility check.
- [ ] Load.
- [ ] Spanish quality. *Needs a reviewer, district decision 4.*

### F5. Scale and admin

- [ ] A real database instead of JSON files, with paging and less polling.
- [ ] Admins edit schools, rooms and technicians in the app (a source file today).
- [ ] Roles set automatically from Google Workspace groups.
- [ ] Limit technicians to the buildings they cover.
- [ ] Check the red tag against a Chromebook inventory export.

### F6. Polish and later

- [x] Casper logo: the wordmark is done (`design/casper/`) and shown in the sign-in page, app header and student chat header. No ghost, since "Casper the Friendly Ghost" is a trademarked character.
- [ ] Browser tab icon (favicon) for Casper. A full wordmark is unreadable at tab size, so this needs a decision on a small mark.
- [ ] Staff-side Spanish.
- [ ] Teacher menu built from the most common real past tickets (needs ticket history).
- [ ] Photo upload. Needs a storage and retention decision first.
- [ ] Parent sign-in (on hold). *Needs district decision 6.*

---

## 4. Waiting on the district

These need an answer from the district, not code. Ask early.

1. **Hosting, and a district-owned Google OAuth project**
   - Blocks: F1, F2
   - Ask: District IT
2. **Data retention, and the privacy and vendor review (FERPA and COPPA)**
   - Blocks: F3 (and unmatched text logging)
   - Ask: Whoever owns student-data privacy
3. **Real campus, room and technician data**
   - Blocks: F1
   - Ask: District IT
4. **Who reviews the Spanish text, and who signs off the English wording**
   - Blocks: P2 wording, P4, P5, F4
   - Ask: School or district communications
5. **What a student does if their Chromebook has no red tag**
   - Blocks: F3
   - Ask: District IT
6. **Parent sign-in (on hold): (a) none, (b) email magic link limited to their child, needs a parent-to-student list, or (c) a parent portal from the student information system**
   - Blocks: F6
   - Ask: District IT and administrators

---

## 5. Decisions and rules

**Decided**

- **Name:** Casper (not Caspr). *Why:* Your choice.
- **Logo:** Later; plain text name for now. *Why:* Your choice.
- **Teacher chat vs student chat:** Restyle only; teachers keep their own guided flow. *Why:* Your choice. Rebuilding the 971-line teacher screen is not needed.
- **Language change in chat:** Reopens the pop-up and keeps the conversation. *Why:* Your choice. Students should not lose progress.
- **Spam limits:** Warn at 3 bad messages, sign out at 5, 15-minute lockout, students only. *Why:* Your choice.
- **Where spam is enforced:** On the server, in `attachUser`. *Why:* The sign-in cookie cannot be revoked and the browser is not trusted.
- **How the server sees typed chat:** New `POST /api/support/message`. *Why:* The server never sees browser-matched text today.
- **Rename depth:** Full: visible text, cookie, saved profile (with a one-time copy), package name. *Why:* A half rename leaves the old name in error messages.
- **Demo sign-in:** Kept for testing, hidden from real users. *Why:* Tests and demos need it; the server already refuses it in production.
- **Classic student chat:** Removed. Students no longer get a "use the classic help chat" option. *Why:* Your choice.
- **Order of work:** Teacher fixes, sign-in page, rename, language pop-up, spam guard. *Why:* Smallest and most visible first; the spam guard is largest so it goes last.

**Assumptions** (tell me if any is wrong, otherwise they stand)

1. The language pop-up is for students only; staff chat stays English until staff-side Spanish is built.
2. The chosen language is remembered per account in the browser, so a returning student only sees the pop-up on first use or after "Change language".
3. Spam lockouts are kept in server memory, so a restart clears them.
4. Button colors: "Issue resolved" green, "Try next step" blue, "Submit IT ticket" orange.
5. Only the name inside `package.json` changes; the GitHub repository rename is yours to do.
6. For checks I run `npm ci` first so the 66 existing tests can run, and use the pre-installed Chromium for one-off browser checks (not committed).
7. In the prototype, nothing is sent outside the app. Messages and alerts are previews only.

**Always**

- All chat wording stays fixed, reviewable text (no AI).
- Every new student-facing message exists in English and Spanish.
- The server stays in charge of identity, role and lockout.
- The existing 66 tests keep passing.

**Never**

- Change what the server enforces for sign-in or roles while cleaning up the sign-in page.
- Store message text permanently before the privacy review.
- Change roles or the ticket model.
- Rename the GitHub repository.

**Not yet decided**

- How the shared data file of common problems is shaped (P6).
- Whether the prototype should use some real (non-student) data for the district demo.

---

## 6. Progress

- [x] **P1 Teacher screen fixes** (done, on master)
- [x] **P2 Sign-in page cleanup** (done, on master)
- [x] **P3 Rename to Casper** (done, on master, with the Casper wordmark logo in the page headers; the files are in `design/casper/`)
- [ ] **P4 Student language pop-up** (not started)
- [ ] **P5 Student spam guard** (not started)
- [ ] **P6 Shared chat and smarter matching** (keyword matching and Spanish matching done; the one shared chat layout is not planned yet)
- [ ] **P7 Technician and admin demo screens** (not planned yet)
- [ ] **F1 to F6 Final version** (waiting on prototype approval and district answers)

---

## 7. Already built

- **Sign-in and roles:** Google sign-in with domain and verified-account checks (tested with a mock only). Four roles: Student (the default for anyone in the domain), Teacher/Staff, Technician and Admin. The role is looked up on every request, and pages and APIs are enforced on the server. Tickets are tied to the signed-in email, and the server sets identity, role, priority and routing. Admins can add or remove technicians and admins and import a staff list.
- **Teacher and staff:** guided troubleshooting chat (power, Wi-Fi, classroom display, audio, copier badge, account sign-in), ticket submission (class in session is Priority 1, planning period is Priority 2), and a drawer of their own tickets.
- **Student:** English and Spanish chat with tappable problems (Wi-Fi, won't turn on, sign-in, damaged, something else) or typing matched by keywords. Red tag entry (exactly six digits) with name and tag confirmation. Fixed self-help steps, then fixed or ask for a technician. Up to 5 problems per ticket. One open request per student, and a technician can allow another; a student at the limit can still try the steps. "Something else" needs real words, is checked for abuse, and can be used once per request.
- **Technician:** live queue with search and filters (priority, role, status, school), status changes, reassigning, timestamped notes, dispatch slips and loaner passes, and the student case view (red tag, steps tried, their words, recorded decision).
- **Protection and operations:** off-topic filter (pattern-based, English only), rate limits, abuse screening, cross-site protection, production refuses demo or dev login, JSON data written safely with a backup script and health check, CI running lint, tests and build (66 tests pass).
