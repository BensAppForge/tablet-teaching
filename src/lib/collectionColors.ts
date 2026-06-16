// Preset palette for collection (folder) colours. Teachers pick one of a
// fixed set so every folder still sits within the app's visual language
// rather than an arbitrary colour wheel. Keys are stored on the collection
// doc (`color` field); everything else (labels, Tailwind classes) is
// derived here so the picker, the folder tile and any future surface stay
// in sync.
//
// IMPORTANT: the class strings below are written out in full (no
// `bg-${x}-50` interpolation) so Tailwind's content scanner keeps them —
// dynamically-built class names would be purged from the production CSS.

export type CollectionColor =
	| "blue"
	| "green"
	| "purple"
	| "rose"
	| "amber"
	| "teal";

export const DEFAULT_COLLECTION_COLOR: CollectionColor = "blue";

export interface CollectionColorDef {
	key: CollectionColor;
	label: string;
	/** Solid swatch for the picker dot. */
	dot: string;
	/** Folder icon tint. */
	icon: string;
	/** Subtle tinted tile surface + border (folder grid). */
	tile: string;
}

export const COLLECTION_COLORS: CollectionColorDef[] = [
	{
		key: "blue",
		label: "Blau",
		dot: "bg-blue-500",
		icon: "text-blue-500 dark:text-blue-400",
		tile: "border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:hover:bg-blue-950/70",
	},
	{
		key: "green",
		label: "Grün",
		dot: "bg-emerald-500",
		icon: "text-emerald-500 dark:text-emerald-400",
		tile: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70",
	},
	{
		key: "purple",
		label: "Lila",
		dot: "bg-violet-500",
		icon: "text-violet-500 dark:text-violet-400",
		tile: "border-violet-200 bg-violet-50 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/40 dark:hover:bg-violet-950/70",
	},
	{
		key: "rose",
		label: "Rosa",
		dot: "bg-rose-500",
		icon: "text-rose-500 dark:text-rose-400",
		tile: "border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:hover:bg-rose-950/70",
	},
	{
		key: "amber",
		label: "Bernstein",
		dot: "bg-amber-500",
		icon: "text-amber-500 dark:text-amber-400",
		tile: "border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:hover:bg-amber-950/70",
	},
	{
		key: "teal",
		label: "Türkis",
		dot: "bg-teal-500",
		icon: "text-teal-500 dark:text-teal-400",
		tile: "border-teal-200 bg-teal-50 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/40 dark:hover:bg-teal-950/70",
	},
];

const COLOR_MAP: Record<string, CollectionColorDef> = Object.fromEntries(
	COLLECTION_COLORS.map((c) => [c.key, c])
);

/** Resolve a stored colour key to its definition, falling back to default. */
export function collectionColor(key?: string | null): CollectionColorDef {
	return (key && COLOR_MAP[key]) || COLOR_MAP[DEFAULT_COLLECTION_COLOR];
}
