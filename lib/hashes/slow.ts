import bcrypt from 'bcryptjs';

export async function bcryptHash(input: string, saltRounds = 8): Promise<string> {
	return await bcrypt.hash(input, saltRounds);
}

export async function bcryptVerify(input: string, hash: string): Promise<boolean> {
	return await bcrypt.compare(input, hash);
}

// Optional argon2 support (native module). If installed, these will work; otherwise they throw.
type Argon2Module = {
	hash: (s: string) => Promise<string>;
	verify: (hash: string, plain: string) => Promise<boolean>;
};

async function loadArgon2(): Promise<Argon2Module> {
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const mod = require('argon2');
		return mod as Argon2Module;
	} catch (e) {
		throw new Error('argon2 module not installed. Install with `npm i argon2` to enable.');
	}
}

export async function argon2Hash(input: string): Promise<string> {
	const a2 = await loadArgon2();
	return await a2.hash(input);
}

export async function argon2Verify(input: string, hash: string): Promise<boolean> {
	const a2 = await loadArgon2();
	return await a2.verify(hash, input);
}


