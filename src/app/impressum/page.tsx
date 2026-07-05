import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";

export const metadata: Metadata = {
	title: "Impressum - Tablet Teaching",
};

export default function ImpressumPage() {
	return (
		<PageShell title="Impressum" maxWidth="2xl">
			<section className="space-y-6 text-sm leading-relaxed">
				<div>
					<h2 className="text-base font-semibold mb-2">
						Angaben gemäß § 5 DDG
					</h2>
					<p>Antonio Bentivoglio</p>
					<p>Bensappforge</p>
					<p className="mt-1">
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
							href="mailto:info@bensappforge.cloud"
							className="text-accent underline-offset-4 hover:underline"
						>
							info@bensappforge.cloud
						</a>
					</p>
				</div>

				<div>
					<h2 className="text-base font-semibold mb-2">
						Verantwortlich für den Inhalt gemäß § 18 Abs. 2 MStV
					</h2>
					<p>Antonio Bentivoglio (Anschrift wie oben)</p>
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
		</PageShell>
	);
}
