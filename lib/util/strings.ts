export const ALPHA_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const ALPHA_LOWER = 'abcdefghijklmnopqrstuvwxyz';
export const DIGITS = '0123456789';
export const PRINTABLE = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_
abcdefghijklmnopqrstuvwxyz{|}~`;

export type MaskToken = '?l' | '?u' | '?d' | '?a';

export function expandMask(mask: string): string[] {
	// Returns an array of character sets per position based on mask tokens
	// ?l = lowercase, ?u = uppercase, ?d = digits, ?a = lowercase+uppercase+digits
	const sets: string[] = [];
	for (let i = 0; i < mask.length; ) {
		if (mask[i] === '?' && i + 1 < mask.length) {
			const t = (mask.slice(i, i + 2) as MaskToken);
			switch (t) {
				case '?l':
					sets.push(ALPHA_LOWER);
					break;
				case '?u':
					sets.push(ALPHA_UPPER);
					break;
				case '?d':
					sets.push(DIGITS);
					break;
				case '?a':
					sets.push(ALPHA_LOWER + ALPHA_UPPER + DIGITS);
					break;
				default:
					throw new Error(`Unknown mask token: ${t}`);
			}
			i += 2;
		} else {
			// literal character
			sets.push(mask[i]);
			i += 1;
		}
	}
	return sets;
}

export function* productIter(sets: string[]): Generator<string> {
	// Cartesian product generator over strings in sets as positions
	const lengths = sets.map((s) => s.length);
	if (lengths.some((l) => l === 0)) return;
	const idx = new Array(sets.length).fill(0);
	let done = false;
	while (!done) {
		yield idx.map((i, pos) => sets[pos][i]).join('');
		for (let pos = sets.length - 1; pos >= 0; pos--) {
			idx[pos]++;
			if (idx[pos] < lengths[pos]) break;
			idx[pos] = 0;
			if (pos === 0) done = true;
		}
	}
}

export function simpleMangles(word: string): string[] {
	const variants = new Set<string>();
	variants.add(word);
	variants.add(word.toUpperCase());
	variants.add(word.toLowerCase());
	variants.add(word[0]?.toUpperCase() + word.slice(1).toLowerCase());
	for (const d1 of DIGITS) variants.add(word + d1);
	for (const d1 of DIGITS) for (const d2 of DIGITS) variants.add(word + d1 + d2);
	return Array.from(variants);
}


