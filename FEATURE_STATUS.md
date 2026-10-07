# HI-LINK — Feature Status

Local-first build (Expo SDK 54, expo-router, AsyncStorage / SecureStore). There is **no backend**:
everything below that is marked "Local" is real and persisted on this device only.

Legend: **Local** = works end to end on-device · **Needs backend** = cannot be real without a server · **Partial** = real, with the stated limits.

(The previous version of this file described a different app, "UniLink", and has been replaced.)

## Identity & accounts
| Item | Status | Notes |
|---|---|---|
| Profiles, account switching | Local | Names/avatars resolve from the live profile at render time. Private data is scoped per account. |
| Profile PIN | Local | Salted, iterated SHA-256 in SecureStore, lockout after repeated failures. Guards switching profiles on this device; it is not an online password. |
| Account verification / institution verification | Local | Requests are stored and reviewed by system staff on this device. No external identity check. |
| Real sign-in, OTP, e-mail/phone verification, password reset | Needs backend | |

## Social
| Item | Status | Notes |
|---|---|---|
| Feed, reactions, comments, saves, reshares | Local | One reaction record per post+user; counts derive from it. |
| Visibility (everyone / my school / my class / my group) | Local | Enforced in feeds, profiles, reels, saved, search. |
| Reels, Library | Local | |
| Follows, private accounts, follow requests, blocks | Local | Blocking severs follows. |
| Reporting & moderation | Local | Reports for posts, comments, accounts, communities; queue in Moderation. |
| Cross-device delivery of any of the above | Needs backend | Other people's phones never see your data. |

## Messaging (NexChat)
| Item | Status | Notes |
|---|---|---|
| Conversations and messages | Partial | Stored locally. Receipts say "Queued" unless delivered/read was recorded. No transport exists in this repo, so nothing is delivered to other devices. |
| Message notifications, calls | Needs backend | |

## Campus
| Item | Status | Notes |
|---|---|---|
| Institutions, roles and grants | Local | First device account is super admin; institution founder is school admin; institutions stay unverified until system staff verify. A local bootstrap compromise until a server exists. |
| Communities (posts, announcements, polls, events, members, manage) | Local | |
| Announcements, events | Local | Reminders are generated when the app comes to the foreground (no background service). |
| Timetable | Local | Typed `HH:MM`; conflict detection; reminders as above. |
| Assignments & submissions | Local | Teachers set, students draft/submit, teachers return. "Submitted" means saved on this device only. |
| Academics (subjects, CBC/CBE, resources, assessments) | Local | |
| Opportunities | Local | Listings and saves; applications are not transmitted anywhere. |
| Portfolio | Local | Respects private accounts and blocks. |
| Emergency | Partial | Alerts are recorded locally and shown to accounts on this device. Location is self-typed, ETA is responder-entered. **Emergency services are not contacted.** |
| Unified notifications | Local | Bell with unread count on Home; deep links; deduped. |
| Discover / search | Local | Searches content on this device. |
| Marketplace, payments, GPS, push notifications, real-time sync | Needs backend / not built | |

## Verification status of this build
- Type checking was done with a stubbed-module `tsc`; `npm install` and `expo-doctor` could not be run (registry blocked in the build sandbox).
- No on-device manual testing has been performed.
