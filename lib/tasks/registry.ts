import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import type { TaskAny, TaskKind, TaskStatus } from '../types';

type TaskEvent =
    | { type: 'status'; status: TaskStatus }
    | { type: 'progress'; attempts: number; attemptsPerSecond?: number; etaSeconds?: number }
    | { type: 'info'; info: any }
    | { type: 'result'; result: any }
    | { type: 'error'; error: string };

class TaskRegistryImpl {
	private tasks = new Map<string, TaskAny>();
	private events = new Map<string, EventEmitter>();

	create<TPayload>(kind: TaskKind, payload: TPayload): TaskAny {
		const id = nanoid();
		const task: TaskAny = {
			id,
			kind,
			status: 'queued',
			payload,
			progress: { attempts: 0 },
		};
		this.tasks.set(id, task);
		this.events.set(id, new EventEmitter());
		return task;
	}

	get(id: string): TaskAny | undefined {
		return this.tasks.get(id);
	}

	setStatus(id: string, status: TaskStatus) {
		const t = this.tasks.get(id);
		if (!t) return;
		t.status = status;
		if (status === 'running') t.progress.startedAt = Date.now();
		if (status === 'completed' || status === 'failed') t.progress.completedAt = Date.now();
		this.events.get(id)?.emit('event', { type: 'status', status } satisfies TaskEvent);
	}

	progress(id: string, attempts: number, attemptsPerSecond?: number, etaSeconds?: number) {
		const t = this.tasks.get(id);
		if (!t) return;
		t.progress.attempts = attempts;
		t.progress.updatedAt = Date.now();
		t.progress.attemptsPerSecond = attemptsPerSecond;
		t.progress.etaSeconds = etaSeconds;
		this.events.get(id)?.emit('event', { type: 'progress', attempts, attemptsPerSecond, etaSeconds } satisfies TaskEvent);
	}

	result(id: string, result: any) {
		const t = this.tasks.get(id);
		if (!t) return;
		t.result = result;
		this.events.get(id)?.emit('event', { type: 'result', result } satisfies TaskEvent);
	}

    info(id: string, info: any) {
        const t = this.tasks.get(id);
        if (!t) return;
        (t as any).lastInfo = info;
        this.events.get(id)?.emit('event', { type: 'info', info } satisfies TaskEvent);
    }

	error(id: string, error: string) {
		const t = this.tasks.get(id);
		if (!t) return;
		t.error = error;
		this.events.get(id)?.emit('event', { type: 'error', error } satisfies TaskEvent);
	}

	subscribe(id: string, onEvent: (ev: TaskEvent) => void): () => void {
		const em = this.events.get(id);
		if (!em) throw new Error('Task not found');
		const handler = (ev: TaskEvent) => onEvent(ev);
		em.on('event', handler);
		return () => em.off('event', handler);
	}
}

declare global {
    // eslint-disable-next-line no-var
    var __TASK_REGISTRY__: TaskRegistryImpl | undefined;
}

export const TaskRegistry: TaskRegistryImpl = (global as any).__TASK_REGISTRY__ || new TaskRegistryImpl();
(global as any).__TASK_REGISTRY__ = TaskRegistry;


