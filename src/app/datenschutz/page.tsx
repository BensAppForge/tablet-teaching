import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Datenschutz - Tablet Teaching",
};

// Datenschutzerklärung. Inhaltlich an der tatsächlichen Datenverarbeitung
// der App ausgerichtet (Stand Juni 2026): Firebase Auth/Firestore in
// europe-west10 (Berlin), Cloud Functions in europe-west1, keine
// Tracking- oder Werbedienste, KI-Generierung nur lehrkraftseitig.
export default function DatenschutzPage() {
	return (
		<div className="container mx-auto max-w-2xl px-4 py-8">
			<h1 className="text-2xl font-semibold mb-6">Datenschutzerklärung</h1>

			<section className="space-y-6 text-sm leading-relaxed">
				<div>
					<h2 className="text-base font-semibold mb-2">1. Verantwortlicher</h2>
					<p>
						Verantwortlich für die Datenverarbeitung in dieser App ist die
						im{" "}
						<Link
							href="/impressum"
							className="text-accent underline-offset-4 hover:underline"
						>
							Impressum
						</Link>{" "}
						genannte Person.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						2. Welche Daten verarbeitet werden
					</h2>
					<p className="font-medium mt-2">Lehrkräfte</p>
					<p>
						Bei der Registrierung werden Vorname, Nachname und
						E-Mail-Adresse gespeichert. Sie dienen ausschließlich der
						Anmeldung und Kontoverwaltung.
					</p>
					<p className="font-medium mt-3">
						Schüler:innen mit Klassenzugang
					</p>
					<p>
						Lehrkräfte legen Zugänge mit dem Prinzip der Datenminimierung
						an: gespeichert werden nur der Vorname und der erste Buchstabe
						des Nachnamens. Die Anmeldung erfolgt über systemgenerierte
						(synthetische) E-Mail-Adressen — echte E-Mail-Adressen von
						Schüler:innen werden weder erhoben noch gespeichert. Zusätzlich
						werden die Ergebnisse bearbeiteter Arbeitsblätter (Punktzahl
						und richtig/falsch pro Aufgabe) für die Lehrkraft gespeichert.
						Lehrkräfte können Zugänge und Ergebnisse jederzeit löschen.
					</p>
					<p className="font-medium mt-3">Schnellzugang</p>
					<p>
						Beim Schnellzugang per Code wird kein Konto angelegt. Der
						selbst eingegebene Anzeigename wird einem anonymen,
						temporären Zugang zugeordnet, der nach 24 Stunden automatisch
						gelöscht wird. Ergebnisse aus dem Schnellzugang werden nicht
						auf dem Server gespeichert, sondern verbleiben ausschließlich
						lokal auf dem verwendeten Gerät.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						3. Wo die Daten gespeichert werden
					</h2>
					<p>
						Die App nutzt Google Firebase (Anbieter: Google Ireland
						Limited, Gordon House, Barrow Street, Dublin 4, Irland) für
						Anmeldung, Datenbank und Bereitstellung. Die Datenbank wird in
						der Region <strong>europe-west10 (Berlin, Deutschland)</strong>{" "}
						betrieben; serverseitige Funktionen laufen in der Region
						europe-west1 (Belgien). Mit Google besteht ein
						Auftragsverarbeitungsvertrag nach Art. 28 DSGVO (Google Cloud
						Data Processing Addendum).
					</p>
					<p className="mt-2">
						Zusätzlich speichert die App den Bearbeitungsstand von
						Arbeitsblättern lokal im Browser des Geräts (localStorage),
						damit keine Eingaben verloren gehen. Diese Daten verlassen das
						Gerät nicht, sofern oben nichts anderes beschrieben ist.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						4. KI-gestützte Aufgabenerstellung
					</h2>
					<p>
						Lehrkräfte können Aufgaben mit Unterstützung eines KI-Modells
						(Google Gemini) erstellen. Dabei werden ausschließlich die von
						der Lehrkraft eingegebenen Themen- und Aufgabenbeschreibungen
						an das Modell übermittelt — niemals Daten von Schüler:innen
						oder deren Ergebnisse.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						5. Kein Tracking, keine Werbung
					</h2>
					<p>
						Die App verwendet keine Analyse- oder Werbedienste, keine
						Tracking-Cookies und kein Profiling. Es werden nur technisch
						notwendige Daten verarbeitet.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						6. Ihre Rechte
					</h2>
					<p>
						Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung
						(Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung
						(Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch
						(Art. 21). Wenden Sie sich dazu an die im Impressum genannte
						Kontaktadresse. Außerdem besteht ein Beschwerderecht bei einer
						Datenschutz-Aufsichtsbehörde.
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">7. Stand</h2>
					<p>Juni 2026</p>
				</div>
			</section>
		</div>
	);
}
