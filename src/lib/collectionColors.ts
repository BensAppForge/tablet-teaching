// Preset palette for collection (folder) colours. Teachers pick one of a
// fixed set so every folder still sits within the app's visual language
// rather than an arbitrary colour wheel. Keys are stored on the collection
// doc (`color` field); everything else (labels, Tailwind classes) is
// derived here so the picker, the folder tile and any future surface stay
// in sync.
//
// The colour only tints the FOLDER ICON (its stroke + a soft fill) — the
// tile/card itself stays neutral. "neutral" is the default and lets a
// teacher return a folder to no colour.
//
// IMPORTANT: the class strings below are written out in full (no
// `bg-${x}-50` interpolation) so Tailwind's content scanner keeps them —
// dynamically-built class names would be purged from the production CSS.
// NOTE: src/lib must be in tailwind.config.ts `content` for that to work.

export type CollectionColor =
	| "neutral"
	| "blue"
	| "green"
	| "purple"
	| "rose"
	| "amber"
	| "teal";

export const DEFAULT_COLLECTION_COLOR: CollectionColor = "neutral";

export interface CollectionColorDef {
	key: CollectionColor;
	label: string;
	/** Solid swatch for the picker dot. */
	dot: string;
	/** Folder icon tint: stroke (text-) + soft fill (fill-). */
	icon: string;
}

export const COLLECTION_COLORS: CollectionColorDef[] = [
	{
		key: "neutral",
		label: "Neutral",
		dot: "bg-slate-300 dark:bg-slate-600",
		icon: "text-muted-foreground fill-muted-foreground/15",
	},
	{
		key: "blue",
		label: "Blau",
		dot: "bg-blue-500",
		icon: "text-blue-500 fill-blue-500/25 dark:text-blue-400 dark:fill-blue-400/25",
	},
	{
		key: "green",
		label: "Grün",
		dot: "bg-emerald-500",
		icon: "text-emerald-500 fill-emerald-500/25 dark:text-emerald-400 dark:fill-emerald-400/25",
	},
	{
		key: "purple",
		label: "Lila",
		dot: "bg-violet-500",
		icon: "text-violet-500 fill-violet-500/25 dark:text-violet-400 dark:fill-violet-400/25",
	},
	{
		key: "rose",
		label: "Rosa",
		dot: "bg-rose-500",
		icon: "text-rose-500 fill-rose-500/25 dark:text-rose-400 dark:fill-rose-400/25",
	},
	{
		key: "amber",
		label: "Bernstein",
		dot: "bg-amber-500",
		icon: "text-amber-500 fill-amber-500/25 dark:text-amber-400 dark:fill-amber-400/25",
	},
	{
		key: "teal",
		label: "Türkis",
		dot: "bg-teal-500",
		icon: "text-teal-500 fill-teal-500/25 dark:text-teal-400 dark:fill-teal-400/25",
	},
];

const COLOR_MAP: Record<string, CollectionColorDef> = Object.fromEntries(
	COLLECTION_COLORS.map((c) => [c.key, c])
);

/** Resolve a stored colour key to its definition, falling back to default. */
export function collectionColor(key?: string | null): CollectionColorDef {
	return (key && COLOR_MAP[key]) || COLOR_MAP[DEFAULT_COLLECTION_COLOR];
}
