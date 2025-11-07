import { NextRequest } from 'next/server';
import { generateCipherPairs, generateHashRecords } from '@/lib/demo/datasets';

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const count = Number(body?.count ?? 100);
	const cipherPairs = await generateCipherPairs(count);
	const hashRecords = await generateHashRecords(count);
	const blob = JSON.stringify({ cipherPairs, hashRecords }, null, 2);
	return new Response(blob, {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': 'attachment; filename="datasets.json"',
		},
	});
}


