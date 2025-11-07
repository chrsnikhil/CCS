import { parentPort } from 'worker_threads';

type WorkerMessage = {
	cmd: string;
	data: any;
};

type ProgressMsg = { type: 'progress'; attempts: number; attemptsPerSecond?: number; note?: string };
type ResultMsg = { type: 'result'; ok: boolean; result?: any; error?: string };

if (!parentPort) throw new Error('worker must be run as a worker thread');

parentPort.on('message', async (msg: WorkerMessage) => {
	try {
		switch (msg.cmd) {
			case 'noop': {
				// demo workload
				const total = msg.data?.total ?? 100000;
				let attempts = 0;
				const started = Date.now();
				while (attempts < total) {
					attempts += 1000;
					if (attempts % 10000 === 0) {
						const dt = (Date.now() - started) / 1000;
						const aps = Math.floor(attempts / Math.max(dt, 1e-3));
						parentPort!.postMessage({ type: 'progress', attempts, attemptsPerSecond: aps } as ProgressMsg);
					}
				}
				parentPort!.postMessage({ type: 'result', ok: true, result: { attempts } } as ResultMsg);
				break;
			}
			default:
				throw new Error(`Unknown cmd: ${msg.cmd}`);
		}
	} catch (e: any) {
		parentPort!.postMessage({ type: 'result', ok: false, error: String(e?.message ?? e) } as ResultMsg);
	}
});


