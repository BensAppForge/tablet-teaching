import { randomBytes, randomInt } from "node:crypto";

// Curated short German nouns without umlauts/ß. Kept easy to type on an
// iPad keyboard. Roughly 100 entries → 100^3 × 100 ≈ 10^8 combinations per
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
	"brille", "schluessel", "garten", "wiese",
];

const DIGITS = "0123456789";

function pickWord(): string {
	return WORDS[randomInt(0, WORDS.length)];
}

function pick2Digits(): string {
	const a = DIGITS[randomInt(0, DIGITS.length)];
	const b = DIGITS[randomInt(0, DIGITS.length)];
	return a + b;
}

/**
 * Memorable 3-word + 2-digit password, e.g. "katze-blau-haus-47".
 * Designed for hand-entry on iPad keyboards by 8-14 year olds.
 */
export function generatePassword(): string {
	return `${pickWord()}-${pickWord()}-${pickWord()}-${pick2Digits()}`;
}

// Local-part alphabet for synth emails: lowercase letters + digits 2-9
// (no 0, 1 to avoid being mistaken for o, l, i).
const EMAIL_ALPHABET = "abcdefghijklmnopqrstuvwxyz23456789";

/**
 * Random 6-char local part, e.g. "s-abc23k".
 */
export function generateEmailLocal(): string {
	const buf = randomBytes(6);
	let out = "";
	for (let i = 0; i < 6; i++) {
		out += EMAIL_ALPHABET[buf[i] % EMAIL_ALPHABET.length];
	}
	return `s-${out}`;
}
