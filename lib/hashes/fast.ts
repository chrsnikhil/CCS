import { createHash, timingSafeEqual } from 'crypto';

function hex(input: string, algo: string): string {
	return createHash(algo).update(input, 'utf8').digest('hex');
}

export function md5(input: string): string {
	return hex(input, 'md5');
}

export function sha1(input: string): string {
	return hex(input, 'sha1');
}

export function sha256(input: string): string {
	return hex(input, 'sha256');
}

export function verifyHex(input: string, expectedHex: string, algo: 'md5' | 'sha1' | 'sha256'): boolean {
	const h = createHash(algo).update(input, 'utf8').digest();
	const exp = Buffer.from(expectedHex, 'hex');
	if (h.length !== exp.length) return false;
	return timingSafeEqual(h, exp);
}


