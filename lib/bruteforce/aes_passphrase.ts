import { decryptWithPassphrase } from '@/lib/crypto/aes_pbkdf2';
import type { AesPBKDF2Pair } from '@/lib/types';
import { dictionary as dictIter, mask as maskIter } from '@/lib/bruteforce/strategies';

export function crackAesDictionary(pair: AesPBKDF2Pair, words: string[], mangle = false) {
	for (const candidate of dictIter(words, mangle)) {
		const pt = tryDecrypt(pair, candidate);
		if (pt === pair.plaintext) return { found: true as const, candidate };
	}
	return { found: false as const };
}

export function crackAesMask(pair: AesPBKDF2Pair, maskPattern: string) {
	for (const candidate of maskIter(maskPattern)) {
		const pt = tryDecrypt(pair, candidate);
		if (pt === pair.plaintext) return { found: true as const, candidate };
	}
	return { found: false as const };
}

function tryDecrypt(pair: AesPBKDF2Pair, passphrase: string): string | null {
	try {
		return decryptWithPassphrase(pair.ciphertextHex, passphrase, pair.saltHex, pair.ivHex, pair.iterations);
	} catch {
		return null;
	}
}


