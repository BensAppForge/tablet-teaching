"use client";

import React from "react";
import PremiumFeatures from "@/components/PremiumFeatures";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	BadgeCheck,
	CheckCircle2,
	CreditCard,
	Zap,
	Lock,
} from "lucide-react";
import PageShell from "@/components/PageShell";

const PremiumFeaturesPage: React.FC = () => {
	return (
		<PageShell
			title="Premium-Funktionen"
			icon={<BadgeCheck className="h-6 w-6 text-yellow-500" />}
			backHref="/teacher/dashboard"
			backLabel="Dashboard"
		>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="md:col-span-2">
					<Tabs defaultValue="features" className="w-full">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="features" className="flex items-center gap-1">
								<Zap className="h-4 w-4" />
								<span>Funktionen</span>
							</TabsTrigger>
							<TabsTrigger value="pricing" className="flex items-center gap-1">
								<CreditCard className="h-4 w-4" />
								<span>Preise</span>
							</TabsTrigger>
							<TabsTrigger value="faq" className="flex items-center gap-1">
								<CheckCircle2 className="h-4 w-4" />
								<span>FAQ</span>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="features" className="space-y-4 mt-4">
							<Card>
								<CardHeader>
									<CardTitle>Erweiterte Funktionen</CardTitle>
									<CardDescription>
										Entdecken Sie alle verfügbaren Premium-Funktionen
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid gap-4">
										<div className="flex items-start space-x-3">
											<div className="mt-1 bg-yellow-100 dark:bg-yellow-900/40 p-1.5 rounded-full">
												<Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
											</div>
											<div>
												<h3 className="text-lg font-medium flex items-center">
													Tests erstellen
													<BadgeCheck className="h-4 w-4 ml-1.5 text-yellow-500" />
												</h3>
												<p className="text-muted-foreground">
													Erstellen Sie maßgeschneiderte Tests für Ihre Schüler.
													<span className="block mt-1 text-sm text-amber-600 dark:text-amber-400">
														<Lock className="h-3 w-3 inline mr-1" />
														Basis: Maximal 3 Tests
													</span>
													<span className="block text-sm text-green-600 dark:text-green-400">
														<CheckCircle2 className="h-3 w-3 inline mr-1" />
														Premium: Unbegrenzte Tests
													</span>
												</p>
											</div>
										</div>

										<div className="flex items-start space-x-3">
											<div className="mt-1 bg-blue-100 dark:bg-blue-900/40 p-1.5 rounded-full">
												<Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
											</div>
											<div>
												<h3 className="text-lg font-medium flex items-center">
													KI-Testgenerierung
													<BadgeCheck className="h-4 w-4 ml-1.5 text-yellow-500" />
												</h3>
												<p className="text-muted-foreground">
													Generieren Sie maßgeschneiderte Tests basierend auf
													Ihrem Lehrplan mit Hilfe von KI.
													<span className="block mt-1 text-sm text-amber-600 dark:text-amber-400">
														<Lock className="h-3 w-3 inline mr-1" />
														Basis: 1 KI-Test pro Monat
													</span>
													<span className="block text-sm text-green-600 dark:text-green-400">
														<CheckCircle2 className="h-3 w-3 inline mr-1" />
														Premium: Unbegrenzte KI-Tests
													</span>
												</p>
											</div>
										</div>

										<div className="flex items-start space-x-3">
											<div className="mt-1 bg-green-100 dark:bg-green-900/40 p-1.5 rounded-full">
												<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
											</div>
											<div>
												<h3 className="text-lg font-medium flex items-center">
													PDF-Export
													<BadgeCheck className="h-4 w-4 ml-1.5 text-yellow-500" />
												</h3>
												<p className="text-muted-foreground">
													Exportieren Sie Tests als PDF-Dateien für den Druck.
													<span className="block mt-1 text-sm text-amber-600 dark:text-amber-400">
														<Lock className="h-3 w-3 inline mr-1" />
														Basis: Mit Wasserzeichen
													</span>
													<span className="block text-sm text-green-600 dark:text-green-400">
														<CheckCircle2 className="h-3 w-3 inline mr-1" />
														Premium: Ohne Wasserzeichen
													</span>
												</p>
											</div>
										</div>

										<div className="flex items-start space-x-3">
											<div className="mt-1 bg-purple-100 dark:bg-purple-900/40 p-1.5 rounded-full">
												<CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
											</div>
											<div>
												<h3 className="text-lg font-medium flex items-center">
													Statistiken
													<BadgeCheck className="h-4 w-4 ml-1.5 text-yellow-500" />
												</h3>
												<p className="text-muted-foreground">
													Auswertungen der Testergebnisse mit Visualisierungen.
													<span className="block mt-1 text-sm text-amber-600 dark:text-amber-400">
														<Lock className="h-3 w-3 inline mr-1" />
														Basis: Grundlegende Statistiken
													</span>
													<span className="block text-sm text-green-600 dark:text-green-400">
														<CheckCircle2 className="h-3 w-3 inline mr-1" />
														Premium: Erweiterte Analysen und Empfehlungen
													</span>
												</p>
											</div>
										</div>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="pricing" className="space-y-4 mt-4">
							<Card>
								<CardHeader>
									<CardTitle>Preise</CardTitle>
									<CardDescription>
										Wählen Sie den für Sie passenden Tarif
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid gap-6 md:grid-cols-2">
										<Card className="border-2 border-muted">
											<CardHeader>
												<CardTitle>Monatlich</CardTitle>
												<CardDescription>
													Flexible monatliche Zahlung
												</CardDescription>
											</CardHeader>
											<CardContent>
												<div className="text-3xl font-bold">
													9,99 €
													<span className="text-sm font-normal text-muted-foreground">
														{" "}
														/ Monat
													</span>
												</div>
												<ul className="mt-4 space-y-2">
													<li className="flex items-center">
														<CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
														<span className="text-sm">
															Alle Premium-Funktionen ohne Einschränkungen
														</span>
													</li>
													<li className="flex items-center">
														<CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
														<span className="text-sm">Monatlich kündbar</span>
													</li>
												</ul>
											</CardContent>
										</Card>

										<Card className="border-2 border-yellow-500 dark:border-yellow-400">
											<CardHeader>
												<CardTitle>Jährlich</CardTitle>
												<CardDescription>
													Sparen Sie mit dem Jahresabo
												</CardDescription>
											</CardHeader>
											<CardContent>
												<div className="text-3xl font-bold">
													7,99 €
													<span className="text-sm font-normal text-muted-foreground">
														{" "}
														/ Monat
													</span>
												</div>
												<div className="text-sm text-muted-foreground">
													95,88 € jährlich
												</div>
												<div className="mt-2 inline-block bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs px-2 py-1 rounded">
													20% Ersparnis
												</div>
												<ul className="mt-4 space-y-2">
													<li className="flex items-center">
														<CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
														<span className="text-sm">
															Alle Premium-Funktionen ohne Einschränkungen
														</span>
													</li>
													<li className="flex items-center">
														<CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
														<span className="text-sm">Jährliche Zahlung</span>
													</li>
												</ul>
											</CardContent>
										</Card>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="faq" className="space-y-4 mt-4">
							<Card>
								<CardHeader>
									<CardTitle>Häufig gestellte Fragen</CardTitle>
									<CardDescription>
										Antworten auf Ihre Fragen zu Premium-Funktionen
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-4">
										<div>
											<h3 className="text-base font-medium">
												Welche Funktionen sind in der Basis-Version enthalten?
											</h3>
											<p className="text-sm text-muted-foreground mt-1">
												In der Basis-Version können Sie alle Funktionen nutzen,
												aber mit Einschränkungen: Sie können 3 Tests erstellen,
												1 KI-Test pro Monat generieren, PDFs mit Wasserzeichen
												exportieren und erhalten grundlegende Statistiken.
											</p>
										</div>

										<div>
											<h3 className="text-base font-medium">
												Wie kann ich Premium aktivieren?
											</h3>
											<p className="text-sm text-muted-foreground mt-1">
												Sie können die Premium-Funktion direkt über die
												Schaltfläche in Ihrem Profil oder auf dieser Seite
												aktivieren. Die Zahlung erfolgt sicher über unseren
												Zahlungsdienstleister.
											</p>
										</div>

										<div>
											<h3 className="text-base font-medium">
												Kann ich mein Abonnement kündigen?
											</h3>
											<p className="text-sm text-muted-foreground mt-1">
												Ja, Sie können Ihr Abonnement jederzeit in Ihren
												Kontoeinstellungen kündigen. Bei monatlicher Zahlung
												endet das Abonnement am Ende des Abrechnungszeitraums,
												bei jährlicher Zahlung am Ende des Jahres.
											</p>
										</div>

										<div>
											<h3 className="text-base font-medium">
												Was passiert mit meinen Daten, wenn mein Premium-Abo
												endet?
											</h3>
											<p className="text-sm text-muted-foreground mt-1">
												Alle Ihre erstellten Tests bleiben erhalten, aber Sie
												können keine neuen erstellen, wenn Sie das Limit von 3
												Tests überschritten haben. Sie können weiterhin auf alle
												Ihre Daten zugreifen und diese verwalten.
											</p>
										</div>

										<div>
											<h3 className="text-base font-medium">
												Was ist ein Beta-Tester?
											</h3>
											<p className="text-sm text-muted-foreground mt-1">
												Beta-Tester erhalten Zugang zu allen Premium-Funktionen
												und können neue Features vor allen anderen testen. Sie
												helfen uns durch Feedback, die Anwendung zu verbessern.
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>

				<div>
					<PremiumFeatures />
				</div>
			</div>
		</PageShell>
	);
};

export default PremiumFeaturesPage;
