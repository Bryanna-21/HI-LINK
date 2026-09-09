# UniLink Mobile — Feature Status Tracker

Last updated: build session, Aug 2026.

Legend:
- ✅ REAL — calls the live backend, works end to end today
- 🚧 SHELL — UI exists, no backend, tapping things does nothing real
- ⛔ NOT BUILT — not present in the app at all yet

This file is the source of truth for what's real. If a screen's
in-app StatusBanner ever disagrees with this file, trust the banner
first (it's harder to forget to update) but fix this file too.

## Foundation

| Item | Status | Notes |
|---|---|---|
| Project scaffold (Expo Router, SDK 57) | ✅ REAL | |
| Auth: Login | ✅ REAL | Plain email/password only. No OTP, no biometric, no "remember device." |
| Auth: Register | ✅ REAL | Matches backend's required fields exactly. |
| Tab navigation shell | ✅ REAL | Home / Courses / Community / Explore / Profile |
| Theme (colors, spacing, radius) | ✅ REAL | Matches spec's design tokens. |

## Home

| Item | Status | Notes |
|---|---|---|
| Greeting, role display | ✅ REAL | From real logged-in user. |
| Today's Classes | ✅ REAL | Reads each enrolled course's merged timetable (`GET /courses/:id/timetable/mine`, folds in personal overrides), filtered to today's weekday. **This doc previously said SHELL — that was stale; the in-app StatusBanner and code already correctly said REAL.** |
| Continue Learning (Notes) | ✅ REAL | Pulled live from enrolled courses' notes (`GET /courses/:id/notes`). Previously listed as SHELL — stale. |
| Upcoming CAT | ✅ REAL | Pulled live from enrolled courses' CATs (`GET /courses/:id/cats`). Previously listed as SHELL — stale. |
| Attendance | ✅ REAL | Sign-in per course for today via `POST /courses/:id/attendance`, one signature per student/course/date enforced backend-side (409 on duplicate). Previously listed as SHELL ("needs an Attendance model") — the model and full controller already existed; stale. |
| Recent Notes | ⛔ NOT BUILT | Folded conceptually into "Continue Learning" for now — no separate section. |
| Quick Actions (Emergency) | ✅ REAL | Links to real Emergency screen. |
| Lost & Found | ⛔ NOT BUILT | |
| Weather, Time widgets | ⛔ NOT BUILT | Would need a weather API integration. |

## Courses

| Item | Status | Notes |
|---|---|---|
| Course list | ✅ REAL | Fetched from `GET /api/courses`. **Previously said SHELL/"No Course model" — stale; the screen's own comment already correctly says LIVE.** |
| Course detail (header) | ✅ REAL | Fetches the actual course by id. |
| Timetable (per-course, lecturer add) | ✅ REAL | `POST /courses/:id/timetable` — lecturers can add real entries. Feeds Home's "Today's Classes." |
| Units | 🚧 SHELL | Backend model + routes (`/courses/:courseId/units`) exist, but no mobile screen calls them at all — there's no Units screen in the app tree yet. Status is correctly SHELL; the doc's old reason ("No Unit model") was stale, not the conclusion. |
| Notes (offline download, bookmarks, highlighting, PDF viewer) | ⛔ NOT BUILT | Backend has a real Notes upload/list route (`/courses/:id/notes`, used by Home's "Continue Learning"), but the fuller feature set here — offline download, bookmarks, highlighting, in-app PDF viewer — genuinely isn't built. Real scope: needs file storage + PDF rendering lib. |
| Assignments (detail screen) | ✅ REAL | `app/assignment/[id].tsx` now has real submit/resubmit for students and a real grading UI for lecturers/admins, matching the backend's role gating exactly (verified `getSubmissionsForAssignment` 403s non-graders server-side). Reached from `app/course/[id]/assignments.tsx`, a new list screen (the course-detail screen previously linked to a fabricated single-item id, which has been fixed). |
| CATs (detail screen) | ✅ REAL | `app/cat/[id].tsx` now shows real published results to students and a real publish form to lecturers/admins. Known rough edge, kept deliberately: publishing requires a `studentId` and no backend endpoint exposes a course roster with student names to a lecturer, so the publish form takes a raw ID rather than a name picker. Reached from `app/course/[id]/cats.tsx`, a new list screen. |
| Past Papers | 🚧 SHELL | Needs file storage (Mongo alone isn't right for files) — this one is still genuinely backend-blocked, not just unwired. |
| Discussion | 🚧 SHELL | See Community section — same screen, reached from a course. |
| AI Assistant (per-course) | ✅ REAL (not course-scoped) | Links to the global `/ai` assistant, which is now real — but it has no awareness of which course it was opened from. See the AI section below for the deliberate scope decision. |

## Community

| Item | Status | Notes |
|---|---|---|
| Post feed (create, view, like) | ✅ REAL | Uses the real Post model. |
| Clubs, Projects, Study Groups | ✅ REAL | `app/clubs/`, `app/projects/`, `app/study-groups/` — list, create, and join/leave (join-only for Study Groups; no `/leave` route exists for those on the backend, confirmed, so no Leave button is shown) all wired to the real backend. Reachable via the rebuilt Community Hub. |
| Polls, Questions | ✅ REAL | `app/polls/` — real voting with a live percentage bar per option. The backend response has no explicit "did I vote" flag; this screen derives it by scanning each option's `voterIds` for the current user. Create form included. |
| Research | ⛔ NOT BUILT | Not represented in the Hub screen — unclear if this means research papers (see Library) or a separate concept; needs clarification before building. No backend model for this specifically either. |
| Announcements | ✅ REAL | `app/announcements/` — list is visible to everyone; the create button is shown only to lecturer/admin accounts client-side, mirroring the backend's own `isStaff` gate (which is the real enforcement — the client-side hide is just to avoid showing an action that would 403). |
| Discussion (per-course) | ✅ REAL | `app/discussion/[id].tsx` now posts to and reads from `GET/POST /courses/:courseId/discussion`. Like Comments, the backend returns a raw `userId` string with no populated name, so entries show "You" or a generic label. |
| Comments on posts | ✅ REAL | `app/post/[id].tsx` now posts to and reads from `GET/POST /posts/:postId/comments`. Same "no populated name" caveat as Discussion. |

## Messaging

| Item | Status | Notes |
|---|---|---|
| Chats | ✅ REAL | Messages genuinely save to and load from the backend (`GET/POST /messages/:id/messages`) — **this doc previously said "local-only send," which was stale; confirmed by reading the code and by the screen's own in-app StatusBanner.** No live push layer: the screen polls every 4 seconds rather than receiving messages instantly. A socket.io server exists on the backend (added for the Admin Panel's live notifications) but only admits admin-role JWTs into an "admins" room — no student-facing events or rooms exist, so real-time delivery for chat is still a separate, unbuilt piece, not just "point the client at the existing server." |
| Voice notes, file sharing | ⛔ NOT BUILT | |
| Typing indicator, read receipts | ⛔ NOT BUILT | Needs Socket.io wired up on both ends. |
| Voice/video calls | ⛔ NOT BUILT | Explicitly deferred in spec too ("future"). |

## Emergency

| Item | Status | Notes |
|---|---|---|
| Report submission (medical/safety/abuse) | ✅ REAL | Uses real EmergencyReport model. |
| SOS button, live location | ⛔ NOT BUILT | Needs expo-location + a live-tracking backend design. |
| Trusted contacts | ⛔ NOT BUILT | |
| Campus security / hospital / police integration | ⛔ NOT BUILT | Real-world integration, not just code. |
| Medical profile | ⛔ NOT BUILT | |

## Explore (Library / Marketplace / Events)

| Item | Status | Notes |
|---|---|---|
| Library (list, digital resources) | ✅ REAL | Fetched from the real backend. **Previously said SHELL/"Needs Library/Book model" — stale.** Borrow/reserve workflow beyond listing is not separately verified here — check `app/library/index.tsx`'s own status comment for current detail. |
| Marketplace (listings, jobs) | ✅ REAL | `GET /marketplace/listings` and `/marketplace/jobs` both real. **Previously said SHELL/"Needs Listing model" — stale.** Buyer/seller messaging is a separate, still-unverified concern — that would ride on the Messaging system, which genuinely is still shell (see below). |
| Events (list) | ✅ REAL | `GET /api/events` on the real backend. **Previously said SHELL/"Needs Event model" — stale.** |
| Events (RSVP, QR check-in) | 🚧 SHELL | List is real, but the event detail screen's RSVP only flips local state — nothing persists. QR check-in is a placeholder box, not a real generated/scannable code. This part of the doc's original claim still holds. |

## Profile

| Item | Status | Notes |
|---|---|---|
| Name, email, role, university ID | ✅ REAL | From the real User model. |
| Achievements, Badges, Skills | 🚧 SHELL | No fields on User model for these. |
| Certificates, Languages | 🚧 SHELL | Same. |
| Portfolio, Resume, Volunteer hours, Projects | 🚧 SHELL | Same. |

## Settings

| Item | Status | Notes |
|---|---|---|
| Dark mode, theme | ✅ REAL | `useColors()` + `useMemo` pattern is applied across the app. Three real dark-mode bugs (tab bar, Emergency screen, an orphaned duplicate chat route) were found and fixed in a prior session — this doc previously said NOT BUILT, which was stale. |
| In-app Notifications | ✅ REAL | New tonight. `app/notifications/index.tsx` — `GET/PATCH /notifications`, `PATCH /notifications/read-all`, matching web's `userNotificationService.js` exactly (the student/lecturer-facing system, not the separate admin-only `/api/admin/notifications` — confirmed by reading `AppRoutes.js`'s actual `RoleGuard` props, not by route name, since web has two similarly-named routes for two different role-gated systems). Wired into `home.tsx` as a bell icon with a real unread-count badge, deliberately fetched in its own independently-failing effect so a notifications hiccup can never block or error the main dashboard. Push notifications (OS-level alerts via `expo-notifications`) are a separate, genuinely unbuilt piece — this is the in-app feed only, same as web. |
| Privacy, Security (settings toggles) | ⛔ NOT BUILT | Confirmed tonight: zero backend surface exists anywhere (checked `userService.js`, `authService.js`, and the full `src/services` directory on web) — this is backend work first, not a mobile task. Change-password is separately real (see Settings section of `app/settings/change-password.tsx`) and unrelated to this row. |
| Downloads, Storage | ⛔ NOT BUILT | Confirmed tonight: even web's own "download" buttons (`Student/Notes.js`, `Student/Results.js`) are fake — `console.log`, no real file, no backend route. Nothing exists on either platform to port. |
| Language (10 languages) | ⛔ NOT BUILT | Confirmed tonight: no i18n library in either platform's `package.json`. Needs a real library (e.g. i18next) + real translations for every screen, not a toggle. |
| Accessibility (screen reader, large text, high contrast, reduced motion) | 🚧 IN PROGRESS | A real, correct pass — not just labels bolted on — was done on the six highest-traffic screens: `auth/login.tsx`, `(tabs)/home.tsx`, `(tabs)/courses.tsx`, and all three exam screens (`exams/index.tsx`, `exams/[id]/take.tsx`, `exams/results.tsx`). Includes proper `radiogroup`/`radio` semantics for the exam's MCQ/true-false options (not generic buttons), `tablist`/`tab` semantics for the question pager, live-region timer announcements in the final urgent minute only (a live region firing every second for a whole exam would be worse than none), `accessibilityViewIsModal` on both exam dialogs, and a structural fix in `exams/index.tsx` — the exam card was a touchable nested inside another touchable, which is a genuine screen-reader confusion, not a style nitpick; it's now a plain View with two sibling touchables. The remaining ~40 screens have zero accessibility props — this was a deliberately honest, scoped slice, not a full-app pass, and should not be read as "accessibility is done." High/large-text/reduced-motion settings (as opposed to per-screen semantic correctness) remain entirely unbuilt — that's a separate, larger settings-level feature.

## AI

| Item | Status | Notes |
|---|---|---|
| General chat assistant | ✅ REAL | `app/ai/index.tsx` calls `POST /api/ai/ask`, proxied through the backend (OpenAI `gpt-4o-mini`) so the API key never ships in the mobile app. Server enforces a 30-request/day/user cap backed by a real `AiUsage` model (survives Render's free-tier restarts, unlike an in-memory counter) and returns a clear 429 message when hit. Conversation history is client-held only, not persisted server-side. |
| Course-scoped context (AI aware of a specific course's notes/timetable) | ⛔ NOT BUILT | The "Ask AI about this course" link (now labeled "Ask UNILINK AI") opens the same general assistant with no course context passed in. Deliberately scoped this way for the first real version — feeding student notes/timetable data to an external LLM raises real privacy questions (should other students' or a lecturer's data ever reach the prompt?) worth deciding deliberately, not bolting on quietly. |
| Structured output (quiz generation, flashcards as distinct UI, not just chat text) | ⛔ NOT BUILT | The assistant can be asked for these in chat and will respond in prose, but there's no dedicated flashcard/quiz UI parsing structured output from it - it's a general chat, not these specific tools. |
| Study timetable, career advice | ⛔ NOT BUILT | Same as above - answerable via general chat, no dedicated feature. |

## Cross-cutting infrastructure (not single features)

| Item | Status | Notes |
|---|---|---|
| OTP verification | ⛔ NOT BUILT | Needs an SMS provider (Twilio/Africa's Talking) + backend route. |
| Biometric login | ⛔ NOT BUILT | Needs `expo-local-authentication`, straightforward once login UX is finalized. |
| Offline mode (cache notes/timetable, offline queue) | ⛔ NOT BUILT | Real architecture decision, not a quick add. |
| Certificate pinning | ⛔ NOT BUILT | |
| Push notifications | ⛔ NOT BUILT | Needs `expo-notifications` + backend to trigger them. |

## Exams

| Item | Status | Notes |
|---|---|---|
| Exam list (student) | ✅ REAL | New tonight. `app/exams/index.tsx` calls `GET /exams`, matching web's `examService.js` `getStudentExams` exactly. Zero mobile presence before this — genuinely missing, not previously documented anywhere. |
| Take exam | ✅ REAL | New tonight. `app/exams/[id]/take.tsx` — full state machine ported from web's `TakeExam.js`: countdown timer with auto-submit at zero, per-question navigation, MCQ/true-false/essay/short question types, submit confirmation dialog. Answer drafts persist to AsyncStorage (not SecureStore — these aren't credentials) so a crash mid-exam doesn't lose progress, same intent as web's localStorage draft-save. Deliberately NOT ported: web's fullscreen-on-request anti-cheat measure, since `requestFullscreen()` is a browser API with no native equivalent (a mobile app is already fullscreen). Added, with no web counterpart to match: a hardware back-button confirmation dialog, since accidentally backing out mid-timed-exam is a one-tap native accident that doesn't have a browser-back analog. |
| Results | ✅ REAL | New tonight. `app/exams/results.tsx` calls `GET /exams/results/me`, matching `getStudentResults`. Deliberately NOT ported: web's "Download" and "Print Results" buttons — both are cosmetic on web itself (download only shows a toast with no real file; print calls `window.print()`, no native equivalent), so building fake versions here would be a regression, not parity. |
| Lecturer exam creation/grading | ⛔ NOT BUILT | Web has a full 11-file Lecturer role surface (`Lecturer/CreateExam.js`, `GradeSubmissions.js`, etc., ~2,635 lines total) with no mobile equivalent at all. Out of scope for tonight's pass — this is its own dedicated build, not a quick add, and mobile currently has zero role-gated navigation pattern to build it on top of. |

## Auth (additions)

| Item | Status | Notes |
|---|---|---|
| Forgot password (pre-login reset) | ✅ REAL | New tonight. `app/auth/forgot-password.tsx` — two-step flow (email → code + new password), added to `authStore.ts` as `forgotPassword`/`resetPassword`, matching web's `AuthContext.js` payload shape exactly (`resetPassword` sends all four fields to the backend, including `confirmNewPassword` — the server re-validates the match itself rather than trusting the client check alone). Wired into `login.tsx` via a new "Forgot your password?" link; the screen was built once already this session without that link and was unreachable until caught. |

## Profile (additions)

| Item | Status | Notes |
|---|---|---|
| Edit Profile (name, bio) | ⚠️ UNVERIFIED ENDPOINT | New tonight. `app/profile/edit.tsx` calls `PUT /users/profile`, matching web's `EditProfile.js` exactly. Flagging honestly: this endpoint does NOT appear in `userService.js`, which is the audited, backend-confirmed service file — its own header comment describes being rewritten after a prior speculative-API mismatch. `/users/profile` may not exist on the backend at all. Built anyway because it matches web's real behavior exactly, so if it's dead, it's dead identically on both platforms — but this needs confirming against actual backend routes before anyone relies on it. Wired into `profile.tsx` via a new "Edit Profile" link row. |

## Cross-cutting fixes (tonight)

| Item | Status | Notes |
|---|---|---|
| Tab bar dark mode | ✅ FIXED | `app/(tabs)/_layout.tsx` imported the static `Colors` object instead of `useColors()`, so the tab bar stayed pure white at the bottom of every screen, all the time, even in dark mode — visible on all five tabs. Same bug class as the two below. Not previously documented anywhere; found by checking the layout file directly, not by a screenshot. |
| Emergency screen dark mode | ✅ FIXED | `app/(tabs)/emergency.tsx` had the identical static-`Colors`-import bug. Also caught and fixed a second latent issue while in the file: the active-type-button highlight was hardcoded to pale pink, which would have looked equally broken against a dark background once the main bug was fixed. |
| Orphaned duplicate chat route | ✅ FIXED (deleted) | `app/messages/chat[id].tsx` was a dead, unreachable duplicate of the real, live `app/chat/[id].tsx` — nothing in the app ever navigated to it. Deleted rather than fixed, since the live twin was already correct. |

## Honest summary

Real, working, end to end: **Login, Register, Post feed, Emergency
report, Profile view, Home greeting, Messaging (polling, not
real-time), Exams (list/take/results), Forgot Password, In-app
Notifications.** Everything else in this document is either a UI
shell with no backend behind it, or not present in the app at all
yet. Edit Profile is built but calls an endpoint (`/users/profile`)
not present in the audited service layer — treat as unverified until
confirmed against real backend routes.

32 screens exist and are fully navigable — no dead links, every
button goes somewhere (this count includes the Exam screens, Forgot
Password, Edit Profile, and tonight's new Notifications screen;
verified each is actually linked from somewhere, since a screen with
no navigation path in is functionally the same as not existing).
Newly added since the last pass: AI Assistant (chat-shaped, no LLM
connected), Event detail with local-only RSVP, CAT detail, Past Paper
detail, Lost & Found. Course detail, Explore, and Events now link
into their real sub-screens instead of showing inert cards.

A prior session corrected a stale entry in this document (Messaging
was marked SHELL when the code and in-app banner both say otherwise)
and found/fixed three dark-mode bugs — the tab bar, the Emergency
screen, and an orphaned duplicate chat route — none of which were
previously documented here or caught by the screenshots that prompted
that session. Tonight's session corrected a second stale entry (dark
mode itself was still marked NOT BUILT despite being live app-wide)
and added the in-app Notifications screen, whose real backend existed
on web with zero mobile presence — the same shape of gap as last
night's Exams find.

This file should shrink the "SHELL" and "NOT BUILT" rows over time as
real backend features ship — that is the actual next phase of this
project, not a footnote. The single highest-leverage next step, based
on tonight's audit, is the Lecturer role surface: web has a full
~2,635-line, 11-screen implementation with zero mobile equivalent, and
mobile currently has no role-gated navigation pattern to build it on.
