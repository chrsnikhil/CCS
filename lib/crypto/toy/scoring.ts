// English letter frequency (A-Z) approximate percentages
const EN_FREQ = [
	8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153,
	0.772, 4.025, 2.406, 6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056,
	2.758, 0.978, 2.360, 0.150, 1.974, 0.074,
];

export function chiSquaredEnglish(text: string): number {
	const counts = new Array(26).fill(0);
	let total = 0;
	for (const ch of text.toUpperCase()) {
		const code = ch.charCodeAt(0);
		if (code >= 65 && code <= 90) {
			counts[code - 65]++;
			total++;
		}
	}
	if (total === 0) return Number.POSITIVE_INFINITY;
	let chi = 0;
	for (let i = 0; i < 26; i++) {
		const observed = counts[i];
		const expected = (EN_FREQ[i] / 100) * total;
		const diff = observed - expected;
		chi += (diff * diff) / (expected || 1);
	}
	return chi;
}

export function printableRatio(text: string): number {
	let printable = 0;
	for (const ch of text) {
		const code = ch.charCodeAt(0);
		if (code >= 32 && code <= 126) printable++;
	}
	return text.length === 0 ? 0 : printable / text.length;
}


