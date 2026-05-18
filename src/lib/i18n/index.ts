import { de } from "./de";
import { en } from "./en";
import { fr } from "./fr";
import { es } from "./es";
import { it } from "./it";
import type { Locale, Strings } from "./types";

export type { Locale, Strings, PdfStrings, WorksheetStrings } from "./types";

const DICT: Record<Locale, Strings> = { de, en, fr, es, it };

export function getStrings(locale: Locale | string | undefined | null): Strings {
	const key = (locale ?? "de") as Locale;
	return DICT[key] ?? DICT.de;
}

// Map the free-text `Test.targetLanguage` field (e.g. "Englisch") to
// the closest supported locale code. Accepts both German and English
// language names because the form currently stores German labels but
// the API surface is unspecified. Defaults to German.
export function mapTargetLanguageToLocale(lang: string | undefined): Locale {
	if (!lang) return "de";
	switch (lang.trim().toLowerCase()) {
		case "deutsch":
		case "german":
			return "de";
		case "englisch":
		case "english":
			return "en";
		case "französisch":
		case "franzoesisch":
		case "french":
			return "fr";
		case "spanisch":
		case "spanish":
			return "es";
		case "italienisch":
		case "italian":
			return "it";
		default:
			return "de";
	}
}
