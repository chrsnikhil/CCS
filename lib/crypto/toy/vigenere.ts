import { ALPHA_UPPER } from '../../util/strings';

function keyStream(key: string): number[] {
	const k = key.toUpperCase();
	const shifts: number[] = [];
	for (const ch of k) {
		const idx = ALPHA_UPPER.indexOf(ch);
		if (idx === -1) throw new Error('Key must be A-Z only');
		shifts.push(idx);
	}
	return shifts;
}

export function vigenereEncrypt(plaintext: string, key: string): string {
	const ks = keyStream(key);
	if (ks.length === 0) throw new Error('Key must be non-empty');
	let out = '';
	let i = 0;
	for (const chRaw of plaintext) {
		const ch = chRaw.toUpperCase();
		const idx = ALPHA_UPPER.indexOf(ch);
		if (idx === -1) {
			out += chRaw.toUpperCase();
			continue;
		}
		const shift = ks[i % ks.length];
		const n = ALPHA_UPPER.length;
		const s = (idx + shift) % n;
		out += ALPHA_UPPER[s];
		i++;
	}
	return out;
}

export function vigenereDecrypt(ciphertext: string, key: string): string {
	const ks = keyStream(key);
	let out = '';
	let i = 0;
	for (const ch of ciphertext.toUpperCase()) {
		const idx = ALPHA_UPPER.indexOf(ch);
		if (idx === -1) {
			out += ch;
			continue;
		}
		const shift = ks[i % ks.length];
		const n = ALPHA_UPPER.length;
		const s = ((idx - shift) % n + n) % n;
		out += ALPHA_UPPER[s];
		i++;
	}
	return out;
}


