import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
	return (
		<div className="container mx-auto px-4 py-24">
			<div className="max-w-lg mx-auto text-center">
				<h1 className="text-5xl font-bold mb-6 text-gray-800 dark:text-gray-200">
					404
				</h1>
				<h2 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
					Seite nicht gefunden
				</h2>
				<p className="text-gray-600 dark:text-gray-400 mb-8">
					Die Seite, die du suchst, existiert nicht oder ist nicht verfügbar.
				</p>
				<div className="flex justify-center">
					<Button asChild className="flex items-center gap-2">
						<Link href="/">
							<ArrowLeft className="h-4 w-4" />
							Zurück zur Startseite
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
