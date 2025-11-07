import { xorDecryptHexToUtf8 } from '@/lib/crypto/toy/xor';
import { printableRatio } from '@/lib/crypto/toy/scoring';

export function crackXorSingleByte(ciphertextHex: string): { key: number; plaintext: string; score: number } {
	let best = { key: 0, plaintext: '', score: -1 };
	for (let k = 0; k < 256; k++) {
		const pt = xorDecryptHexToUtf8(ciphertextHex, k);
		const score = printableRatio(pt);
		if (score > best.score) best = { key: k, plaintext: pt, score };
	}
	return best;
}


