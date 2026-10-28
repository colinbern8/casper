# Casper IT Help Desk: To-Do List

Casper (formerly Greg Bot) is a school IT help desk. It is a working prototype that has not been deployed or reviewed for student-data privacy. It uses no AI: every answer is fixed, reviewable text.

How to read this list:

- Items are grouped by **where they live** (sign-in, student, teacher, technician, admin, shared chat, platform, testing, decisions).
- Each item has a priority tag: **[Critical]** blocks a real launch, **[High]** is needed for the pilot to work day to day, **[Medium]** is valuable but the pilot can run without it, **[Low]** can wait.
- **[Decision]** means the district has to decide; it is not a code task.
- **[Bug]** means something is broken today.
- A "Quick view by priority" list sits at the end.

---

## 1. Branding

- [ ] **[Medium]** Rename Greg Bot to **Casper** (decided: Casper, not Caspr). Covers the page title, headers, chat headers, README, session cookie, saved browser profile key and package name. Use one shared name constant. Keep the old saved profile by copying it to the new key once.
- [ ] **[Medium]** Design the Casper logo. A plain text name stands in until then. Avoid a ghost mascot: "Casper the Friendly Ghost" is a trademarked character.

## 2. Sign-in page

Notes from the first look at the page.

- [ ] **[High]** Reduce scrolling. The page has too much length for what it does; fit sign-in on one screen.
- [ ] **[High]** Show one sign-in button. There are three today (Google, demo accounts, dev login), which is too much for users. Keep demo and dev login out of what real users see.
- [ ] **[High]** Clicking sign-in goes straight to Google, with a standard "Continue with Google" button.
- [ ] **[Medium]** Replace the icons with better ones.
- [ ] **[Medium]** Remove the "AI style" look and writing. Use short, plain wording a school staff member would use.
- [ ] **[Critical]** Test real Google sign-in, HTTPS and the secure cookie. Sign-in has only been tested with a mock.

## 3. Student experience

### Chat flow
- [ ] **[Critical]** Make the student chat the real production path. After Google sign-in, go straight to the chat with name and red tag confirmation. It only runs in demo mode today.
- [ ] **[Critical]** Let the system learn the student's school: the student picks it, or a roster is imported.
- [ ] **[High]** Show a small **language pop-up** (English or Español) before the chat opens. It replaces the language choice inside the chat. "Change language" reopens the pop-up and keeps the conversation. Students only. Remember the choice per account in the browser.
- [ ] **[Critical]** **Spam guard** (students only): count bad messages (blocked by the abuse or off-topic screen, repeated identical messages, bursts over the rate limit). Warn at 3, sign out at 5, lock out for 15 minutes. Enforce on the server. Button taps, red tag digits and yes/no answers never count.
- [ ] **[High]** Write the warning and sign-out messages in English and Spanish.

### Matching and answers
- [ ] **[High]** Build a fuller keyword table so typed text matches common problems.
- [ ] **[High]** Add Spanish matching for typed text.
- [ ] **[High]** Log unmatched text for tuning (needs the privacy review first).

### Limits and rules
- [ ] **[High] [Decision]** What a student does if their Chromebook has no red tag.
- [ ] **[Medium]** Testing-day limits for students.
- [ ] **[Low]** Check the red tag against a Chromebook inventory export.
- [ ] **[Low]** Photo upload (needs a storage and retention decision first).

## 4. Teacher and staff experience

### "Where are you working today" page
- [ ] **[Medium]** Make the room box a dynamic autofill dropdown that filters the school's rooms as the teacher types, and still allows a typed location.
- [ ] **[Medium]** When Continue is clicked with missing information, highlight each empty box in red and show "*Required" beside it.

### Chatbot page
- [ ] **[High] [Bug]** "Submit IT ticket" appears twice on the last troubleshooting step. The code adds it as both the "next step" option and the final option. Show it once.
- [ ] **[High]** Color-code the buttons "Issue resolved", "Try next step" and "Submit IT ticket" (for example green, blue, and orange or red). Keep the words so color is not the only cue.
- [ ] **[High]** Make the text larger. About 27 places use extra-small or custom text sizes, and it is hard for teachers to read.
- [ ] **[High]** Make the teacher chat look and work like the student chat (see section 6).
- [ ] **[Low]** Staff-side Spanish.

## 5. Technician experience

- [ ] **[High]** Shared per-school queue with a "Claim" button on each ticket.
- [ ] **[High]** Let a technician mark themselves away.
- [ ] **[High]** Add a screen for self-resolved and blocked student cases.
- [ ] **[High]** Alerts for student tickets (email or a digest). Today technicians must watch the queue, and the Slack/Teams webhook skips students.
- [ ] **[Low]** Limit technicians to the buildings they cover.

## 6. Shared chat (all roles)

- [ ] **[High]** One chat layout for every role, with about 5 tappable common problems plus free typing, built from one shared data file.
- [ ] **[Medium]** Make the teacher menu follow the most common past tickets (needs ticket history, so it comes after launch).
- [ ] **[High]** Keep the chat to fixes only. The refusal for unmatched text is already in.

## 7. Notifications

- [ ] **[High]** Notify the requester when their ticket changes. Nothing is sent today.
- [ ] **[High]** Student ticket alerts for technicians (see section 5).

## 8. Admin

- [ ] **[Medium]** Analytics dashboard: tickets per school, priority, time to resolve and top categories.
- [ ] **[Medium]** Audit log and session revocation.
- [ ] **[Low]** Edit schools, rooms and technicians in the admin screen (a source file today).
- [ ] **[Low]** Set roles automatically from Google Workspace groups.

## 9. Platform, security and operations

- [ ] **[Critical] [Decision]** Hosting, plus a district-owned Google OAuth project.
- [ ] **[Critical] [Decision]** Data retention and the privacy and vendor review (FERPA and COPPA). Ask who owns student-data privacy at the district.
- [ ] **[Critical] [Decision]** Real campus, room and technician data.
- [ ] **[Low]** Replace the JSON files with a real database, with pagination and less polling.
- [ ] **[Low] [Decision]** Parent sign-in (on hold). Options: (a) none, (b) an email magic link with a parent role limited to their child, which needs a parent-to-student list, or (c) a parent portal from the student information system.

## 10. Content and wording

- [ ] **[High] [Decision]** Who reviews the Spanish text, and who signs off the English wording.
- [ ] **[Medium]** Test Spanish quality.

## 11. Testing

Not yet tested:

- [ ] **[Critical]** Real Google sign-in, HTTPS and the secure cookie.
- [ ] **[High]** A live Slack/Teams webhook.
- [ ] **[High]** Printing (dispatch slips and loaner passes).
- [ ] **[High]** Managed Chromebooks and the district web filter.
- [ ] **[Medium]** Screen readers, then browser end-to-end tests and an accessibility check.
- [ ] **[Medium]** Load.
- [ ] **[Medium]** Spanish quality.

---

## Already built

- Google sign-in (domain and verified-account checks; tested with a mock only), four roles (Student, Teacher/Staff, Technician, Admin), role looked up on every request, tickets tied to the signed-in email, admin tools to manage technicians and admins and import a staff list.
- Teacher and staff: guided troubleshooting chat, ticket submission with Priority 1 (class in session) and Priority 2 (planning period), and a drawer of their own tickets.
- Student: English and Spanish chat with tappable problems, red tag entry (six digits) with confirmation, fixed self-help steps, up to 5 problems per ticket, one open request per student, and "Something else" with abuse checks.
- Technician: live queue with search and filters, status changes, reassigning, timestamped notes, dispatch slips, loaner passes, and student case view.
- Protection: rate limits, abuse screening, cross-site protection, production startup refuses demo or dev login, JSON data with backup script and health check, and CI running lint, tests and build (59 tests pass).

---

## Quick view by priority

### Critical
1. Student chat as the production path, with school selection or roster
2. Spam guard (warn, then sign out, students only)
3. Real Google sign-in, HTTPS and secure cookie testing
4. Hosting and district-owned Google OAuth project (decision)
5. Data retention and FERPA/COPPA review (decision)
6. Real campus, room and technician data (decision)

### High
1. Sign-in page: less scrolling, one button, straight to Google
2. Language pop-up before the student chat
3. Teacher chat: fix duplicate "Submit IT ticket" (bug), color-code buttons, larger text, same look as student chat
4. Shared chat layout for every role
5. Fuller keyword table, Spanish matching, unmatched-text logging
6. Notify requesters of ticket changes
7. Student ticket alerts for technicians
8. Technician coverage: shared queue, Claim, away status
9. Screen for self-resolved and blocked student cases
10. Spanish and English wording sign-off, and no-red-tag rule (decisions)
11. Test webhook, printing, managed Chromebooks and the web filter

### Medium
1. Rename to Casper, and design the Casper logo
2. Sign-in page icons and plain wording
3. Teacher room autofill dropdown and "*Required" highlighting
4. Admin analytics dashboard
5. Teacher menu based on past tickets
6. Audit log and session revocation
7. Testing-day limits for students
8. Screen reader, end-to-end, load and Spanish quality testing

### Low
1. Staff-side Spanish
2. Roles from Google Workspace groups
3. Admin-editable schools, rooms and technicians
4. Red tag inventory check
5. Per-building technician scoping
6. Real database
7. Photo upload
8. Parent sign-in (on hold)
