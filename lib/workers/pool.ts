import { Worker } from 'worker_threads';
import os from 'os';
import path from 'path';

type Job = {
	cmd: string;
	data: any;
	resolve: (v: any) => void;
	reject: (e: any) => void;
	onProgress?: (p: { attempts: number; attemptsPerSecond?: number; note?: string }) => void;
};

export class WorkerPool {
	private size: number;
	private workers: Worker[] = [];
	private idle: Worker[] = [];
	private queue: Job[] = [];

	constructor(size = Math.max(1, Math.min(4, (os.cpus()?.length ?? 2) - 1))) {
		this.size = size;
		for (let i = 0; i < size; i++) {
			const abs = path.join(process.cwd(), 'lib', 'workers', 'worker.js');
			const worker = new Worker(abs, { type: 'commonjs' as any });
			this.workers.push(worker);
			this.idle.push(worker);
		}
	}

	async run<T = any>(cmd: string, data: any, onProgress?: Job['onProgress']): Promise<T> {
		return new Promise((resolve, reject) => {
			this.queue.push({ cmd, data, resolve, reject, onProgress });
			this.pump();
		});
	}

	private pump() {
		while (this.idle.length && this.queue.length) {
			const worker = this.idle.pop()!;
			const job = this.queue.shift()!;
			const onMessage = (m: any) => {
				if (m?.type === 'progress') job.onProgress?.(m);
				else if (m?.type === 'result') {
					cleanup();
					this.idle.push(worker);
					if (m.ok) job.resolve(m.result);
					else job.reject(new Error(m.error));
					this.pump();
				}
			};
			const onError = (e: any) => {
				cleanup();
				this.idle.push(worker);
				job.reject(e);
				this.pump();
			};
			const onExit = (code: number) => {
				cleanup();
				this.idle.push(worker);
				if (code !== 0) job.reject(new Error(`Worker exited with code ${code}`));
				else job.reject(new Error('Worker exited unexpectedly'));
				this.pump();
			};
			const cleanup = () => {
				worker.off('message', onMessage);
				worker.off('error', onError);
				worker.off('exit', onExit);
			};
			worker.on('message', onMessage);
			worker.on('error', onError);
			worker.on('exit', onExit);
			worker.postMessage({ cmd: job.cmd, data: job.data });
		}
	}
}


