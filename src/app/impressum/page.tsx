import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Impressum - Tablet Teaching",
};

export default function ImpressumPage() {
	return (
		<div className="container mx-auto max-w-2xl px-4 py-8">
			<h1 className="text-2xl font-semibold mb-6">Impressum</h1>

			<section className="space-y-6 text-sm leading-relaxed">
				<div>
					<h2 className="text-base font-semibold mb-2">
						Angaben gemäß § 5 DDG
					</h2>
					<p>
						Antonio Bentivoglio (Bensappforge)
						<br />
						{/* TODO: Anschrift vor Veröffentlichung eintragen */}
						[Straße und Hausnummer]
						<br />
						[PLZ und Ort]
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">Kontakt</h2>
					<p>
						E-Mail:{" "}
						<a
							href="mailto:bensappforge@gmail.com"
							className="text-accent underline-offset-4 hover:underline"
						>
							bensappforge@gmail.com
						</a>
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						Verantwortlich für den Inhalt
					</h2>
					<p>Antonio Bentivoglio</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">Datenschutz</h2>
					<p>
						Informationen zur Verarbeitung personenbezogener Daten finden
						Sie in der{" "}
						<Link
							href="/datenschutz"
							className="text-accent underline-offset-4 hover:underline"
						>
							Datenschutzerklärung
						</Link>
						.
					</p>
				</div>
			</section>
		</div>
	);
}
