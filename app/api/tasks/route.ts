import { NextRequest } from 'next/server';
import { TaskRegistry } from '@/lib/tasks/registry';
import { getWorkerPool } from '@/lib/workers/serverPool';
import { caesarEncrypt } from '@/lib/crypto/toy/caesar';
import { xorEncryptToHex } from '@/lib/crypto/toy/xor';
import { vigenereEncrypt } from '@/lib/crypto/toy/vigenere';
import { encryptWithPassphrase } from '@/lib/crypto/aes_pbkdf2';
import { COMMON_PASSWORDS } from '@/lib/util/wordlist';

import { z } from 'zod';

export const runtime = 'nodejs';

const CreateSchema = z.object({
	kind: z.enum(['generate', 'crack']),
	payload: z.any(),
});

export async function GET() {
	const list = Array.from((TaskRegistry as any).tasks?.entries?.() ?? []).map(([, t]: any) => t);
	return Response.json({ tasks: list });
}

export async function POST(req: NextRequest) {
    // Robustly parse JSON body; default to empty object when missing
    let json: any = {};
    try {
        json = await req.json();
    } catch {}
	const parsed = CreateSchema.safeParse(json);
	if (!parsed.success) return new Response('Bad request', { status: 400 });
	const { kind, payload } = parsed.data;
	const task = TaskRegistry.create(kind, payload);

	if (kind === 'generate') {
    TaskRegistry.setStatus(task.id, 'running');
    TaskRegistry.progress(task.id, 0, 0);
		getWorkerPool()
			.run('noop', { total: 100000 }, (p) => TaskRegistry.progress(task.id, p.attempts, p.attemptsPerSecond))
			.then((result) => {
				TaskRegistry.result(task.id, result);
				TaskRegistry.setStatus(task.id, 'completed');
			})
			.catch((e) => {
				TaskRegistry.error(task.id, String(e?.message ?? e));
				TaskRegistry.setStatus(task.id, 'failed');
			});
		return Response.json({ task });
	}

	// crack scenarios
	const scenario = payload?.scenario ?? 'caesar';
    TaskRegistry.setStatus(task.id, 'running');
    TaskRegistry.progress(task.id, 0, 0);
	const pool = getWorkerPool();

	try {
		switch (scenario) {
			case 'caesar': {
				const plaintext = 'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG';
				const shift = 13;
				const ciphertext = caesarEncrypt(plaintext, shift);
				TaskRegistry.info(task.id, { scenario, target: { kind: 'caesar', plaintext, ciphertext, note: 'Find shift (0-25)' } });
                pool
                    .run('caesar_exhaustive', { ciphertext }, (p) => { TaskRegistry.progress(task.id, p.attempts, p.attemptsPerSecond); TaskRegistry.info(task.id, { probe: 'progress', attempts: p.attempts }); })
					.then((result) => {
						TaskRegistry.result(task.id, { ...result, expectedShift: shift, expectedPlaintext: plaintext });
						TaskRegistry.setStatus(task.id, 'completed');
					})
					.catch((e) => {
						TaskRegistry.error(task.id, String(e?.message ?? e));
						TaskRegistry.setStatus(task.id, 'failed');
					});
				break;
			}
			case 'vigenere': {
				const plaintext = 'ATTACK AT DAWN';
				const key = 'CAT';
				const ciphertext = vigenereEncrypt(plaintext, key);
				TaskRegistry.info(task.id, { scenario, target: { kind: 'vigenere', plaintext, ciphertext, note: 'Find key A–Z length 1–3' } });
                pool
                    .run('vigenere_exhaustive', { ciphertext, minLen: 1, maxLen: 3 }, (p) => { TaskRegistry.progress(task.id, p.attempts, p.attemptsPerSecond); TaskRegistry.info(task.id, { probe: 'progress', attempts: p.attempts }); })
					.then((result) => {
						TaskRegistry.result(task.id, { ...result, expectedKey: key, expectedPlaintext: plaintext });
						TaskRegistry.setStatus(task.id, 'completed');
					})
					.catch((e) => {
						TaskRegistry.error(task.id, String(e?.message ?? e));
						TaskRegistry.setStatus(task.id, 'failed');
					});
				break;
			}
			case 'xor': {
				const plaintext = 'Secret XOR message';
				const keyByte = 77;
				const ciphertextHex = xorEncryptToHex(plaintext, keyByte);
				TaskRegistry.info(task.id, { scenario, target: { kind: 'xor', plaintext, ciphertextHex, note: 'Find single-byte key 0–255' } });
                pool
                    .run('xor_exhaustive', { ciphertextHex }, (p) => { TaskRegistry.progress(task.id, p.attempts, p.attemptsPerSecond); TaskRegistry.info(task.id, { probe: 'progress', attempts: p.attempts }); })
					.then((result) => {
						TaskRegistry.result(task.id, { ...result, expectedKey: keyByte, expectedPlaintext: plaintext });
						TaskRegistry.setStatus(task.id, 'completed');
					})
					.catch((e) => {
						TaskRegistry.error(task.id, String(e?.message ?? e));
						TaskRegistry.setStatus(task.id, 'failed');
					});
				break;
			}
			case 'md5_dict': {
				const secret = 'summer42';
				const hash = cryptoHashHex(secret, 'md5');
				const words = COMMON_PASSWORDS.slice(0, 50);
				TaskRegistry.info(task.id, { scenario, target: { kind: 'md5', hash, note: 'Dictionary + simple mangles' } });
                pool
                    .run('hash_dictionary', { kind: 'md5', hash, words, mangle: true }, (p) => { TaskRegistry.progress(task.id, p.attempts, p.attemptsPerSecond); TaskRegistry.info(task.id, { probe: 'progress', attempts: p.attempts }); })
					.then((result) => {
						TaskRegistry.result(task.id, { ...result, expected: secret });
						TaskRegistry.setStatus(task.id, 'completed');
					})
					.catch((e) => {
						TaskRegistry.error(task.id, String(e?.message ?? e));
						TaskRegistry.setStatus(task.id, 'failed');
					});
				break;
			}
            case 'sha1_mask': {
                const secret = 'pa12';
                const hash = cryptoHashHex(secret, 'sha1');
                const mask = '?l?l?d?d';
				TaskRegistry.info(task.id, { scenario, target: { kind: 'sha1', hash, mask, note: 'Mask brute-force' } });
                pool
                    .run('hash_mask', { kind: 'sha1', hash, mask }, (p) => { TaskRegistry.progress(task.id, p.attempts, p.attemptsPerSecond); TaskRegistry.info(task.id, { probe: 'progress', attempts: p.attempts }); })
					.then((result) => {
						TaskRegistry.result(task.id, { ...result, expected: secret });
						TaskRegistry.setStatus(task.id, 'completed');
					})
					.catch((e) => {
						TaskRegistry.error(task.id, String(e?.message ?? e));
						TaskRegistry.setStatus(task.id, 'failed');
					});
				break;
			}
            case 'aes_dict': {
				const plaintext = 'Attack at dawn';
				const passphrase = 'summer77';
                const enc = encryptWithPassphrase(plaintext, passphrase, 2000);
                const words = COMMON_PASSWORDS.slice(0, 50);
                TaskRegistry.info(task.id, { scenario, target: { kind: 'aes_pbkdf2', plaintext, ...enc, note: 'Dictionary + simple mangles', wordCount: words.length } });
                pool
                    .run('aes_dictionary', { ...enc, words, mangle: true, expectedPlaintext: plaintext }, (p) => { TaskRegistry.progress(task.id, p.attempts, p.attemptsPerSecond); TaskRegistry.info(task.id, { probe: 'progress', attempts: p.attempts }); })
					.then((result) => {
						TaskRegistry.result(task.id, { ...result, expected: passphrase });
						TaskRegistry.setStatus(task.id, 'completed');
					})
					.catch((e) => {
						TaskRegistry.error(task.id, String(e?.message ?? e));
						TaskRegistry.setStatus(task.id, 'failed');
					});
				break;
			}
			default: {
				TaskRegistry.error(task.id, `Unknown scenario: ${scenario}`);
				TaskRegistry.setStatus(task.id, 'failed');
			}
		}
	} catch (e) {
		TaskRegistry.error(task.id, String(e?.message ?? e));
		TaskRegistry.setStatus(task.id, 'failed');
	}

	return Response.json({ task });
}

function cryptoHashHex(input, algo) {
	return require('crypto').createHash(algo).update(input, 'utf8').digest('hex');
}


