"use client";

import React, { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import {
	createCollection,
	TestCollection,
	COLLECTION_NAME_MAX,
} from "@/lib/firebase/collections";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Sentinel option values — real collection ids are Firestore auto-ids, so
// these underscore-wrapped tokens can never collide.
const NONE = "__none__";
const NEW = "__new__";

interface CollectionPickerProps {
	collections: TestCollection[];
	value: string | null;
	onChange: (collectionId: string | null) => void;
	disabled?: boolean;
}

/**
 * Pick the collection a test belongs to, with an inline "create new"
 * affordance. Selecting "Ohne Sammlung" yields null; creating a new
 * collection persists it immediately and selects it.
 */
const CollectionPicker: React.FC<CollectionPickerProps> = ({
	collections,
	value,
	onChange,
	disabled,
}) => {
	const { currentUser } = useAuth();
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [busy, setBusy] = useState(false);

	// Guard against a dangling id (collection deleted): fall back to the
	// "Ohne Sammlung" option so the trigger never renders blank.
	const known = value && collections.some((c) => c.id === value);
	const selectValue = known ? (value as string) : NONE;

	const handleSelect = (val: string) => {
		if (val === NEW) {
			setCreating(true);
			setNewName("");
			return;
		}
		onChange(val === NONE ? null : val);
	};

	const handleCreate = async () => {
		const name = newName.trim();
		if (!name || !currentUser) return;
		setBusy(true);
		try {
			const id = await createCollection(currentUser.uid, name);
			onChange(id);
			setCreating(false);
			setNewName("");
			toast.success("Sammlung erstellt");
		} catch (err) {
			console.error(err);
			toast.error("Sammlung konnte nicht erstellt werden");
		} finally {
			setBusy(false);
		}
	};

	if (creating) {
		return (
			<div className="flex items-center gap-2">
				<Input
					autoFocus
					value={newName}
					maxLength={COLLECTION_NAME_MAX}
					placeholder="Name der Sammlung"
					disabled={busy}
					onChange={(e) => setNewName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							handleCreate();
						} else if (e.key === "Escape") {
							setCreating(false);
						}
					}}
				/>
				<Button
					type="button"
					size="icon"
					onClick={handleCreate}
					disabled={busy || !newName.trim()}
					aria-label="Sammlung erstellen"
				>
					{busy ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Check className="h-4 w-4" />
					)}
				</Button>
				<Button
					type="button"
					size="icon"
					variant="ghost"
					onClick={() => setCreating(false)}
					disabled={busy}
					aria-label="Abbrechen"
				>
					<X className="h-4 w-4" />
				</Button>
			</div>
		);
	}

	return (
		<Select value={selectValue} onValueChange={handleSelect} disabled={disabled}>
			<SelectTrigger>
				<SelectValue placeholder="Sammlung wählen" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={NONE}>Ohne Sammlung</SelectItem>
				{collections.map((c) => (
					<SelectItem key={c.id} value={c.id!}>
						{c.name}
					</SelectItem>
				))}
				<SelectItem value={NEW}>
					<span className="flex items-center gap-2 text-accent">
						<Plus className="h-4 w-4" />
						Neue Sammlung…
					</span>
				</SelectItem>
			</SelectContent>
		</Select>
	);
};

export default CollectionPicker;
