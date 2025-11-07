import { caesarEncrypt } from '@/lib/crypto/toy/caesar';
import { vigenereEncrypt } from '@/lib/crypto/toy/vigenere';
import { xorEncryptToHex } from '@/lib/crypto/toy/xor';
import { encryptWithPassphrase } from '@/lib/crypto/aes_pbkdf2';
import { md5, sha1, sha256 } from '@/lib/hashes/fast';
import { bcryptHash } from '@/lib/hashes/slow';
import type { AesPBKDF2Pair, CaesarPair, CipherPair, HashRecord, VigenerePair, XorPair } from '@/lib/types';
import { COMMON_PASSWORDS } from '@/lib/util/wordlist';

const PLAINTEXTS: string[] = [
	'The quick brown fox jumps over the lazy dog',
	'Pack my box with five dozen liquor jugs',
	'Sphinx of black quartz, judge my vow',
	'How vexingly quick daft zebras jump',
	'The five boxing wizards jump quickly',
	'Crazy Fredrick bought many very exquisite opal jewels',
	'We promptly judged antique ivory buckles for the next prize',
	'Two driven jocks help fax my big quiz',
	'Jackdaws love my big sphinx of quartz',
	'Grumpy wizards make toxic brew for the evil queen and jack',
];

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]; }

export async function generateCipherPairs(count = 100): Promise<CipherPair[]> {
	const out: CipherPair[] = [];
	for (let i = 0; i < count; i++) {
		const p = pick(PLAINTEXTS, i) + ` #${i}`;
		// Caesar
		const shift = i % 26;
		const c1: CaesarPair = { kind: 'caesar', plaintext: p, shift, ciphertext: caesarEncrypt(p, shift) };
		out.push(c1);
		// Vigenere
		const key = ['A', 'B', 'CAT', 'DOG', 'KEY'][i % 5];
		const c2: VigenerePair = { kind: 'vigenere', plaintext: p, key, ciphertext: vigenereEncrypt(p, key) };
		out.push(c2);
		// XOR
		const kb = (i * 13) % 256;
		const c3: XorPair = { kind: 'xor', plaintext: p, key: kb, ciphertextHex: xorEncryptToHex(p, kb) };
		out.push(c3);
		// AES-PBKDF2 (weak passphrases)
		const pass = pick(COMMON_PASSWORDS, i) + String(i % 100).padStart(2, '0');
		const enc = encryptWithPassphrase(p, pass, 20000);
		const c4: AesPBKDF2Pair = { kind: 'aes_pbkdf2', plaintext: p, passphrase: pass, ...enc };
		out.push(c4);
	}
	return out.slice(0, count);
}

export async function generateHashRecords(count = 100): Promise<HashRecord[]> {
	const out: HashRecord[] = [];
	for (let i = 0; i < count; i++) {
		const secret = pick(COMMON_PASSWORDS, i) + (i % 10);
		out.push({ kind: 'md5', plaintext: secret, hash: md5(secret) });
		out.push({ kind: 'sha1', plaintext: secret, hash: sha1(secret) });
		out.push({ kind: 'sha256', plaintext: secret, hash: sha256(secret) });
		out.push({ kind: 'bcrypt', plaintext: secret, hash: await bcryptHash(secret, 6) });
	}
	return out.slice(0, count);
}


