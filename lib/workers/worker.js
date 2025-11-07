const { parentPort } = require('worker_threads');
const crypto = require('crypto');
let bcrypt;
try { bcrypt = require('bcryptjs'); } catch {}

if (!parentPort) throw new Error('worker must be run as a worker thread');

// Utilities
const ALPHA_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHA_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';

function chiSquaredEnglish(text) {
	const EN_FREQ = [8.167,1.492,2.782,4.253,12.702,2.228,2.015,6.094,6.966,0.153,0.772,4.025,2.406,6.749,7.507,1.929,0.095,5.987,6.327,9.056,2.758,0.978,2.360,0.150,1.974,0.074];
	const counts = new Array(26).fill(0);
	let total = 0;
	for (const ch of text.toUpperCase()) {
		const code = ch.charCodeAt(0);
		if (code >= 65 && code <= 90) { counts[code - 65]++; total++; }
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

function printableRatio(text) {
	let printable = 0;
	for (const ch of text) {
		const code = ch.charCodeAt(0);
		if (code >= 32 && code <= 126) printable++;
	}
	return text.length === 0 ? 0 : printable / text.length;
}

function expandMask(mask) {
	const sets = [];
	for (let i = 0; i < mask.length; ) {
		if (mask[i] === '?' && i + 1 < mask.length) {
			const t = mask.slice(i, i + 2);
			if (t === '?l') sets.push(ALPHA_LOWER);
			else if (t === '?u') sets.push(ALPHA_UPPER);
			else if (t === '?d') sets.push(DIGITS);
			else if (t === '?a') sets.push(ALPHA_LOWER + ALPHA_UPPER + DIGITS);
			else throw new Error(`Unknown mask token: ${t}`);
			i += 2;
		} else {
			sets.push(mask[i]);
			i += 1;
		}
	}
	return sets;
}

function* productIter(sets) {
	const lengths = sets.map((s) => s.length);
	if (lengths.some((l) => l === 0)) return;
	const idx = new Array(sets.length).fill(0);
	let done = false;
	while (!done) {
		yield idx.map((i, pos) => sets[pos][i]).join('');
		for (let pos = sets.length - 1; pos >= 0; pos--) {
			idx[pos]++;
			if (idx[pos] < lengths[pos]) break;
			idx[pos] = 0;
			if (pos === 0) done = true;
		}
	}
}

// Caesar
function caesarDecrypt(ciphertext, shift) {
	const up = ciphertext.toUpperCase();
	let out = '';
	for (const ch of up) {
		const idx = ALPHA_UPPER.indexOf(ch);
		if (idx === -1) { out += ch; continue; }
		const n = 26;
		const s = ((idx - shift) % n + n) % n;
		out += ALPHA_UPPER[s];
	}
	return out;
}

// Vigenère
function vigenereDecrypt(ciphertext, key) {
	const ks = key.toUpperCase().split('').map((ch) => {
		const idx = ALPHA_UPPER.indexOf(ch);
		if (idx === -1) throw new Error('Key must be A-Z only');
		return idx;
	});
	let out = '';
	let i = 0;
	for (const ch of ciphertext.toUpperCase()) {
		const idx = ALPHA_UPPER.indexOf(ch);
		if (idx === -1) { out += ch; continue; }
		const n = 26;
		const s = ((idx - ks[i % ks.length]) % n + n) % n;
		out += ALPHA_UPPER[s];
		i++;
	}
	return out;
}

// XOR single-byte
function xorDecryptHexToUtf8(ciphertextHex, keyByte) {
	const input = Buffer.from(ciphertextHex, 'hex');
	const out = Buffer.allocUnsafe(input.length);
	for (let i = 0; i < input.length; i++) out[i] = input[i] ^ (keyByte & 0xff);
	return out.toString('utf8');
}

// Hash helpers
function verifyHex(input, expectedHex, algo) {
	const h = crypto.createHash(algo).update(input, 'utf8').digest();
	const exp = Buffer.from(expectedHex, 'hex');
	if (h.length !== exp.length) return false;
	return crypto.timingSafeEqual(h, exp);
}

// AES PBKDF2 + CTR
function decryptWithPassphrase(ciphertextHex, passphrase, saltHex, ivHex, iterations) {
	const salt = Buffer.from(saltHex, 'hex');
	const iv = Buffer.from(ivHex, 'hex');
	const key = crypto.pbkdf2Sync(Buffer.from(passphrase, 'utf8'), salt, iterations, 32, 'sha256');
	const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
	const out = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]);
	return out.toString('utf8');
}

function progressEmitter(total) {
	const started = Date.now();
	return (attempts) => {
		const dt = (Date.now() - started) / 1000;
		const aps = Math.floor(attempts / Math.max(dt, 1e-3));
		const eta = total ? Math.max(0, Math.floor((total - attempts) / Math.max(aps, 1))) : undefined;
		parentPort.postMessage({ type: 'progress', attempts, attemptsPerSecond: aps, etaSeconds: eta });
	};
}

parentPort.on('message', async (msg) => {
	try {
		switch (msg.cmd) {
			case 'noop': {
				const total = msg.data?.total ?? 100000;
				let attempts = 0;
				const emit = progressEmitter(total);
				while (attempts < total) {
					attempts += 1000;
					if (attempts % 10000 === 0) emit(attempts);
				}
				parentPort.postMessage({ type: 'result', ok: true, result: { attempts } });
				break;
			}
			case 'caesar_exhaustive': {
				const { ciphertext } = msg.data;
				let best = { shift: 0, plaintext: ciphertext, score: Number.POSITIVE_INFINITY };
				const emit = progressEmitter(26);
				for (let s = 0; s < 26; s++) {
					const pt = caesarDecrypt(ciphertext, s);
					const score = chiSquaredEnglish(pt);
					if (score < best.score) best = { shift: s, plaintext: pt, score };
					emit(s + 1);
				}
                emit(256);
                parentPort.postMessage({ type: 'result', ok: true, result: best });
				break;
			}
            case 'vigenere_exhaustive': {
				const { ciphertext, minLen = 1, maxLen = 3 } = msg.data;
				const alphabet = ALPHA_UPPER;
				const total = 26 + 26 * 26 + 26 * 26 * 26; // quick estimate for 1..3
                let attempts = 0;
                let lastEmit = Date.now();
				let best = { key: 'A', plaintext: ciphertext, score: Number.POSITIVE_INFINITY };
                const emit = progressEmitter(total);
				function* ks(min, max) {
					for (let len = min; len <= max; len++) {
						const sets = Array.from({ length: len }, () => alphabet);
						yield* productIter(sets);
					}
				}
				for (const key of ks(minLen, maxLen)) {
					const pt = vigenereDecrypt(ciphertext, key);
					const score = chiSquaredEnglish(pt);
					if (score < best.score) best = { key, plaintext: pt, score };
                    attempts++;
                    const now = Date.now();
                    if (attempts % 100 === 0 || now - lastEmit > 250) { emit(attempts); lastEmit = now; }
				}
				emit(attempts);
				parentPort.postMessage({ type: 'result', ok: true, result: best });
				break;
			}
			case 'xor_exhaustive': {
				const { ciphertextHex } = msg.data;
				let best = { key: 0, plaintext: '', score: -1 };
                const emit = progressEmitter(256);
                let lastEmit = Date.now();
                for (let k = 0; k < 256; k++) {
					const pt = xorDecryptHexToUtf8(ciphertextHex, k);
					const score = printableRatio(pt);
					if (score > best.score) best = { key: k, plaintext: pt, score };
                    const now = Date.now();
                    if ((k + 1) % 8 === 0 || now - lastEmit > 200) { emit(k + 1); lastEmit = now; }
				}
				parentPort.postMessage({ type: 'result', ok: true, result: best });
				break;
			}
			case 'hash_dictionary': {
				const { kind, hash, words = [], mangle = false } = msg.data;
                let attempts = 0;
                const emit = progressEmitter();
                let lastEmit = Date.now();
				function* simpleMangles(word) {
					const set = new Set();
					set.add(word);
					set.add(word.toUpperCase());
					set.add(word.toLowerCase());
					set.add((word[0] || '').toUpperCase() + word.slice(1).toLowerCase());
					for (const d of DIGITS) set.add(word + d);
					for (const d1 of DIGITS) for (const d2 of DIGITS) set.add(word + d1 + d2);
					return set.values();
				}
                for (const w of words) {
                    const iter = mangle ? simpleMangles(w) : [w][Symbol.iterator]();
                    for (const candidate of iter) {
                        attempts++;
                        let ok = false;
                        if (kind === 'md5' || kind === 'sha1' || kind === 'sha256') ok = verifyHex(candidate, hash, kind);
                        else if (kind === 'bcrypt' && bcrypt) ok = await bcrypt.compare(candidate, hash);
                        if (ok) {
                            emit(attempts);
                            parentPort.postMessage({ type: 'result', ok: true, result: { candidate } });
                            return;
                        }
                        const now = Date.now();
                        if (attempts % 100 === 0 || now - lastEmit > 200) { emit(attempts); lastEmit = now; }
                    }
                }
                emit(attempts);
                parentPort.postMessage({ type: 'result', ok: true, result: { found: false } });
				break;
			}
			case 'hash_mask': {
				const { kind, hash, mask } = msg.data;
				const sets = expandMask(mask);
                let attempts = 0;
                const emit = progressEmitter();
                let lastEmit = Date.now();
                for (const candidate of productIter(sets)) {
                    attempts++;
                    let ok = false;
                    if (kind === 'md5' || kind === 'sha1' || kind === 'sha256') ok = verifyHex(candidate, hash, kind);
                    if (ok) {
                        emit(attempts);
                        parentPort.postMessage({ type: 'result', ok: true, result: { candidate } });
                        return;
                    }
                    const now = Date.now();
                    if (attempts % 200 === 0 || now - lastEmit > 200) { emit(attempts); lastEmit = now; }
                }
                emit(attempts);
                parentPort.postMessage({ type: 'result', ok: true, result: { found: false } });
				break;
			}
            case 'aes_dictionary': {
                let { ciphertextHex, saltHex, ivHex, iterations, words = [], mangle = false, expectedPlaintext } = msg.data;
                if (!Array.isArray(words) || words.length === 0) {
                    words = ['summer', 'password', 'admin'];
                }
                let attempts = 0;
                const emit = progressEmitter();
                let lastEmit = Date.now();
				function* simpleMangles(word) {
					const set = new Set();
					set.add(word);
					set.add(word.toUpperCase());
					set.add(word.toLowerCase());
					set.add((word[0] || '').toUpperCase() + word.slice(1).toLowerCase());
					for (const d of DIGITS) set.add(word + d);
					for (const d1 of DIGITS) for (const d2 of DIGITS) set.add(word + d1 + d2);
					return set.values();
				}
                for (const w of words) {
                    const iter = mangle ? simpleMangles(w) : [w][Symbol.iterator]();
                    for (const candidate of iter) {
                        attempts++;
                        try {
                            const pt = decryptWithPassphrase(ciphertextHex, candidate, saltHex, ivHex, iterations);
                            if (!expectedPlaintext || pt === expectedPlaintext) {
                                emit(attempts);
                                parentPort.postMessage({ type: 'result', ok: true, result: { candidate } });
                                return;
                            }
                        } catch {}
                        const now = Date.now();
                        if (attempts % 50 === 0 || now - lastEmit > 200) { emit(attempts); lastEmit = now; }
                    }
                }
                emit(attempts);
                parentPort.postMessage({ type: 'result', ok: true, result: { found: false } });
				break;
			}
			default:
				throw new Error(`Unknown cmd: ${msg.cmd}`);
		}
	} catch (e) {
		parentPort.postMessage({ type: 'result', ok: false, error: String(e && e.message || e) });
	}
});


