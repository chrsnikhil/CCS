import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto';

export function deriveKeyPBKDF2(
	passphrase: string,
	salt: Buffer,
	iterations = 100_000,
	keyLen = 32,
): Buffer {
	return pbkdf2Sync(Buffer.from(passphrase, 'utf8'), salt, iterations, keyLen, 'sha256');
}

export function encryptAesCtr(plaintext: string, key: Buffer, iv: Buffer): Buffer {
	const cipher = createCipheriv('aes-256-ctr', key, iv);
	return Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
}

export function decryptAesCtr(ciphertext: Buffer, key: Buffer, iv: Buffer): string {
	const decipher = createDecipheriv('aes-256-ctr', key, iv);
	const out = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
	return out.toString('utf8');
}

export function encryptWithPassphrase(
	plaintext: string,
	passphrase: string,
	iterations = 100_000,
): { saltHex: string; ivHex: string; ciphertextHex: string; iterations: number } {
	const salt = randomBytes(16);
	const iv = randomBytes(16);
	const key = deriveKeyPBKDF2(passphrase, salt, iterations, 32);
	const ct = encryptAesCtr(plaintext, key, iv);
	return {
		saltHex: salt.toString('hex'),
		ivHex: iv.toString('hex'),
		ciphertextHex: ct.toString('hex'),
		iterations,
	};
}

export function decryptWithPassphrase(
	ciphertextHex: string,
	passphrase: string,
	saltHex: string,
	ivHex: string,
	iterations: number,
): string {
	const salt = Buffer.from(saltHex, 'hex');
	const iv = Buffer.from(ivHex, 'hex');
	const key = deriveKeyPBKDF2(passphrase, salt, iterations, 32);
	const pt = decryptAesCtr(Buffer.from(ciphertextHex, 'hex'), key, iv);
	return pt;
}


