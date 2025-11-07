import { ALPHA_UPPER } from '../util/strings';
import { expandMask, productIter, simpleMangles } from '../util/strings';

export function* caesarKeyspace(): Generator<number> {
	for (let s = 0; s < 26; s++) yield s;
}

export function* vigenereKeyspace(minLen = 1, maxLen = 3): Generator<string> {
	const alphabet = ALPHA_UPPER;
	for (let len = minLen; len <= maxLen; len++) {
		const sets = Array.from({ length: len }, () => alphabet);
		yield* productIter(sets);
	}
}

export function* xorKeyspace(): Generator<number> {
	for (let b = 0; b < 256; b++) yield b;
}

export function* dictionary(words: string[], mangle = false): Generator<string> {
	for (const w of words) {
		if (!mangle) {
			yield w;
			continue;
		}
		for (const v of simpleMangles(w)) yield v;
	}
}

export function* mask(maskPattern: string): Generator<string> {
	const sets = expandMask(maskPattern);
	yield* productIter(sets);
}


