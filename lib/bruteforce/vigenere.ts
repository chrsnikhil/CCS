import { vigenereDecrypt } from '@/lib/crypto/toy/vigenere';
import { chiSquaredEnglish } from '@/lib/crypto/toy/scoring';
import { vigenereKeyspace } from '@/lib/bruteforce/strategies';

export function crackVigenere(ciphertext: string, minLen = 1, maxLen = 3) {
	let best = { key: 'A', plaintext: ciphertext, score: Number.POSITIVE_INFINITY };
	for (const key of vigenereKeyspace(minLen, maxLen)) {
		const pt = vigenereDecrypt(ciphertext, key);
		const score = chiSquaredEnglish(pt);
		if (score < best.score) best = { key, plaintext: pt, score };
	}
	return best;
}


