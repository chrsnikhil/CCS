import { caesarDecrypt } from '@/lib/crypto/toy/caesar';
import { chiSquaredEnglish } from '@/lib/crypto/toy/scoring';

export function crackCaesar(ciphertext: string): { shift: number; plaintext: string; score: number } {
	let best = { shift: 0, plaintext: ciphertext, score: Number.POSITIVE_INFINITY };
	for (let s = 0; s < 26; s++) {
		const pt = caesarDecrypt(ciphertext, s);
		const score = chiSquaredEnglish(pt);
		if (score < best.score) best = { shift: s, plaintext: pt, score };
	}
	return best;
}


