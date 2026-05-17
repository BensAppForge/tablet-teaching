# Custom-token student login

## Status

Planned. Depends on the basic student login screen existing first (which itself doesn't exist yet — see TODO.md). Long-term replacement for email + password entry by students.

## Problem

Even with the readable-email + simple-password improvements (`anna-b@tablet-teaching.app` + `katzeblau47`), a 10-year-old on an iPad still has to:

- Find and type `@` (symbol layer on the on-screen keyboard).
- Type `tablet-teaching.app` (18 chars, hyphenated).
- Switch between letters and digits at least once for the password.

For a daily-use product in a classroom, that's still a meaningful friction tax and a source of "I can't log in" disruptions. Email + password is the right *infrastructure* for student accounts (auditable, suspendable, persistent across worksheets), but it shouldn't be the *user-facing* login affordance.

## Goal

Replace the student login form with a single **short login code** field. The student types one short string and is signed in. No `@`, no domain, no separate password.

Example code shape: `6b-anna-b-7` — class moniker, name slug, single check digit. Roughly 10–15 chars, all lowercase letters + digits + hyphens; no symbols.

## Architecture

```
┌─────────────┐   POST { code }    ┌──────────────────────┐
│  Student    │ ─────────────────► │ exchangeStudentCode  │  (callable)
│  on iPad    │                    │   (Cloud Function)   │
│             │ ◄───────────────── │                      │
└──────┬──────┘   { customToken }  └──────────┬───────────┘
       │                                      │
       │  signInWithCustomToken(token)        │  admin.auth().createCustomToken(uid, claims)
       ▼                                      ▼
   Firebase Auth ◄──────────── verifies uid lookup against students/{uid}
```

1. **Code generation.** At bulk-import time the Function generates a code per student (`<class-moniker>-<name-slug>-<2-3 digit suffix>`) and writes it to the `students/{uid}` doc as `loginCode`. Class moniker is a short slug stored on `classes/{classId}` (e.g. `6b`); auto-derived from the class name on first import, editable by teacher.
2. **Exchange.** Student types code. Client calls `exchangeStudentCode({ code })`. The Function:
    - Looks up `students` collection by `loginCode == code` (single-field index).
    - Verifies the student is `active: true`.
    - Rate-limits per IP via a Firestore counter (see "Anti-abuse" below).
    - Issues a custom token via `admin.auth().createCustomToken(uid, { role, classId, teacherId })`.
    - Returns the token to the client.
3. **Sign in.** Client calls `firebase.auth().signInWithCustomToken(token)`. Student is now authenticated, with the same Auth user (same uid) as the email/password flow would produce. Existing custom claims continue to work.

## Why custom tokens, not links

A magic-link email flow (`signInWithEmailLink`) would also avoid password typing, but:

- Synth emails don't receive mail, so there's no inbox to receive the link.
- Students would still need to handle a URL (long, hard to copy on iPad).
- Custom tokens give the teacher direct control over code rotation and revocation without involving an email subsystem we'd otherwise have to build.

## Data model changes

- `classes/{classId}`:
    - `moniker: string` — short slug used as the code prefix. Auto-generated from class name (e.g., `"6b Englisch"` → `"6b"`), editable. Must be unique per teacher.
- `students/{uid}`:
    - `loginCode: string` — full code as typed by the student. Indexed for the exchange lookup.

The synth email + password stay on the account. They're never shown to students after this change but remain in place as the canonical Firebase Auth credential (useful for password-reset edge cases and for the teacher to confirm via the admin dashboard that an account exists).

## Anti-abuse

The code is the only authentication factor, so brute force matters. Mitigations:

- **Rate-limit per IP** at the Function level. Track recent exchange attempts in a Firestore doc keyed by hashed IP; reject after N failures per minute.
- **Code length.** With ~10–15 chars from a 36-char alphabet, even at 5 attempts/min Firebase-side rate, brute force is unrealistic. The bigger risk is *guessing* a known classmate's code, so include a non-name-derived suffix (the `-7` in the example).
- **Suspending an account.** Teacher clicks "Zugang sperren" in the class detail UI; Function flips `active: false` and revokes the Auth user. Subsequent exchange attempts return `unauthenticated` even with the right code.

## UI changes

- **Student login screen** (currently doesn't exist): single `<input>` for the code, a sign-in button, and nothing else. Optional QR-code-scan path for tablets with cameras: teacher prints the code as a QR alongside the plaintext code; tapping a "QR scannen" button opens the camera and auto-fills.
- **Class detail page**: surface the moniker prominently, with an "ändern" affordance. Show each student's `loginCode` in the existing students list (currently shows synth email). Print/CSV of credentials includes the code as the primary field.
- **Teacher profile / class settings**: option to regenerate a single student's code (e.g., "Sammy hat den Zettel verloren") without resetting the underlying account.

## Effort estimate

- Code generator + moniker derivation in the existing bulk-import callable: 0.5 day.
- New `exchangeStudentCode` callable + per-IP rate limiter: 0.5–1 day.
- Student login screen: 0.5 day.
- Class detail UI changes (show moniker, show codes, regenerate-single-code action): 0.5 day.
- Migration for existing students created without `loginCode`: 0.25 day.
- **Total: ~2.5 days** once the basic student login flow exists.

## Open questions

- **Should the code be case-insensitive on the input?** Probably yes — kids will TYPE-LIKE-THIS half the time. Normalise to lowercase in the Function before lookup.
- **What about a student in two classes?** Today the model is one-class-per-student (custom claim has a single `classId`). If we ever need multi-class students, the login code → uid mapping still works but the claim shape needs to grow.
- **QR scanning** as a fallback: nice-to-have, but each QR scan implementation has its own camera-permission UX. Probably skip for v1 and rely on typing.
- **Code rotation policy.** Should codes auto-rotate at end of school year? Currently they're stable for the life of the account. Could add an "alle Codes neu generieren" action per class.

## When to do this

**Prerequisite:** Student login screen exists (currently in TODO as near-term work).

**Do this directly after** the first student login screen ships, before any real classroom pilot. The email/password flow is fine for development and internal testing; the moment students touch the app for real, code-based login is the only sustainable UX.
