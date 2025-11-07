import { TaskRegistry } from '@/lib/tasks/registry';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { id: string } }) {
	const task = TaskRegistry.get(params.id);
	if (!task) return new Response('Not found', { status: 404 });

	let closed = false;
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const encoder = new TextEncoder();
			const safeEnqueue = (chunk: string) => {
				if (closed) return;
				try {
					controller.enqueue(encoder.encode(chunk));
				} catch {
					closed = true;
				}
			};
			const send = (data: any) => safeEnqueue(`data: ${JSON.stringify(data)}\n\n`);
			send({ type: 'status', status: task.status });
			// Send latest snapshot so client sees context immediately
			if ((task as any).lastInfo) send({ type: 'info', info: (task as any).lastInfo });
			if (task.progress) send({ type: 'progress', attempts: task.progress.attempts, attemptsPerSecond: task.progress.attemptsPerSecond, etaSeconds: task.progress.etaSeconds });
			if (task.result) send({ type: 'result', result: task.result });
			const unsub = TaskRegistry.subscribe(params.id, (ev) => {
				if (!closed) send(ev);
			});
			safeEnqueue(': connected\n\n');
			safeEnqueue(`retry: 2000\n\n`);
			// Cleanup on cancel
			(controller as any).onCancel = () => {
				closed = true;
				unsub();
			};
		},
		cancel() {
			closed = true;
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
		},
	});
}


