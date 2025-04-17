"use client";

import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export const ToastExamples = () => {
	const router = useRouter();

	// Basic toasts
	const showSuccessToast = () => {
		toast.success("Aktion erfolgreich");
	};

	const showErrorToast = () => {
		toast.error("Es ist ein Fehler aufgetreten");
	};

	const showInfoToast = () => {
		toast.info("Informationshinweis");
	};

	const showWarningToast = () => {
		toast.warning("Warnung: Wichtige Information");
	};

	// Toast with description
	const showToastWithDescription = () => {
		toast.success("Test gespeichert", {
			description: "Der Test wurde erfolgreich in der Datenbank gespeichert.",
		});
	};

	// Toast with custom duration
	const showToastWithDuration = () => {
		toast("Kurze Nachricht", {
			duration: 2000, // 2 seconds
		});
	};

	// Toast with action
	const showToastWithAction = () => {
		toast("Test erstellt", {
			action: {
				label: "Anzeigen",
				onClick: () => router.push("/tests"),
			},
		});
	};

	// Toast with custom position
	const showToastWithPosition = () => {
		toast("Nachricht unten", {
			position: "bottom-center",
		});
	};

	// Toast with promise
	const showPromiseToast = () => {
		// Simulate an async operation
		const promise = new Promise((resolve) => {
			setTimeout(() => resolve({ name: "Testname" }), 2000);
		});

		toast.promise(promise, {
			loading: "Test wird geladen...",
			success: (data: any) => `Test ${data.name} geladen`,
			error: "Fehler beim Laden des Tests",
		});
	};

	return (
		<div className="p-4 space-y-4">
			<h1 className="text-2xl font-bold">Toast Beispiele</h1>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Button onClick={showSuccessToast}>Success Toast</Button>

				<Button onClick={showErrorToast} variant="destructive">
					Error Toast
				</Button>

				<Button onClick={showInfoToast} variant="outline">
					Info Toast
				</Button>

				<Button onClick={showWarningToast} variant="secondary">
					Warning Toast
				</Button>

				<Button onClick={showToastWithDescription}>Mit Beschreibung</Button>

				<Button onClick={showToastWithDuration}>Kurze Dauer</Button>

				<Button onClick={showToastWithAction}>Mit Aktion</Button>

				<Button onClick={showToastWithPosition}>Andere Position</Button>

				<Button onClick={showPromiseToast} className="col-span-2">
					Promise Toast
				</Button>
			</div>
		</div>
	);
};
