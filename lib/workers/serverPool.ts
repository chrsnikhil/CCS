import { WorkerPool } from './pool';

declare global {
	// eslint-disable-next-line no-var
	var __WORKER_POOL__: WorkerPool | undefined;
}

export function getWorkerPool() {
	if (!global.__WORKER_POOL__) global.__WORKER_POOL__ = new WorkerPool();
	return global.__WORKER_POOL__;
}


