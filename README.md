# Fodan Bible Learning Centre & Animation Studio

A Bible education platform of **Fodan Gospel Outreach**, with **CROP (Child Rescue Operation Programmes)** as its children's wing: Primary 1 to SSS 3 curriculum, Bible story library, CBT examinations, games, timeline, parent/teacher/church portals, subscriptions with server-enforced paid access, and an admin dashboard. Built so any church or school can be added as an organisation.

Read [docs/HANDOVER.md](docs/HANDOVER.md) first: it states exactly what works, what is partial and what is not done.

## Run locally (no setup needed)
```bash
npm install
npm run admin:bootstrap     # creates the Super Admin; prints a one-time password
npm run dev                 # http://localhost:3000
```
The embedded database and built-in content (curriculum framework, lessons, stories, questions, Bible texts, timeline, wings) load automatically. Data is kept in `~/.fodan-bible-learning-centre/`.

## Commands
`npm test` · `npm run typecheck` · `npm run build` · `npm run verify` · `npm run brand:assets` (rebuild logo files) · `npm run db:generate` (after schema changes) · `npm run admin:create-dev` (developer control-plane account)

## Production
Set the variables in `.env.example` (at least `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, Resend and Paystack keys), deploy to Vercel, run `npm run admin:bootstrap` once against the production database. See the handover for the launch checklist.

Bible texts are public-domain translations (KJV, BSB, ASV, WLC, Textus Receptus). Teaching content is AI-drafted and unreviewed until a ministry reviewer approves it.
