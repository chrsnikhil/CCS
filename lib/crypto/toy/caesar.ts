import { ALPHA_UPPER } from '../../util/strings';

function shiftChar(ch: string, shift: number): string {
	const idx = ALPHA_UPPER.indexOf(ch);
	if (idx === -1) return ch;
	const n = ALPHA_UPPER.length;
	const s = ((idx + shift) % n + n) % n;
	return ALPHA_UPPER[s];
}

export function caesarEncrypt(plaintext: string, shift: number): string {
	const up = plaintext.toUpperCase();
	let out = '';
	for (const ch of up) out += shiftChar(ch, shift);
	return out;
}

export function caesarDecrypt(ciphertext: string, shift: number): string {
	return caesarEncrypt(ciphertext, -shift);
}


