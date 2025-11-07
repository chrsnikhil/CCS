function toHex(buf: Uint8Array): string {
	return Buffer.from(buf).toString('hex');
}

function fromHex(hex: string): Uint8Array {
	return new Uint8Array(Buffer.from(hex, 'hex'));
}

export function xorEncryptToHex(plaintext: string, keyByte: number): string {
	const input = Buffer.from(plaintext, 'utf8');
	const out = Buffer.allocUnsafe(input.length);
	for (let i = 0; i < input.length; i++) out[i] = input[i] ^ (keyByte & 0xff);
	return toHex(out);
}

export function xorDecryptHexToUtf8(ciphertextHex: string, keyByte: number): string {
	const input = fromHex(ciphertextHex);
	const out = Buffer.allocUnsafe(input.length);
	for (let i = 0; i < input.length; i++) out[i] = input[i] ^ (keyByte & 0xff);
	return out.toString('utf8');
}


