"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
	Class,
	createClass,
	getTeacherClasses,
} from "@/lib/firebase/classes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatDate(value: any): string {
	if (!value) return "Unbekannt";
	const date = value.toDate ? value.toDate() : new Date(value);
	return formatDistanceToNow(date, { addSuffix: true, locale: de });
}

const ClassesManagement: React.FC = () => {
	const { currentUser } = useAuth();
	const router = useRouter();

	const [classes, setClasses] = useState<Class[]>([]);
	const [loading, setLoading] = useState(true);

	const [createOpen, setCreateOpen] = useState(false);
	const [newName, setNewName] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!currentUser) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const data = await getTeacherClasses(currentUser.uid);
				if (!cancelled) setClasses(data);
			} catch (err) {
				console.error(err);
				toast.error("Fehler beim Laden der Klassen");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [currentUser]);

	const handleCreate = async () => {
		if (!currentUser) return;
		const name = newName.trim();
		if (!name) {
			toast.error("Bitte einen Namen eingeben");
			return;
		}

		setSaving(true);
		try {
			const id = await createClass(currentUser.uid, name);
			setClasses((prev) => [
				{ id, teacherId: currentUser.uid, name, archived: false },
				...prev,
			]);
			toast.success("Klasse erstellt");
			setNewName("");
			setCreateOpen(false);
		} catch (err) {
			console.error(err);
			toast.error("Fehler beim Erstellen der Klasse");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="container mx-auto px-4 py-6">
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
					Klassen verwalten
				</h1>
			</div>

			<div className="flex justify-end mb-6">
				<Button
					variant="default"
					className="gap-2"
					onClick={() => setCreateOpen(true)}
				>
					<Plus className="h-4 w-4" />
					Klasse anlegen
				</Button>
			</div>

			{loading ? (
				<div className="flex justify-center items-center py-12">
					<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				</div>
			) : classes.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Users className="h-10 w-10 text-muted-foreground mb-3" />
						<p className="text-muted-foreground">
							Sie haben noch keine Klassen angelegt
						</p>
						<p className="text-sm text-muted-foreground mt-1 mb-4">
							Legen Sie eine Klasse an, um später Schüler:innen hinzuzufügen
						</p>
						<Button onClick={() => setCreateOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Klasse anlegen
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{classes.map((cls) => (
						<Card key={cls.id} className="overflow-hidden">
							<CardContent className="p-5">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0">
										<h2 className="text-lg font-semibold truncate">
											{cls.name}
										</h2>
										<p className="text-xs text-muted-foreground mt-1">
											Erstellt {formatDate(cls.createdAt)}
										</p>
									</div>
									<Users className="h-5 w-5 text-muted-foreground shrink-0" />
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Neue Klasse</DialogTitle>
						<DialogDescription>
							Geben Sie einen Namen für die Klasse ein, z. B. „6b Englisch“.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-2 py-2">
						<Label htmlFor="class-name">Name</Label>
						<Input
							id="class-name"
							autoFocus
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							placeholder="z. B. 6b Englisch"
							onKeyDown={(e) => {
								if (e.key === "Enter" && !saving) handleCreate();
							}}
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCreateOpen(false)}
							disabled={saving}
						>
							Abbrechen
						</Button>
						<Button onClick={handleCreate} disabled={saving}>
							{saving ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Speichern…
								</>
							) : (
								"Klasse anlegen"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default ClassesManagement;
