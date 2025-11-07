export type CipherKind = 'caesar' | 'vigenere' | 'xor' | 'aes_pbkdf2';

export type HashKind = 'md5' | 'sha1' | 'sha256' | 'bcrypt' | 'argon2';

export type TaskKind = 'generate' | 'crack';

export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed';

export type BruteForceStrategy = 'exhaustive' | 'dictionary' | 'mask';

export interface Progress {
	startedAt?: number;
	updatedAt?: number;
	completedAt?: number;
	attempts: number;
	attemptsPerSecond?: number;
	etaSeconds?: number;
}

export interface CaesarPair {
	kind: 'caesar';
	plaintext: string;
	shift: number; // 0-25
	ciphertext: string;
}

export interface VigenerePair {
	kind: 'vigenere';
	plaintext: string;
	key: string; // A-Z, length 1-3
	ciphertext: string;
}

export interface XorPair {
	kind: 'xor';
	plaintext: string;
	key: number; // 0-255 single-byte
	ciphertextHex: string;
}

export interface AesPBKDF2Pair {
	kind: 'aes_pbkdf2';
	plaintext: string;
	passphrase: string;
	saltHex: string;
	ivHex: string;
	ciphertextHex: string;
	iterations: number;
}

export type CipherPair = CaesarPair | VigenerePair | XorPair | AesPBKDF2Pair;

export interface HashRecord {
	kind: HashKind;
	plaintext: string; // the password/plain secret used for hashing
	hash: string; // hex for md5/sha*, modular crypt format for bcrypt/argon2
}

export interface GenerateInput {
	count: number; // number of items to generate
	cipherKinds?: CipherKind[];
	hashKinds?: HashKind[];
	seed?: string;
}

export interface CrackInputBase {
	strategy: BruteForceStrategy;
}

export interface ExhaustiveParams {
	// used for toy ciphers
}

export interface DictionaryParams {
	wordlist: string[];
	mangle?: boolean;
}

export interface MaskParams {
	mask: string; // e.g., ?l?l?l?l?d?d?d?d
}

export type CrackParams = ExhaustiveParams | DictionaryParams | MaskParams;

export interface Task<TPayload = unknown, TResult = unknown> {
	id: string;
	kind: TaskKind;
	status: TaskStatus;
	payload: TPayload;
	progress: Progress;
	result?: TResult;
	error?: string;
}

export interface GenerateTaskPayload {
	input: GenerateInput;
}

export interface GenerateTaskResult {
	cipherPairs: CipherPair[];
	hashRecords: HashRecord[];
}

export interface CrackTaskPayload {
	target: 'cipher' | 'hash' | 'aes_pbkdf2';
	strategy: BruteForceStrategy;
	params: CrackParams;
	// data to crack
	cipherPair?: CipherPair;
	hashRecord?: HashRecord;
}

export interface CrackTaskResult {
	found: boolean;
	keyOrSecret?: string;
	score?: number;
}

export type TaskAny = Task<any, any>;


