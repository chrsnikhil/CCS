import { md5, sha1, sha256, verifyHex } from '@/lib/hashes/fast';
import { bcryptVerify } from '@/lib/hashes/slow';
import type { HashRecord } from '@/lib/types';
import { dictionary as dictIter, mask as maskIter } from '@/lib/bruteforce/strategies';

export async function crackHashDictionary(target: HashRecord, words: string[], mangle = false) {
	for (const candidate of dictIter(words, mangle)) {
		if (await matches(target, candidate)) return { found: true, candidate };
	}
	return { found: false } as const;
}

export async function crackHashMask(target: HashRecord, maskPattern: string) {
	for (const candidate of maskIter(maskPattern)) {
		if (await matches(target, candidate)) return { found: true, candidate };
	}
	return { found: false } as const;
}

async function matches(target: HashRecord, candidate: string): Promise<boolean> {
	if (target.kind === 'md5') return verifyHex(candidate, target.hash, 'md5');
	if (target.kind === 'sha1') return verifyHex(candidate, target.hash, 'sha1');
	if (target.kind === 'sha256') return verifyHex(candidate, target.hash, 'sha256');
	if (target.kind === 'bcrypt') return await bcryptVerify(candidate, target.hash);
	throw new Error(`Unsupported hash kind: ${target.kind}`);
}


