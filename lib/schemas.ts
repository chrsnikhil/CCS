import { z } from 'zod';
import type {
	BruteForceStrategy,
	CipherKind,
	HashKind,
	TaskKind,
	TaskStatus,
} from './types';

export const CipherKindSchema = z.enum(['caesar', 'vigenere', 'xor', 'aes_pbkdf2'] satisfies CipherKind[] as any);
export const HashKindSchema = z.enum(['md5', 'sha1', 'sha256', 'bcrypt', 'argon2'] satisfies HashKind[] as any);
export const TaskKindSchema = z.enum(['generate', 'crack'] satisfies TaskKind[] as any);
export const TaskStatusSchema = z.enum(['queued', 'running', 'completed', 'failed'] satisfies TaskStatus[] as any);
export const BruteForceStrategySchema = z.enum(['exhaustive', 'dictionary', 'mask'] satisfies BruteForceStrategy[] as any);

export const GenerateInputSchema = z.object({
	count: z.number().int().min(1).max(10000),
	cipherKinds: z.array(CipherKindSchema).optional(),
	hashKinds: z.array(HashKindSchema).optional(),
	seed: z.string().optional(),
});

export const DictionaryParamsSchema = z.object({
	wordlist: z.array(z.string()).min(1),
	mangle: z.boolean().optional(),
});

export const MaskParamsSchema = z.object({
	mask: z.string().min(1),
});

export const ExhaustiveParamsSchema = z.object({});

export const CrackParamsSchema = z.union([
	ExhaustiveParamsSchema,
	DictionaryParamsSchema,
	MaskParamsSchema,
]);

export const ProgressSchema = z.object({
	startedAt: z.number().optional(),
	updatedAt: z.number().optional(),
	completedAt: z.number().optional(),
	attempts: z.number().int().nonnegative(),
	attemptsPerSecond: z.number().optional(),
	etaSeconds: z.number().optional(),
});


