"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

const Help: React.FC = () => {
	const router = useRouter();

	return (
		<div className="container mx-auto px-4 py-6 max-w-3xl">
			<div className="flex items-center gap-2 mb-4">
				<Button
					variant="outline"
					size="sm"
					className="gap-1 text-muted-foreground"
					onClick={() => router.push("/teacher/dashboard")}
				>
					<ArrowLeft className="h-4 w-4" />
					<span>Dashboard</span>
				</Button>
			</div>

			<div className="border-b mb-6">
				<h1 className="text-2xl font-semibold py-2 text-gray-700 dark:text-gray-200">
					Hilfe & Anleitungen
				</h1>
			</div>

			<Accordion type="single" collapsible defaultValue="bulk-import">
				<AccordionItem value="bulk-import">
					<AccordionTrigger className="text-left">
						Eine Klasse anlegen und Schüler:innen importieren
					</AccordionTrigger>
					<AccordionContent>
						<div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
							<ol className="list-decimal pl-5 space-y-2">
								<li>
									<strong>Klasse anlegen.</strong> Im Dashboard auf{" "}
									<em>Klassen</em> klicken, dann auf{" "}
									<em>„Klasse anlegen"</em> und einen Namen vergeben (z. B.{" "}
									<em>6b Englisch</em>).
								</li>
								<li>
									<strong>Klassenkarte öffnen</strong>, um die Detailseite
									der Klasse anzuzeigen.
								</li>
								<li>
									<strong>Schüler:innen-Liste eingeben.</strong> Im Feld{" "}
									<em>„Schüler:innen importieren"</em> eine Schüler:in pro
									Zeile eintragen, jeweils <strong>Vorname</strong> und{" "}
									<strong>Initial des Nachnamens</strong>, getrennt durch
									ein Leerzeichen:
									<pre className="mt-2 p-3 rounded-md bg-muted text-sm font-mono leading-relaxed">{`Anna B
Max M
Lea S
Anna Maria S
Max von M`}</pre>
									Mehrteilige Vornamen sind erlaubt — das letzte Wort gilt
									immer als Initial. Maximal 50 Schüler:innen pro Import.
								</li>
								<li>
									<strong>„X importieren" klicken.</strong> Tablet Teaching
									erstellt für jede Schüler:in automatisch eine künstliche
									E-Mail-Adresse und ein Passwort.
								</li>
								<li>
									<strong>Zugangsdaten sichern.</strong> Die Zugangsdaten
									werden <strong>nur einmal</strong> angezeigt. Bitte{" "}
									<em>CSV herunterladen</em> oder <em>Drucken</em> und an
									die Schüler:innen weitergeben.
								</li>
							</ol>

							<h4 className="font-semibold mt-4">Hinweise zum Datenschutz</h4>
							<ul className="list-disc pl-5 space-y-1">
								<li>
									Es werden <strong>keine Nachnamen</strong>,{" "}
									<strong>keine echten E-Mail-Adressen</strong> und keine
									weiteren personenbezogenen Daten der Schüler:innen
									gespeichert.
								</li>
								<li>
									Die erzeugten E-Mail-Adressen sind technische
									Identifikatoren — sie empfangen keine Nachrichten.
								</li>
								<li>
									Passwörter werden nicht gespeichert. Falls eine Schüler:in
									das Passwort vergisst, kann ein neues generiert werden
									(folgt in Kürze).
								</li>
							</ul>
						</div>
					</AccordionContent>
				</AccordionItem>
			</Accordion>

			<p className="text-xs text-muted-foreground mt-8">
				Weitere Anleitungen folgen. Anregungen oder Fragen? Bitte über das
				Kontaktformular (in Vorbereitung) melden.
			</p>
		</div>
	);
};

export default Help;
