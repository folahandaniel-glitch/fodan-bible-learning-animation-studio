# Handover report: Fodan Bible Learning Centre & Animation Studio

Prepared from the build session. Everything below states what was actually built and checked. Where something is not done, it says so.

## 1. Repository
Local git repository only: `C:\Users\folah\Documents\fodan-bible-learning-centre`. **No GitHub repository has been created** (the GitHub CLI is not installed on this machine and no credentials were used). To publish: create an empty repo named `fodan-bible-learning-animation-studio` under `folahandaniel-glitch`, then `git remote add origin <url>` and `git push -u origin main`.

## 2. Deployment
**Not deployed.** No Vercel project was created or touched. The existing Fodan CBT project and the existing `fodan-bible-school` (FCGBS) and Fodan Gospel Outreach projects were only *read* (for the Bible texts, timeline, ministry wings and logo, which belong to the same owner). Nothing in them was modified.

## 3. Architecture
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · PostgreSQL via Drizzle ORM. Without `DATABASE_URL` it runs on an embedded PostgreSQL (PGlite) stored in `~/.fodan-bible-learning-centre/` (outside the project), so it works with zero setup. With `DATABASE_URL` it uses any managed PostgreSQL. Migrations and the built-in content load automatically on first start (`src/server/db`, `src/server/seed`).

- `src/server/services/*` is the only code that touches data. Pages call services; services enforce access.
- `entitlements.ts` is the single source of truth for paid access. `content.ts`, `exams.ts`, `games.ts` check it themselves, so a direct URL or API call cannot bypass it.
- `payments.ts` has a provider abstraction (Paystack implemented; a development-only simulator). `settlePayment` is the only code that activates a paid subscription and is idempotent.
- Sessions: random token in an HttpOnly cookie, only an HMAC of it is stored. Passwords: Argon2id.
- Server actions have built-in same-origin protection; JSON/webhook routes authenticate by signature or session.

## 4. Modules: implemented / partial / not implemented
**Implemented and exercised**
- Public website: homepage built from editable sections, wings directory and pages, classes, lessons, Bible story library, Bible reader (KJV, BSB, ASV, Hebrew WLC, Greek TR; all public domain), timeline with dating-uncertainty labels and schematic map, plans, FAQ, contact form (honeypot and rate limit), policy pages.
- Registration for student, parent, teacher and church/school administrator; login; lockout; show/hide password; password strength guidance; forgot/reset (single-use, 30 min); first-login password change; access codes (registration codes never grant paid access; scholarship codes do).
- Paid access: plans, Paystack checkout, signature-verified webhook, server-side verification, duplicate-event protection, amount check, receipts, expiry/renewal/revocation/refund recording, scholarships, family child limits, organisation seat licences, audit trail.
- Student dashboard, lessons, lesson quizzes, CBT engine (server timer, autosave, shuffled questions/options, answer key never sent to the browser, auto-submit, teacher marking of essays, release rules, results, topic breakdown, certificates), 12 Bible games (answers checked on the server, nicknames only on leaderboards).
- Parent portal (secure linking by username plus family code, reports). Teacher portal (classes only by assignment, roster privacy, attendance, assignments, class tests, marking, training). Church/school administrator portal (classes, approvals, invitation codes).
- Super Admin dashboard: real metrics, users and roles, organisations, access codes, plans, payments and entitlements, curriculum and lesson editor with draft→review→approved→published workflow, review queue with Scripture comparison, stories, question bank with Word/Excel/CSV import (★ marker), exams and analytics, homepage and page builder (sections, reorder, hide, duplicate, delete/restore, draft preview at phone/tablet/desktop widths, scheduled publish, versions), branding and logos, menus/footer/contact/rules, e-mail templates and outbox, integrations status, audit log with CSV export, privacy requests with erasure.
- Story Studio: 11 populated templates, editor with autosave and versions, authorised-image upload with licence records, Word (.docx) import with preview, browser narration.
- CROP logo family generated as SVG/PNG/ICO (`npm run brand:assets`), managed from Admin → Branding.
- FODAN SOFTNET ADVMINISTRATIVE control plane at `/softnet` (see §12).

**Partial**
- Curriculum: framework complete (12 classes, all topics with passages); 36 full lessons (3 per class); 240 topics are framework entries only (see §5).
- Stories: 100+ stories/teaching units from Genesis to Revelation (coverage page lists books without a unit); 11 have full scene-by-scene storybooks, the rest have 3-page summaries with the passage text.
- AI animation: planning workflow (script, storyboard, cost estimate) and credit ledger tables only; generation is locked.
- Object storage: files are stored in the database; fine for logos and modest images, not for video/audio at scale.
- Timeline map is schematic (hand-drawn coastline, approximate places) and labelled so.

**Not implemented**
- Team quizzes and teacher-led live competitions; premium text-to-speech; image search/generation providers; PDF/PowerPoint import; generated PDF exports (printing uses the browser's Print to PDF); video rendering workers; live GitHub/Vercel status; push/PWA offline caching; non-English interface and Bible translations (the translation list is code-defined and extensible after licence checks).

## 5. Curriculum coverage and review status
All 12 classes exist with the topic lists specified (22, 24, 24, 24, 22, 20, 24, 24, 23, 24, 23, 22 = 276 topics), each with a Bible passage. **36 topics have full lessons; 240 are framework only and are hidden from learners and counted as incomplete.** All 36 lessons, all stories and all quiz questions were **drafted with AI assistance and have NOT been theologically reviewed**. Every such item shows a visible "Draft teaching content" notice to learners and appears in Admin → Review queue. Nothing becomes "reviewed" until a reviewer records it. Scripture quotations are never typed into content: they are read from the Bible data by reference.

## 6. Database and migrations
Schema in `src/server/db/schema.ts`; SQL migration in `drizzle/` applied automatically at start-up (verified on embedded PostgreSQL). **Not yet run against a managed PostgreSQL** such as Neon: do this on first deployment and watch the logs.

## 7. Environment variables
See `.env.example`. Required for launch: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PAYSTACK_SECRET_KEY`. Optional: `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, image/video/speech keys, `SENTRY_DSN`.

## 8-10. Integration, payment and e-mail status
- **Payments:** Paystack code is written against its documented endpoints (initialize, verify, HMAC-SHA512 webhook). **It has not been tested against Paystack**: no account or keys were available. Before launch: activate the account, set `PAYSTACK_SECRET_KEY`, register `APP_URL/api/payments/webhook/paystack`, make a test-mode payment and confirm the plan activates; re-check Paystack's current docs. Plans are seeded as hidden drafts with **no prices** (prices are yours to set in Admin → Plans).
- **E-mail:** Resend code is written; **not verified**. Without keys, e-mails are held in the outbox and never reported as sent. You need a sending domain verified in Resend.
- Development payment simulator exists only when `NODE_ENV` is not production and no Paystack key is set.

## 11. Test results
`npm test`: **36 tests, all passing** (embedded PostgreSQL): seeded content integrity (all references resolve to real Bible text); registration, login lockout, reset-token single-use and expiry; payment activation only after verified success, duplicate/invalid webhook, amount mismatch, expiry, renewal, revocation, refund, scholarships, family limits, parent-child isolation; import parser and server marking; SVG and upload safety; rate limiting. `npm run typecheck` and `npm run build` pass. Manual browser checks done: homepage, registration, forced first-login password change, admin dashboard and every admin/public page returns 200, locked vs unlocked lesson/story before and after a simulated payment, CBT run with server marking and explanations, a game, plan editing. Not done: automated browser tests, screen-reader testing, full tablet/phone review of every page, load testing, the docx import with a real Word file, e-mail and Paystack live tests.

## 12. Developer control plane
Route `/softnet` (not linked anywhere; signed-in non-developers get 404). Requires role `developer_admin`, password **and** authenticator code in the same session, and re-authentication every 30 minutes. Create one with `npm run admin:create-dev -- email "Name"`. It shows this instance's deployment info, integration health, security events, can suspend/restore the whole app (written reason, audited) and record interventions; it has no access to passwords, payment credentials or other projects. The Super Admin can revoke developer access in Admin → Integrations. Live GitHub/Vercel monitoring and multi-instance management are not built.

## 13-14. Secure Super Admin setup and password change
`npm run admin:bootstrap` creates `folahandaniel@gmail.com` with a one-time temporary password, saved to `~/.fodan-bible-learning-centre/BOOTSTRAP_ADMIN.txt` (outside the project). Sign in at `/login`; you are forced to choose a new password; the temporary one then stops working. Delete the file afterwards. For production, run the same command with `DATABASE_URL` set. Change the password later at Account → Change password.

## 15-18. How to
- **Add users / logos:** Admin → Users and roles → Create an account (temporary password shown once). Admin → Branding and logos → Upload (SVG is sanitised), then "Where each logo appears".
- **Edit the homepage:** Admin → Homepage and pages → Home → Edit content → Save draft → Preview → Publish.
- **Curriculum:** Admin → Curriculum → class → Write lesson / Edit; submit for review; a reviewer approves and publishes.
- **Plans and paid access:** Admin → Plans: set price, untick "Keep as draft". Admin → Payments and access for scholarships, corrections and refunds.

## 19. Backup and maintenance
Back up the PostgreSQL database with your provider's point-in-time recovery or scheduled `pg_dump`; test a restore. Schedule `GET /api/cron/maintenance` daily with `Authorization: Bearer $CRON_SECRET` (reconciles pending payments, plan-expiry reminders). Review the audit log and outbox regularly. Update dependencies and re-run `npm run verify`.

## 20. Remaining work and legal review
Theological review of all drafted content; write the remaining 240 lessons; supply real ministry history/leadership text; legal review of the privacy, safeguarding, terms and subscription pages (they are marked templates) against Nigerian data-protection and child-protection requirements; Paystack/Resend/Postgres live verification; accessibility audit; object storage before large media.
