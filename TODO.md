# Tablet Teaching — Path out of Beta (v1 checklist)

_Last updated: 2026-07-05. Current version: see `package.json`._

The honest list of what still needs doing before a public (non-beta) launch,
ordered by how much it blocks going live.

---

## 🔴 Must do before a public launch (real blockers)

### Legal / DSGVO
- [ ] **Impressum: enter a real postal address.** Currently a visible
      placeholder (`[Straße und Hausnummer]` / `[PLZ und Ort]`) in
      `src/app/impressum/page.tsx`. A German Impressum legally requires a
      ladungsfähige Anschrift.
- [ ] **Have a lawyer / DPO review** the Impressum, Datenschutz and AGB. The
      current texts are sensible boilerplate, not legal advice. The AGB shows a
      "vorläufige Fassung" notice until then.
- [ ] **AVV (Auftragsverarbeitungsvertrag) for schools** — each school is the
      controller; you're the processor and must offer an Art. 28 DSGVO
      agreement. Doesn't exist yet.
- [ ] **Parental consent form** for minors (planned in
      `docs/plans/parent-consent-form.md`). Gate before the first school pilot.
- [ ] **Records of processing** (Verzeichnis von Verarbeitungstätigkeiten).

### Account / data rights
- [ ] **Self-service account deletion** (Art. 17). — _built this session_
- [ ] **Data export** (Art. 20) — teacher self-export of their tests, classes,
      students and results (JSON/CSV).

### Onboarding / access
- [ ] **Decide the sign-up story.** Teacher self-registration is disabled today
      (rules `allow create: if false` on `/teachers` + signup page hidden).
      Either re-enable it or define a manual onboarding process.

### Monetisation prerequisite
- [ ] **Enforce the test-count cap server-side.** The 3-test limit is currently
      client-only and tamperable. Fix in rules or a Function before anything is
      gated behind payment.

---

## 🟠 Important for a solid v1

- [ ] **Settings / profile page** — _built this session_
- [ ] **Change password in-app** — _built this session_
- [ ] **Change email + email verification** (teacher emails are unverified today).
- [ ] **Show AI quota to the teacher** ("X von Y KI-Tests übrig"). Only a
      reactive error toast exists now.
- [ ] **Error monitoring** (e.g. Sentry) — no observability today.
- [ ] **Firestore backup strategy** — only scheduled deleters exist, no backups.

---

## 🟢 Nice to have / later

- [ ] Duplicate a test; archive vs. hard delete (classes have a dead `archived`
      field to wire up).
- [ ] Plain teacher test preview (separate from Besprechen).
- [ ] Results export (CSV/PDF of scores); cross-student per-question analytics.
- [ ] Student attempt history (only the latest attempt is shown today).
- [ ] **Matching editor accessibility** — the teacher's dot-connecting is
      mouse-only; make it keyboard-operable. Plus a screen-reader announcement
      of matching pairings for blind students. (Needs iPad testing.)
- [ ] Full offline test-taking (persistent cache is on; still need to cache
      opened worksheets so a student can complete an assigned test offline).
- [ ] **Stripe monetisation** — buildable in test mode now, parallel to beta.
      Needs the server-side cap (above) first. Decide B2C (teacher pays by card)
      vs. B2B (school pays by invoice) — German schools rarely use cards.
- [ ] Remove the advertised-but-unimplemented watermark feature (or build it).
- [ ] Optional per-test duration (`durationMinutes`) shown to students.

---

## Ops notes (don't forget)

- **New callable Functions may need the `allUsers`/`run.invoker` role.** A
  brand-new v2 `onCall` sometimes doesn't get it automatically, causing a
  browser "CORS error" (really a 403). Fix:
  `gcloud run services add-iam-policy-binding <name> --region=europe-west1 --project=tablet-teaching --member="allUsers" --role="roles/run.invoker"`.
  Check after deploying any new callable (e.g. `deleteAccount`).
- **Set `NEXT_PUBLIC_APP_URL` before the first production deploy** so
  Schnellzugang QR codes encode the production domain, not whichever origin the
  teacher opened the share page from. e.g. `.env.production` with
  `NEXT_PUBLIC_APP_URL=https://tablet-teaching.web.app`.
- **Deploy commands:** `npm run deploy` = hosting only (runs version-sync);
  `npm run deploy:full` = hosting + functions + firestore rules. Backend changes
  need the full one.

---

## ✅ Already done in this beta (high-level)

- **Security:** answer-key leak closed, AI/Gemini spend metered + rate-limited,
  server-authoritative grading, submission/grading rate limits, cascade-delete
  orphan fixes.
- **Robustness:** offline resilience (persistent cache, no blank-screen), deploy
  version-sync fix, TestBuilder/worksheet async-race fixes, consistent
  error/retry states.
- **UX/a11y:** touch-target + aria pass, matching review colour-blind-safe
  (dashed grey), reordering "answered" fix.
- **Besprechung** teacher-led review with consistent, always-reveal feedback.
- **Legal groundwork:** Impressum / Datenschutz (Gemini disclosure corrected) /
  AGB pages (all still need professional review — see above).
