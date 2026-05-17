# Parent Consent Form (Einverständniserklärung)

## Status

Planned — not blocking other work. Lower priority than student login + worksheet PDF export.

## Problem

German schools under DSGVO + Schulgesetze + Landesdatenschutz require parental consent before students use new digital tools, even when those tools store minimal data. Without a template-driven workflow, teachers will either (a) not deploy the app, or (b) write their own legally fragile form.

## Goals

- Generate a printable, parent-signable consent form PDF per class.
- Cover the legal basics: app purpose, what data is stored, who the processor is, where servers are, what rights the data subject has.
- Look professional but be clearly marked as a **template** that should be reviewed by the school's Datenschutzbeauftragte before use.
- Reuse the same PDF rendering pipeline we'll need for worksheet export — this feature validates the pipeline on something legally important.

## Non-goals

- **Storing signed consent forms.** Paper only. Storing them would massively expand the DSGVO surface (parent signatures, possibly full student names).
- **WYSIWYG editing of the legal text.** Template only, with structured fillable fields. Free-form editing invites legally fragile output and turns us into accidental lawyers.
- **Tracking which parents have signed.** Not the app's responsibility; the teacher manages the signed paper copies.
- **Replacing legal advice.** Explicit disclaimer on every page.

## Data model

- `teachers/{uid}` — add optional fields:
  - `schoolName?: string`
  - `schoolAddress?: string`
  - `dpoContact?: string` (school Datenschutzbeauftragte: name + email/phone)
  - `teacherContact?: string` (teacher's school email, typically)
- `classes/{classId}` — no schema changes needed (class name already present).

These live on the teacher profile rather than per class so they're entered once and reused across all classes.

## UI changes

- **Class detail page** (`/class?id=...`): new section "Einverständniserklärung" with a "PDF herunterladen" button. If the teacher profile fields are empty, show an inline prompt to fill them in first (with a link to the profile page).
- **Teacher profile page** (`/profile` or similar — currently does not exist): minimal form to edit the new fields above.
- **`/help`**: new accordion section walking through how to use the form (print, distribute, collect, store).

## Form contents (single-page if possible)

- **Header**: school name, class name, teacher name + contact.
- **Worum geht es?** One-paragraph plain-language description of Tablet Teaching.
- **Welche Daten werden gespeichert?** Explicit list: first name, last-name initial, synthetic email (technical ID, receives no mail), password hash.
- **Welche Daten werden NICHT gespeichert?** Explicit: no last names, no real email addresses, no birthdates, no biometric data, no location data, no analytics on student behaviour.
- **Wer verarbeitet die Daten?** Google LLC via Firebase, with reference to the Google Cloud Data Processing Addendum.
- **Wo werden die Daten verarbeitet?** EU region (currently `europe-west1`).
- **Wie lange werden die Daten gespeichert?** Until the teacher deletes the class or their account.
- **Welche Rechte haben Sie?** Short DSGVO Art. 15–22 summary (Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch).
- **Unterschrift**: lines for parent signature, child signature (where age-appropriate), date.
- **Footer**: QR code → `/datenschutz` + plaintext URL; QR code → Google's privacy notice + plaintext URL. Always print URLs as text in addition to the QR.
- **Bottom of every page**: *"Diese Vorlage ersetzt keine rechtliche Beratung. Bitte vor Verwendung mit der Schule und der/dem Datenschutzbeauftragten abstimmen."*

## Dependencies (what needs to exist first)

- **PDF renderer.** Pick `@react-pdf/renderer`, stand up a minimal generator. Reused for worksheet export later. ~1 day.
- **`/impressum` + `/datenschutz` pages.** Both currently link to nothing from the dashboard. Need at least minimal content so the consent form's QR codes point somewhere stable. ~0.5 day.
- **Teacher profile UI.** Not strictly required (could collect the fields inline on the class detail page) but cleaner long-term. ~0.5 day.
- **QR code generator.** `src/services/qr-code.ts` is currently a stub returning a fixed base64 image. Use a real lightweight library (`qrcode` on npm). ~0.5 day.

## Estimated effort

- PDF renderer setup (reusable): 1 day
- Minimal `/impressum` + `/datenschutz`: 0.5 day
- Teacher profile fields + form: 0.5 day
- Consent form template + integration: 1 day
- QR code generator + plaintext fallback: 0.5 day
- **Total: ~3.5 days**

## Open questions

- **Legal review.** Should the German text be reviewed by a DPO/lawyer before first release? Strongly recommended.
- **Bundesland-specific wording.** Some states have specific phrasings. Probably overkill for v1; rely on generic text + the "review with your DPO" disclaimer.
- **Multilingual forms.** Türkisch, Arabisch, Russisch versions would help parents with limited German. Nice-to-have, not v1.
- **Keeping `/datenschutz` in sync.** Each time the app's data scope changes, that page (and by extension the consent form) must be updated. Needs a process, not just a feature.

## When to do this

**After:**
- Student login UI is working (currently blocked: students have credentials but no login flow).
- Worksheet PDF export is working (so the PDF pipeline is proven on the main feature first).

**Before:**
- First real school pilot.
