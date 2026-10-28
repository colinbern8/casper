# Casper IT Help Desk: To-Do List

Casper (formerly Greg Bot) is a school IT help desk. It is a working prototype that has not been deployed or reviewed for student-data privacy. It uses no AI: every answer is fixed, reviewable text.

The detailed build plan, with files and checks for each step, is in [`plans/pending/casper-help-desk-build-plan.md`](plans/pending/casper-help-desk-build-plan.md). This file is the checklist to work from.

**How to use this list**

- Work top to bottom. Each part is one chunk of work, in the order I recommend doing it.
- Tick a box when the item is done and checked.
- Parts A to E can start now. Part F needs district answers first. Part G waits on hosting.
- Section "Waiting on the district" lists the decisions only the district can make.

## At a glance

| Part | What | Size | Can start now? |
| --- | --- | --- | --- |
| A | Teacher screen fixes | Small | Yes |
| B | Sign-in page cleanup | Small | Yes |
| C | Rename to Casper | Small | Yes |
| D | Student language pop-up | Small | Yes |
| E | Student spam guard | Medium | Yes |
| F | Shared chat, production student chat, smarter matching | Large | Partly (needs district answers) |
| G | Technician tools and notifications | Large | Yes, after F's shared chat |
| H | Admin dashboard and security extras | Medium | After launch basics |
| I | Launch readiness (testing and go-live) | Large | Needs hosting |
| J | Later | Mixed | No |

---

## A. Teacher screen fixes

Do first. These are small, visible, and one of them is a bug.

**Screen: chatbot page**

- [ ] **Bug:** "Submit IT ticket" shows twice on the last troubleshooting step. Show it once.
- [ ] Color-code the three buttons: "Issue resolved" (green), "Try next step" (blue), "Submit IT ticket" (orange). Keep the words so color is not the only cue.
- [ ] Make the text larger and easier to read. About 27 places use tiny or custom text sizes.

**Screen: "Where are you working today"**

- [ ] Make the room box an autofill dropdown that filters the school's rooms as the teacher types. A typed location still works.
- [ ] If Continue is clicked with a required box empty, outline the box in red and show "*Required" next to it.

*Not here:* making the teacher chat look the same as the student chat is part F.

## B. Sign-in page cleanup

**Problems seen**

- Too much scrolling.
- Too many sign-in options. Today there is the Google button, four demo account buttons, and a free email box with a "Go" button.
- The icons and the wording look generic and "AI style".

**To do**

- [ ] Fit the sign-in page on one screen on a laptop and a phone, with no scrolling.
- [ ] Show one sign-in action: "Continue with Google". Hide the demo accounts and the email box from normal users. They stay for testing only.
- [ ] Replace the generic icons with better ones, or remove them.
- [ ] Rewrite the page text in plain, short sentences. Remove the bold-label bullet list and the headline-style wording.
- [ ] Make sure clicking sign-in takes the user to the Google account chooser. This needs real Google credentials to check, so it waits on part I.

## C. Rename to Casper

- [ ] Use the name **Casper** (decided) everywhere people see it: page title, headers, chat headers, README.
- [ ] Rename the internal names too: sign-in cookie, saved browser profile (copy the old one once so nobody loses it), and package name.
- [ ] Put the name in one place in the code so it never needs a find-and-replace again.
- [ ] Logo: **later** design task. Until then the name shows as plain text. Avoid a ghost, since "Casper the Friendly Ghost" is a trademarked character.

## D. Student language pop-up

- [ ] Show a small required pop-up (English or Español) before the student chat opens. No close button; they must pick.
- [ ] Remove the language choice from inside the chat.
- [ ] "Change language" in the chat header reopens the pop-up and keeps the conversation.
- [ ] Remember the choice per account in the browser.
- [ ] Students only. Staff chat stays English for now.

## E. Student spam guard

Students only. Staff and technicians are never signed out by this.

- [ ] Count bad messages per student: blocked by the abuse or off-topic check, the same message repeated, or too many messages too fast.
- [ ] At 3 bad messages: show a warning in the student's language.
- [ ] At 5 bad messages: sign the student out and lock them out for 15 minutes.
- [ ] Enforce it on the server, not just the browser. A locked-out student cannot sign back in until the time is up.
- [ ] Button taps, red tag digits and yes/no answers never count as spam.
- [ ] Write the warning and sign-out messages in English and Spanish.

## F. Chat: shared layout, production student chat, smarter matching

**Shared chat**

- [ ] One chat layout for every role, with about 5 tappable common problems plus free typing, built from one shared data file. This also makes the teacher chat match the student chat.
- [ ] Teacher menu follows the most common past tickets (needs ticket history, so after launch).

**Student chat for real use**

- [ ] After Google sign-in, go straight to the chat with name and red tag confirmation. Today it runs in demo mode only.
- [ ] Find out which school the student is at: the student picks it, or a roster is imported.

**Answers that only fix things**

- [ ] Build a fuller keyword table.
- [ ] Match Spanish typed text.
- [ ] Log unmatched text so the keywords can be tuned. Needs the privacy review first.

## G. Technician tools and notifications

**Technician screens**

- [ ] Shared queue per school.
- [ ] "Claim" button on a ticket.
- [ ] Mark a technician as away.
- [ ] Screen for self-resolved and blocked student cases.

**Messages**

- [ ] Tell the requester when their ticket changes. Nothing is sent today.
- [ ] Alert technicians about student tickets by email or a digest. Today they must watch the queue, and the Slack/Teams webhook skips students.

## H. Admin dashboard and security extras

- [ ] Analytics dashboard: tickets per school, priority, time to resolve, top categories.
- [ ] Audit log.
- [ ] Session revocation.
- [ ] Testing-day limits for students.

## I. Launch readiness

**Test these for real** (none tested yet)

- [ ] Real Google sign-in, HTTPS and the secure cookie.
- [ ] A live Slack/Teams webhook.
- [ ] Printing dispatch slips and loaner passes.
- [ ] Managed Chromebooks and the district web filter.
- [ ] Screen readers, plus browser end-to-end tests and an accessibility check.
- [ ] Load.
- [ ] Spanish quality.

**Go live**

- [ ] Hosting set up (see the district decisions).
- [ ] Real campus, room and technician data loaded.
- [ ] Privacy and vendor review passed.

## J. Later

- [ ] Staff-side Spanish.
- [ ] Photo upload (needs a storage and retention decision first).
- [ ] Roles set automatically from Google Workspace groups.
- [ ] Admins edit schools, rooms and technicians in the app (a source file today).
- [ ] Check the red tag against a Chromebook inventory export.
- [ ] Limit technicians to the buildings they cover.
- [ ] A real database instead of JSON files, with paging and less polling.
- [ ] Parent sign-in (on hold, see the district decisions).
- [ ] Casper logo design.

---

## Waiting on the district

These need an answer from the district, not code. Ask early, because they block parts F, G and I.

| # | Decision | Blocks | Ask who |
| --- | --- | --- | --- |
| 1 | Hosting, and a district-owned Google OAuth project | Parts B (last item), F, I | District IT |
| 2 | Data retention, and the privacy and vendor review (FERPA and COPPA) | Parts F (unmatched text), I | Whoever owns student-data privacy |
| 3 | Real campus, room and technician data | Parts F, G, I | District IT |
| 4 | Who reviews the Spanish text, and who signs off the English wording | Parts D, E, F | School or district communications |
| 5 | What a student does if their Chromebook has no red tag | Part F | District IT |
| 6 | Parent sign-in (on hold): (a) none, (b) email magic link limited to their child, needs a parent-to-student list, or (c) a parent portal from the student information system | Part J | District IT and administrators |

<details>
<summary>Already built (click to open)</summary>

- **Sign-in and roles:** Google sign-in with domain and verified-account checks (tested with a mock only). Four roles: Student, Teacher/Staff, Technician, Admin. Role is looked up on every request. Tickets are tied to the signed-in email. Admins can add or remove technicians and admins and import a staff list.
- **Teacher and staff:** guided troubleshooting chat (power, Wi-Fi, classroom display, audio, copier badge, account sign-in), ticket submission (class in session is Priority 1, planning period is Priority 2), and a drawer of their own tickets.
- **Student:** English and Spanish chat with tappable problems, red tag entry (six digits) with confirmation, fixed self-help steps, up to 5 problems per ticket, one open request per student, and "Something else" with abuse checks.
- **Technician:** live queue with search and filters, status changes, reassigning, timestamped notes, dispatch slips, loaner passes, and the student case view.
- **Protection and operations:** rate limits, abuse screening, cross-site protection, production refuses demo or dev login, JSON data with a backup script and health check, CI running lint, tests and build (59 tests pass).

</details>
