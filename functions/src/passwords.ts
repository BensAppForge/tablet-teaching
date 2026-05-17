import { randomInt } from "node:crypto";

// Curated short German nouns without umlauts/ß. Kept easy to type on an
// iPad keyboard. Roughly 100 entries → 100^2 × 100 ≈ 10^6 combinations per
// password, which is moot vs. Firebase Auth rate limits but plenty.
const WORDS = [
	"katze", "hund", "maus", "fisch", "vogel", "kuh", "ente", "esel", "lamm",
	"frosch", "biene", "igel", "hase", "fuchs", "wolf", "tiger", "affe", "robbe",
	"eule", "krebs", "delfin", "kamel", "panda", "pinguin", "schaf", "ziege",
	"rot", "blau", "gelb", "lila", "pink", "braun", "grau", "gold", "silber",
	"baum", "blume", "wald", "see", "berg", "fluss", "meer", "stein", "gras",
	"blatt", "wolke", "regen", "schnee", "eis", "sonne", "mond", "stern", "pilz",
	"moos", "feder", "muschel", "koralle", "insel", "wueste",
	"brot", "milch", "apfel", "birne", "banane", "kuchen", "suppe", "salat",
	"pizza", "eier", "reis", "salz", "honig", "kirsche", "traube", "gurke",
	"karotte", "tomate", "nudel", "keks", "schoki", "saft",
	"ball", "puppe", "auto", "bus", "zug", "schiff", "drache", "buch", "stift",
	"lampe", "tisch", "stuhl", "tasse", "teller", "kissen", "decke", "uhr",
	"brille", "garten", "wiese",
];

const DIGITS = "0123456789";

function pickWord(): string {
	return WORDS[randomInt(0, WORDS.length)];
}

function pick2Digits(): string {
	return DIGITS[randomInt(0, 10)] + DIGITS[randomInt(0, 10)];
}

/**
 * Memorable 2-word + 2-digit password, all lowercase, no separators —
 * e.g. "katzeblau47". Optimised for hand-entry on iPad keyboards: no
 * hyphen-hunting, no symbol layer, no case switch.
 * ~100 × 100 × 100 = 1M combos. Firebase Auth rate-limits brute force,
 * so entropy isn't the bottleneck — typability is.
 */
export function generatePassword(): string {
	return `${pickWord()}${pickWord()}${pick2Digits()}`;
}

/**
 * Sanitise a German name into a lowercase ASCII slug suitable for an email
 * local-part. Umlauts/ß expand to ae/oe/ue/ss; remaining accents are
 * stripped; non-[a-z0-9] becomes a hyphen; hyphens are collapsed/trimmed.
 *
 * Examples:
 *   "Jörg"        -> "joerg"
 *   "Anna Maria"  -> "anna-maria"
 *   "François"    -> "francois"
 */
export function sanitiseNamePart(s: string): string {
	return s
		.toLowerCase()
		.replace(/ä/g, "ae")
		.replace(/ö/g, "oe")
		.replace(/ü/g, "ue")
		.replace(/ß/g, "ss")
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/**
 * Canonical email local-part for a student, e.g. "anna-b" for
 * firstName="Anna", lastInitial="B". Collisions are resolved by the
 * caller (which appends "-2", "-3", … and retries createUser).
 */
export function buildEmailLocalBase(
	firstName: string,
	lastInitial: string
): string {
	const fn = sanitiseNamePart(firstName);
	const li = sanitiseNamePart(lastInitial);
	if (fn && li) return `${fn}-${li}`;
	if (fn) return fn;
	if (li) return li;
	// Pathological input (name was all special chars). Fall back to a
	// short opaque local-part so we don't fail the whole import.
	return `s-${randomInt(100000, 999999)}`;
}
