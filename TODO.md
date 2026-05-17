# Open work

A rolling list of pending work, scoped by priority. Each item lives here until it's either shipped or moved into a dedicated plan file under `docs/plans/`.

## Near-term

- **Student login UI** — students now have credentials (via the `bulkImportStudents` callable) but no way to sign in. Needs a kid-friendly login screen that accepts the synthetic email + password.
- **Worksheet PDF export** — the original goal: student works through a worksheet on iPad, downloads a well-formatted PDF for GoodNotes import. `src/services/pdf-generator.ts` is currently a 3-line stub returning the literal string `"Sample PDF data"`. Needs a real renderer (probably `@react-pdf/renderer`).
- **`/impressum` and `/datenschutz`** — both linked from the dashboard but don't exist. Need at least minimal content. Blocking dependency for the consent form (see plans below).
- **Student password reset** — promised in the Hilfe text ("folgt in Kürze"). Small admin-SDK callable + UI affordance on the class detail page.
- **Optional test-level duration (exam time)** — the de-scoped competitive flow had per-question time limits, which were dropped. A single optional "Bearbeitungszeit (Minuten)" field on the test (shown on the test card, displayed to students during the worksheet) maps better to actual exam prep. Schema: add `durationMinutes?: number` to `Test`. UI: optional input in `TestGeneralSettingsForm`, chip on the tests list card, surfaced to students once the student-side renderer exists.

## Planned features (have plan files)

- **[Parent consent form (Einverständniserklärung)](docs/plans/parent-consent-form.md)** — printable per-class PDF template for parental consent. Lower priority; depends on the PDF renderer and the basic privacy pages.
- **[Custom-token student login](docs/plans/custom-token-login.md)** — short login code instead of synth email + password. Should ship right after the basic student login screen exists.

## Tech debt to revisit (when the app stabilises)

- `getTest()` in `src/lib/firebase/tests.ts` is ~270 lines with cascading fallback queries and dozens of debug `console.log` calls. Simplify to a single `orderBy("order")` query and strip the logs.
- Two toast systems coexist: `sonner` (mounted in `layout.tsx`) and the radix-based `use-toast.ts` + `toaster.tsx`. Pick one, remove the other.
- Empty `src/app/api/tests/[testId]/` directory exists but is incompatible with `output: "export"` and isn't referenced. Delete it.
- `src/scripts/fetch-test-ids.ts` exists with a dedicated `fetch-test-ids` npm script; verify it's still relevant or remove.
